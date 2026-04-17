const fs = require('fs/promises');
const path = require('path');
const { runFlowAutomation, runFlowVideoAutomation } = require('./flowAutomation');

const PROMPTS_DIR = path.join(__dirname, 'prompts', 'pass2');

const PASS2_TASKS = [
  { id: 'angle_high_oblique', type: 'image', promptFile: '01_goc_chup_high_oblique.txt', label: 'Góc cao chéo (high oblique)' },
  { id: 'angle_side',         type: 'image', promptFile: '02_goc_chup_side_angled.txt',  label: 'Góc ngang (side-angled)' },
  { id: 'angle_top_down',     type: 'image', promptFile: '03_goc_chup_top_down.txt',     label: 'Góc từ trên xuống (top-down)' },
  { id: 'plant_map',          type: 'image', promptFile: '04_ban_do_cay.txt',            label: 'Bản đồ cây' },
  { id: 'floor_plan',         type: 'image', promptFile: '05_mat_bang.txt',              label: 'Mặt bằng' },
  { id: 'video_static',       type: 'video', promptFile: '06_video_giu_canh.txt',        label: 'Video giữ cảnh' },
  { id: 'video_day_night',    type: 'video', promptFile: '07_video_ngay_sang_dem.txt',   label: 'Video ngày sang đêm' }
];

async function loadPrompt(file, replacements = {}) {
  let text = await fs.readFile(path.join(PROMPTS_DIR, file), 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    text = text.split(`{${key}}`).join(String(value));
  }
  return text;
}

function initPass2State(referenceImageUrl, dimensions) {
  return {
    referenceImageUrl,
    dimensions: {
      width: dimensions?.width || 4,
      length: dimensions?.length || 4
    },
    status: 'running',
    startedAt: new Date(),
    completedAt: null,
    tasks: PASS2_TASKS.map(t => ({
      taskId: t.id,
      type: t.type,
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

  if (task.type === 'image') {
    let uploadedCount = 0;
    const result = await runFlowAutomation({
      prompt,
      assets: [refAsset],
      variantCount: 1,
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
  task,
  referenceImageUrl,
  dimensions,
  onImageReady,
  onVideoReady,
  onTaskEvent,
  maxAttempts = 2  // 1 lần chính + 1 retry tự động
}) {
  const width = dimensions?.width || 4;
  const length = dimensions?.length || 4;

  try {
    await onTaskEvent?.({ taskId: task.id, status: 'running', error: null });
    const prompt = await loadPrompt(task.promptFile, { WIDTH: width, LENGTH: length });

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
    console.error(`[Pass2][${task.id}] FAILED:`, err?.message || err);
    await onTaskEvent?.({ taskId: task.id, status: 'failed', error: err?.message || String(err) });
    return { taskId: task.id, status: 'failed', error: err?.message || String(err) };
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

  const promises = PASS2_TASKS.map(task => runSinglePass2Task({
    task, referenceImageUrl, dimensions, onImageReady, onVideoReady, onTaskEvent
  }));
  const results = await Promise.allSettled(promises);
  return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message });
}

module.exports = {
  PASS2_TASKS,
  initPass2State,
  runPass2Tasks,
  runSinglePass2Task
};
