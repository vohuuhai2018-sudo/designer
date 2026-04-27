const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { runFlowAutomation, runFlowVideoAutomation } = require('./flowAutomation');

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

async function getActiveTasks() {
  const Pass2Task = mongoose.model('Pass2Task');
  return await Pass2Task.find({ hidden: { $ne: true } }).sort({ order: 1 }).lean();
}

async function getTaskById(id) {
  const Pass2Task = mongoose.model('Pass2Task');
  return await Pass2Task.findOne({ id }).lean();
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

async function initPass2State(referenceImageUrl, dimensions) {
  const tasks = await getActiveTasks();
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
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const r = await _runAttempt(task, prompt, referenceImageUrl, onImageReady, onVideoReady);
        if (r.success) {
          await onTaskEvent?.({ taskId: task.id, status: 'done', chatUrl: r.chatUrl });
          return { taskId: task.id, status: 'done', chatUrl: r.chatUrl, attempts: attempt };
        }
        lastError = `Attempt ${attempt}: Flow không tạo được kết quả (outputCount=${r.outputCount}, uploaded=${r.uploadedCount}).`;
        console.warn(`[Pass2][${task.id}] ${lastError}`);
      } catch (innerErr) {
        lastError = `Attempt ${attempt}: ${innerErr?.message || innerErr}`;
        console.error(`[Pass2][${task.id}] ${lastError}`);
      }
      if (attempt < maxAttempts) {
        console.log(`[Pass2][${task.id}] Tự động retry lần ${attempt + 1}/${maxAttempts}...`);
        await new Promise(r => setTimeout(r, 3000));
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
  onImageReady,
  onVideoReady,
  onTaskEvent
}) {
  if (!referenceImageUrl) {
    throw new Error('Thiếu referenceImageUrl cho Pass 2.');
  }

  const tasks = await getActiveTasks();
  if (tasks.length === 0) {
    console.warn('[Pass2] Không có task nào active trong DB. Skip.');
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
