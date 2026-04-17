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

  const width = dimensions?.width || 4;
  const length = dimensions?.length || 4;
  const refAsset = { url: referenceImageUrl, label: 'pass2_reference' };

  const tasks = PASS2_TASKS.map(async (task) => {
    try {
      await onTaskEvent?.({ taskId: task.id, status: 'running' });

      const prompt = await loadPrompt(task.promptFile, { WIDTH: width, LENGTH: length });

      if (task.type === 'image') {
        const result = await runFlowAutomation({
          prompt,
          assets: [refAsset],
          variantCount: 1,
          onImageReady: async (localPath) => {
            try { await onImageReady?.(task, localPath); } catch (e) { console.error(`[Pass2][${task.id}] image upload error:`, e.message); }
          }
        });
        await onTaskEvent?.({ taskId: task.id, status: 'done', chatUrl: result?.chatUrl });
        return { taskId: task.id, status: 'done', chatUrl: result?.chatUrl };
      } else {
        const result = await runFlowVideoAutomation({
          prompt,
          imageUrl: referenceImageUrl,
          onVideoReady: async (localPath) => {
            try { await onVideoReady?.(task, localPath); } catch (e) { console.error(`[Pass2][${task.id}] video upload error:`, e.message); }
          }
        });
        await onTaskEvent?.({ taskId: task.id, status: 'done', chatUrl: result?.chatUrl });
        return { taskId: task.id, status: 'done', chatUrl: result?.chatUrl };
      }
    } catch (err) {
      console.error(`[Pass2][${task.id}] FAILED:`, err?.message || err);
      await onTaskEvent?.({ taskId: task.id, status: 'failed', error: err?.message || String(err) });
      return { taskId: task.id, status: 'failed', error: err?.message || String(err) };
    }
  });

  const results = await Promise.allSettled(tasks);
  return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message });
}

module.exports = {
  PASS2_TASKS,
  initPass2State,
  runPass2Tasks
};
