const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { runFlowAutomation, runFlowVideoAutomation, markProfileCooldownAndSwitch, FLOW_PROFILES_COUNT } = require('./flowAutomation');

const PROMPTS_DIR = path.join(__dirname, 'prompts', 'pass2');
// Fallback file lookup nếu DB task có prompt rỗng (tránh chạy với prompt trống).
const FALLBACK_PROMPT_FILE = {
  angle_high_oblique: '01_goc_chup_high_oblique.txt',
  angle_side: '02_goc_chup_side_angled.txt',
  angle_top_down: '03_goc_chup_top_down.txt',
  plant_map: '04_ban_do_cay.txt',
  floor_plan: '05_mat_bang.txt',
  video_static: '06_video_giu_canh.txt',
  video_day_night: '07_video_ngay_sang_dem.txt'
};

function applyReplacements(text, replacements = {}) {
  for (const [key, value] of Object.entries(replacements)) {
    text = text.split(`{${key}}`).join(String(value));
  }
  return text;
}

async function getActiveTasks(branch) {
  const Pass2Task = mongoose.model('Pass2Task');
  const filter = { hidden: { $ne: true } };
  if (branch) filter.branch = branch;
  return await Pass2Task.find(filter).sort({ order: 1 }).lean();
}

async function getTaskById(id, branch) {
  const Pass2Task = mongoose.model('Pass2Task');
  const filter = { id };
  if (branch) filter.branch = branch;
  return await Pass2Task.findOne(filter).lean();
}

function deriveType(task) {
  return task?.flowConfig?.mode === 'video' ? 'video' : 'image';
}

async function resolveTaskPrompt(task, replacements) {
  let text = task?.prompt;
  if (!text || !text.trim()) {
    const file = FALLBACK_PROMPT_FILE[task?.id];
    if (file) {
      try { text = await fs.readFile(path.join(PROMPTS_DIR, file), 'utf-8'); }
      catch (_) { text = ''; }
    }
  }
  return applyReplacements(text || '', replacements);
}

async function initPass2State(referenceImageUrl, dimensions, branch) {
  const tasks = await getActiveTasks(branch);
  return {
    referenceImageUrl,
    dimensions: {
      width: dimensions?.width || 4,
      length: dimensions?.length || 4
    },
    status: 'running',
    startedAt: new Date(),
    completedAt: null,
    tasks: tasks.map(t => ({
      taskId: t.id,
      type: deriveType(t),
      label: t.label,
      status: 'pending',
      url: null,
      chatUrl: null,
      error: null
    }))
  };
}

async function _runAttempt(task, prompt, referenceImageUrl, onImageReady, onVideoReady) {
  const refAsset = { url: referenceImageUrl, label: 'pass2_reference' };
  const flowConfig = task.flowConfig || {};
  const taskType = deriveType(task);

  if (taskType === 'image') {
    let uploadedCount = 0;
    const result = await runFlowAutomation({
      prompt,
      assets: [refAsset],
      flowConfig,
      onImageReady: async (localPath) => {
        try {
          await onImageReady?.(task, localPath);
          uploadedCount++;
        } catch (e) {
          console.error(`[Pass2][${task.id}] image upload error:`, e.message);
        }
      }
    });
    const outputCount = result?.outputPaths?.length || 0;
    return {
      success: outputCount > 0 && uploadedCount > 0,
      outputCount,
      uploadedCount,
      chatUrl: result?.chatUrl
    };
  } else {
    let uploadedCount = 0;
    let videoLocalPath = null;
    const result = await runFlowVideoAutomation({
      prompt,
      imageUrl: referenceImageUrl,
      flowConfig,
      onVideoReady: async (localPath) => {
        videoLocalPath = localPath;
        try {
          await onVideoReady?.(task, localPath);
          uploadedCount++;
        } catch (e) {
          console.error(`[Pass2][${task.id}] video upload error:`, e.message);
        }
      }
    });
    return {
      success: !!videoLocalPath && uploadedCount > 0,
      outputCount: videoLocalPath ? 1 : 0,
      uploadedCount,
      chatUrl: result?.chatUrl
    };
  }
}

async function runSinglePass2Task({
  task,         // task object đã có flowConfig + prompt (legacy + ưu tiên)
  taskId,       // hoặc chỉ taskId — sẽ tự load từ DB
  referenceImageUrl,
  dimensions,
  onImageReady,
  onVideoReady,
  onTaskEvent,
  maxAttempts = 2
}) {
  if (!task && taskId) task = await getTaskById(taskId);
  if (!task) throw new Error('Pass2 task not found');

  const width = dimensions?.width || 4;
  const length = dimensions?.length || 4;

  try {
    await onTaskEvent?.({ taskId: task.id, status: 'running', error: null });
    const prompt = await resolveTaskPrompt(task, { WIDTH: width, LENGTH: length });

    let lastError = null;
    let rateLimitHit = false;
    let projectErrHit = false;
    // Tang attempts khi co backup profiles
    const effMax = Math.max(maxAttempts, FLOW_PROFILES_COUNT > 1 ? FLOW_PROFILES_COUNT + 1 : maxAttempts);
    for (let attempt = 1; attempt <= effMax; attempt++) {
      try {
        const r = await _runAttempt(task, prompt, referenceImageUrl, onImageReady, onVideoReady);
        if (r.success) {
          await onTaskEvent?.({ taskId: task.id, status: 'done', chatUrl: r.chatUrl });
          return { taskId: task.id, status: 'done', chatUrl: r.chatUrl, attempts: attempt };
        }
        lastError = `Attempt ${attempt}: Flow không tạo được kết quả (outputCount=${r.outputCount}, uploaded=${r.uploadedCount}).`;
        console.warn(`[Pass2][${task.id}] ${lastError}`);
      } catch (innerErr) {
        const msg = innerErr?.message || String(innerErr);
        rateLimitHit = /FLOW_RATE_LIMIT|tao qua nhanh|tạo quá nhanh|too many requests|rate.?limit/i.test(msg);
        projectErrHit = /FLOW_PROJECT_ERROR|Đã xảy ra lỗi|Da xay ra loi/i.test(msg);
        var accountBlockedHit = /FLOW_ACCOUNT_BLOCKED|unusual activity|Không thành công|hoạt động bất thường/i.test(msg);
        lastError = `Attempt ${attempt}: ${msg}`;
        const errTag = accountBlockedHit ? ' [ACCOUNT_BLOCKED]' : (rateLimitHit ? ' [RATE_LIMIT]' : (projectErrHit ? ' [PROJECT_ERROR]' : ''));
        console.error(`[Pass2][${task.id}] ${lastError}${errTag}`);
      }
      if (attempt < effMax) {
        // Multi-profile: switch ngay sang account khac va retry → khong cho long.
        const isSwitchable = rateLimitHit || projectErrHit || accountBlockedHit;
        if (isSwitchable && FLOW_PROFILES_COUNT > 1) {
          const reason = accountBlockedHit ? 'account-blocked' : (rateLimitHit ? 'rate-limit' : 'project-error');
          const sw = await markProfileCooldownAndSwitch(reason);
          if (sw.switched) {
            console.log(`[Pass2][${task.id}] Da switch profile #${sw.fromIdx} → #${sw.toIdx}, retry ${attempt + 1}/${effMax} NGAY...`);
            rateLimitHit = false; projectErrHit = false; accountBlockedHit = false;
            continue;
          }
        }
        // Single profile hoac het profile → backoff truyen thong
        const backoffMs = (rateLimitHit || accountBlockedHit) ? 45000 + Math.floor(Math.random() * 15000) : 5000;
        console.log(`[Pass2][${task.id}] Tự động retry lần ${attempt + 1}/${effMax} sau ${Math.round(backoffMs/1000)}s${(rateLimitHit || accountBlockedHit) ? ' (account/quota backoff)' : ''}...`);
        await new Promise(r => setTimeout(r, backoffMs));
        rateLimitHit = false; projectErrHit = false; accountBlockedHit = false;
      }
    }

    await onTaskEvent?.({
      taskId: task.id,
      status: 'failed',
      error: lastError || 'Không có kết quả sau tất cả lần thử.'
    });
    return { taskId: task.id, status: 'failed', error: lastError };
  } catch (err) {
    const tid = task?.id || taskId;
    console.error(`[Pass2][${tid}] FAILED:`, err?.message || err);
    await onTaskEvent?.({ taskId: tid, status: 'failed', error: err?.message || String(err) });
    return { taskId: tid, status: 'failed', error: err?.message || String(err) };
  }
}

async function runPass2Tasks({
  referenceImageUrl,
  dimensions,
  branch,
  onImageReady,
  onVideoReady,
  onTaskEvent
}) {
  if (!referenceImageUrl) {
    throw new Error('Thiếu referenceImageUrl cho Pass 2.');
  }

  const tasks = await getActiveTasks(branch);
  if (tasks.length === 0) {
    console.warn(`[Pass2] Không có task nào active${branch ? ` cho branch=${branch}` : ''} trong DB. Skip.`);
    return [];
  }
  const promises = tasks.map(task => runSinglePass2Task({
    task, referenceImageUrl, dimensions, onImageReady, onVideoReady, onTaskEvent
  }));
  const results = await Promise.allSettled(promises);
  return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message });
}

module.exports = {
  initPass2State,
  runPass2Tasks,
  runSinglePass2Task,
  getActiveTasks,
  getTaskById
};
