# LandscapeApp — Core Xử Lý Flow (Agent Knowledge)

Tài liệu tập trung vào **luồng xử lý chính**: từ lúc hệ thống nhận input (ảnh + prompt) → điều khiển Google Labs Flow qua Playwright → detect xong → tải về → upload Cloudinary → cập nhật DB.

Không bàn về FE, schema, endpoints — chỉ tập trung phần automation.

**Files:**
- [`server/flowAutomation.js`](server/flowAutomation.js) — Playwright driver
- [`server/pass2Automation.js`](server/pass2Automation.js) — Pass 2 orchestrator (7 task song song)
- [`server/prompts/pass2/*.txt`](server/prompts/pass2/) — 7 prompt template Pass 2

---

## 1. Entry points

3 hàm public được gọi từ Express endpoints:

```js
// Sinh 1 hoặc 4 ảnh từ prompt + assets
runFlowAutomation({ prompt, assets, onImageReady, variantCount = 4 })
  → { outputPaths: string[], chatUrl: string }

// Sinh 1 video từ prompt + 1 ảnh reference
runFlowVideoAutomation({ prompt, imageUrl, onVideoReady })
  → { videoPath: string|null, chatUrl: string }

// Chạy 7 task Pass 2 song song cho 1 project
runPass2Tasks({ referenceImageUrl, dimensions, onImageReady, onVideoReady, onTaskEvent })
  → Array<{ taskId, status, chatUrl?, error? }>
```

**Input:**
- `prompt`: text, có thể chứa `{WIDTH}` `{LENGTH}` (Pass 2 mặt bằng)
- `assets`: `[{ label, url, role? }]` — ảnh tham chiếu (URL Cloudinary). Bot sẽ download về `/tmp`
- `imageUrl`: 1 URL ảnh duy nhất (cho video)
- `variantCount`: 1 hoặc 4. Pass 2 luôn dùng `1`. Pass 1 dùng `4`.

**Callback:**
- `onImageReady(localPath)` / `onVideoReady(localPath)`: được gọi SAU KHI bot tải được file về `/tmp`. Caller có trách nhiệm upload Cloudinary + update DB trong callback này.
- `onTaskEvent({ taskId, status, chatUrl?, error? })`: chỉ Pass 2, báo thay đổi state task.

---

## 2. Shared browser (1 Chrome, nhiều tab)

```js
const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');

// Module-level state
let _sharedBrowser = null;       // 1 persistent context duy nhất
let _sharedBrowserPromise = null; // Race-safe launch
let _activeTabCount = 0;         // đếm tab hoạt động
let _idleTimer = null;
const IDLE_CLOSE_MS = 30000;     // 30s không có tab → đóng browser
```

**Nguyên tắc:**
- Mỗi lần gọi `runFlowAutomation`/`runFlowVideoAutomation` → mở 1 tab mới trong shared browser, **không** launch browser mới.
- `launchPersistentContext(FLOW_PROFILE_DIR)` — giữ login Google Flow qua tab, qua lần restart.
- `FLOW_PROFILE_DIR` **phải gitignore** (nằm `tooltaoanh/flow_profile/`). Commit = leak cookies Google + corrupt profile khi pull ở máy khác.
- `_activeTabCount` tăng khi mở tab, giảm trong `finally`. Khi về 0, sau 30s idle thì `_sharedBrowser.close()`.
- Profile lần đầu phải tạo tay: `node flowLogin.js` → browser mở → đăng nhập Google → đóng.

**Tại sao persistent context (không headless):**
- Google block automation detect → `--disable-blink-features=AutomationControlled` giúp phần nào
- Login Google cần human-verified cookies → phải có profile thật
- Clipboard-paste trick cần quyền `clipboard-read` + `clipboard-write`

---

## 3. Dialog watcher — chống Flow treo

Google Flow thỉnh thoảng pop dialog consent giữa chừng: *"Bằng việc sử dụng tính năng này, bạn xác nhận..."* → có nút `[Hủy] [Tôi đồng ý]`. Nếu không click, bot kẹt mãi.

```js
async function dismissConsentDialog(page) {
  const btn = page.locator('button').filter({
    hasText: /Tôi đồng ý|I agree|Đồng ý|Accept/
  }).first();
  if (await btn.count() > 0 && await btn.isVisible()) {
    await btn.click();
    return true;
  }
  return false;
}

function startDialogWatcher(page, label) {
  let stopped = false;
  (async () => {
    while (!stopped) {
      if (page.isClosed?.()) break;
      await dismissConsentDialog(page);   // silent — ignore errors
      await delay(3000);
    }
  })();
  return () => { stopped = true; };   // returns stop function
}
```

**Usage:**
```js
const stopWatcher = startDialogWatcher(page, 'image');
try {
  // ... main flow ...
} finally {
  stopWatcher();   // LUÔN LUÔN phải stop, không để watcher rỉ
}
```

---

## 4. Flow sinh ảnh — `runFlowVariantV2`

Thứ tự bước KHÔNG được đổi. Đổi thứ tự = Flow UI reject hoặc bot mất sync.

### Bước 1: Navigate + xử lý error/newproject

```js
await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
await delay(3000);
await dismissConsentDialog(page);

// Nếu đang ở trang lỗi từ lần trước → bấm Quay lại
const errorBackBtn = page.locator('button:has-text("Quay lại dự án"), button:has-text("Quay lai du an")');
if (await errorBackBtn.count() > 0) await errorBackBtn.first().click();

// Click Dự án mới (dùng .last() vì có thể có nhiều elements match)
const newProjBtn = page.locator('button, div')
  .filter({ hasText: /Dự án mới|Du an moi|Nouveau projet/i }).last();
if (await newProjBtn.count() > 0) await newProjBtn.click();

chatUrl = page.url();   // lưu URL project mới để debug
```

### Bước 2: Config chế độ Hình ảnh + x1/x4

```js
// Tìm config button — text match "Video.*x" hoặc "Hình ảnh.*x" hoặc "Nano.*x" hoặc "crop"
const configBtn = page.locator('button').filter({
  hasText: /Video.*x|Hình ảnh.*x|Nano.*x|crop/
}).first();
await configBtn.click();
await delay(1500);

// Chuyển tab Hình ảnh (nếu chưa selected)
const imageTabBtn = page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: /imageHình ảnh/ }).first();
if (await imageTabBtn.getAttribute('aria-selected') !== 'true') {
  await imageTabBtn.click();
}

// Chọn variant count — regex phải chính xác để không nhầm x10, x100
const variantLabel = variantCount === 1 ? 'x1' : 'x4';
const variantBtn = page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: new RegExp(`^${variantLabel}$`) }).first();
if (await variantBtn.count() > 0) await variantBtn.click();

// Đóng panel — click lại configBtn (toggle)
await configBtn.click();
```

### Bước 3: Paste asset vào textbox

```js
// Download asset URLs về /tmp
const inputFiles = [];
for (const asset of assets) {
  inputFiles.push(await downloadAssetToFile(asset, tempDir, index));
}

// Tạo DataTransfer clipboard payload
const clipboardFiles = await buildClipboardPayload(inputFiles);
// → [{ name, type, base64 }]

// Paste bằng event dispatch (không phải file input — Flow không chấp nhận)
const promptBox = await pasteAssetsIntoPrompt(page, clipboardFiles);
// Tìm textbox visible (div[role="textbox"][contenteditable="true"]) rồi:
//   const dt = new DataTransfer();
//   for (f of files) dt.items.add(new File([bytes], name, { type }));
//   element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));

// Chờ thumbnail xuất hiện + upload progress tắt
await waitForPromptAssetsReady(page, inputFiles.length);
// Check: img.width>30 && height>30, không phải avatar/icon
// Và không còn [role="progressbar"] nào visible
// Timeout 120s
```

### Bước 4: Nhập prompt

```js
// fillPromptBox có 3 fallback:
//   1. locator.fill(text)
//   2. page.evaluate setPromptTextViaDom — set innerHTML + dispatch input events
//   3. keyboard Ctrl+A → Backspace → insertText action
// Verify: 20 ký tự đầu prompt phải có trong textbox sau khi set
await fillPromptBox(promptBox, prompt);
await delay(1000);
```

### Bước 5: Chờ composer sẵn sàng

```js
await waitForComposerReadyToSubmit(page, inputFiles.length, prompt);
// Check đồng thời:
//   - số thumbnail ≥ số asset input
//   - textbox chứa đoạn đầu prompt
//   - send button enabled (không disabled, không aria-disabled=true)
// Timeout 60s
```

### Bước 6: Snapshot images cũ + Send

```js
// CRUCIAL: snap src của tất cả img CŨ ĐÃ có trên trang để phân biệt với ảnh kết quả
const existingImgSources = await page.evaluate(() =>
  Array.from(document.querySelectorAll('img'))
    .filter(img => img.width > 100 && !img.src.includes('avatar'))
    .map(img => img.src)
);

// Click send (có 3 fallback selectors)
const sendBtn = page.locator(
  'button:has-text("arrow_forward"), ' +
  'button[aria-label*="Gửi"], button[aria-label*="Gui"], ' +
  'button[aria-label*="Send"], ' +
  'button[aria-label*="Tạo"], button[aria-label*="Tao"]'
).first();
if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
  await sendBtn.click();
} else {
  await page.keyboard.press('Enter');   // fallback cuối
}
```

### Bước 7: Detect ảnh mới xuất hiện (CORE!)

```js
try {
  await page.waitForFunction(({ oldSources, need }) => {
    const newImgs = Array.from(document.querySelectorAll('img'))
      .filter(img => img.width > 200 && !img.src.includes('avatar'))
      .filter(img => !oldSources.includes(img.src));
    return newImgs.length >= need;
  },
  { oldSources: existingImgSources, need: targetCount },
  { timeout: 360000 });   // 6 PHÚT
} catch (timeoutError) {
  // KHÔNG throw — tiếp tục với ảnh đã có (có thể 0)
  console.log(`[FlowV2] Timeout, xử lý ảnh đã có: ${err.message}`);
}

// Delay thêm 20s để DOM ổn định sau khi render
await delay(20000);
```

**Quan trọng:**
- `width > 200` phân biệt với thumbnail/icon
- Lọc `!avatar` loại user avatar Google
- So với `existingImgSources` để chỉ lấy ảnh MỚI
- Timeout 6 phút: ảnh prompt dài (> 3000 chars) Flow có thể render 4-5 phút. Ngắn hơn sẽ fail false.
- Timeout **không throw** — vẫn tiếp tục download ảnh có được. Đó là tại sao success criterion phải có `outputCount > 0` (xem section 7).

### Bước 8: Download ảnh kết quả

3 dạng `img.src` có thể xuất hiện, phải handle cả 3:

```js
const newResults = await page.evaluate((old) => {
  return Array.from(document.querySelectorAll('img'))
    .filter(img => img.width > 200 && !img.src.includes('avatar'))
    .filter(img => !old.includes(img.src))
    .map(img => ({
      src: img.src,
      rect: { x, y, w, h }
    }));
}, existingImgSources);

for (let i = 0; i < Math.min(newResults.length, targetCount); i++) {
  const item = newResults[i];
  const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);

  if (item.src.startsWith('data:image')) {
    // Dạng 1: base64 inline
    const base64 = item.src.split('base64,')[1];
    await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));
  }
  else if (item.src.startsWith('blob:')) {
    // Dạng 2: blob URL — phải fetch từ browser context
    const base64Data = await page.evaluate(async (blobUrl) => {
      const r = await fetch(blobUrl);
      const b = await r.blob();
      return new Promise(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result);
        reader.readAsDataURL(b);
      });
    }, item.src);
    const base64 = String(base64Data).split('base64,')[1];
    await fs.writeFile(outputPath, Buffer.from(base64, 'base64'));
  }
  else {
    // Dạng 3: URL https — fetch trong browser (có cookies Flow)
    const arrayBuffer = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const buf = await r.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, item.src);
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
  }

  outputPaths.push(outputPath);
  // CALLBACK: caller upload Cloudinary + update DB
  await onImageReady(outputPath);
}
```

**Tại sao fetch từ `page.evaluate` (không `fetch` Node.js):** URL và blob phụ thuộc cookies Google Flow session. Fetch từ Node.js → 401/403. Fetch từ browser context → có cookies hợp lệ.

### Bước 9: Close tab

```js
await page.close().catch(() => null);
return { outputPaths, chatUrl };
```

---

## 5. Flow sinh video — `runFlowVideoGeneration`

Tương tự flow ảnh, **chỉ khác các điểm sau**:

### Config khác (Bước 2)

```js
// Chuyển tab Video (không phải Hình ảnh)
const videoTab = page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: /videocamVideo/ }).first();
if (await videoTab.getAttribute('aria-selected') !== 'true') {
  await videoTab.click();
}

// CHỌN "Thành phần" — không phải "Khung hình"
// Đây là chế độ cho phép ảnh reference làm thành phần
const thanhPhanTab = page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: /chrome_extensionThành phần/ }).first();
if (await thanhPhanTab.getAttribute('aria-selected') !== 'true') {
  await thanhPhanTab.click();
}

// Chọn 16:9
await page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: /16:9/ }).first().click();

// Chọn x1 (video chỉ có x1/x2, mặc định x2 → tốn quota)
await page.locator('button.flow_tab_slider_trigger')
  .filter({ hasText: /^x1$/ }).first().click();

// Đóng config
await configBtn.click();
```

### Snapshot + detection khác (Bước 6-7)

```js
// Snapshot VIDEOS cũ (không phải images)
const existingVideos = await page.evaluate(() =>
  Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc || '')
);

// Detection: <video> có src chứa "media.getMediaUrlRedirect"
// → signature của Google Flow khi video render xong
try {
  await page.waitForFunction((oldVideos) => {
    const ready = Array.from(document.querySelectorAll('video')).filter(v => {
      const src = v.src || v.currentSrc || '';
      return src
        && !oldVideos.includes(src)
        && src.includes('media.getMediaUrlRedirect');
    });
    return ready.length >= 1;
  }, existingVideos, { timeout: 600000 });   // 10 PHÚT
} catch (err) { /* ignore, tiếp tục */ }

await delay(5000);   // delay ngắn hơn ảnh vì URL stable hơn
```

**Tại sao `media.getMediaUrlRedirect`:** Flow lúc đầu hiển thị video với `src` blob hoặc thumbnail. Khi render xong, src chuyển thành redirect URL dạng `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=<UUID>`. Chỉ URL này mới tải được video đầy đủ. Các src trước đó là placeholder.

### Download video (Bước 8)

```js
const newVideos = await page.evaluate((oldVideos) => {
  return Array.from(document.querySelectorAll('video')).filter(v => {
    const src = v.src || v.currentSrc || '';
    return src && !oldVideos.includes(src) && src.includes('media.getMediaUrlRedirect');
  }).map(v => ({ src: v.src || v.currentSrc }));
}, existingVideos);

if (newVideos.length > 0) {
  const outputPath = path.join(tempDir, `flow_video_${Date.now()}.mp4`);

  if (newVideos[0].src.startsWith('blob:')) {
    // Handle blob
    const base64 = await page.evaluate(async (url) => { /* fetch + FileReader */ }, src);
    await fs.writeFile(outputPath, Buffer.from(base64.split('base64,')[1], 'base64'));
  } else {
    // URL redirect → fetch trong browser context (có cookies)
    const arrayBuffer = await page.evaluate(async (url) => {
      const r = await fetch(url);
      const buf = await r.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, newVideos[0].src);
    await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
  }

  videoPath = outputPath;
  await onVideoReady(outputPath);
}
```

---

## 6. Pass 2 — 7 task song song

### 6.1 Task list cố định

File: [`server/pass2Automation.js`](server/pass2Automation.js)

```js
const PASS2_TASKS = [
  { id: 'angle_high_oblique', type: 'image', promptFile: '01_goc_chup_high_oblique.txt', label: 'Góc cao chéo' },
  { id: 'angle_side',         type: 'image', promptFile: '02_goc_chup_side_angled.txt',  label: 'Góc ngang' },
  { id: 'angle_top_down',     type: 'image', promptFile: '03_goc_chup_top_down.txt',     label: 'Góc từ trên xuống' },
  { id: 'plant_map',          type: 'image', promptFile: '04_ban_do_cay.txt',            label: 'Bản đồ cây' },
  { id: 'floor_plan',         type: 'image', promptFile: '05_mat_bang.txt',              label: 'Mặt bằng' },
  { id: 'video_static',       type: 'video', promptFile: '06_video_giu_canh.txt',        label: 'Video giữ cảnh' },
  { id: 'video_day_night',    type: 'video', promptFile: '07_video_ngay_sang_dem.txt',   label: 'Video ngày sang đêm' }
];
```

5 image + 2 video. Chạy **đồng thời 7 tab** trong shared browser.

### 6.2 Orchestrator

```js
async function runPass2Tasks({ referenceImageUrl, dimensions, onImageReady, onVideoReady, onTaskEvent }) {
  const promises = PASS2_TASKS.map(task => runSinglePass2Task({
    task, referenceImageUrl, dimensions,
    onImageReady, onVideoReady, onTaskEvent
  }));
  return await Promise.allSettled(promises);
}
```

`Promise.allSettled` — 1 task fail không dừng các task khác.

### 6.3 Mỗi task: auto-retry 2 attempts

```js
async function runSinglePass2Task({ task, referenceImageUrl, dimensions,
    onImageReady, onVideoReady, onTaskEvent, maxAttempts = 2 }) {

  await onTaskEvent({ taskId: task.id, status: 'running', error: null });

  // Load prompt + substitute {WIDTH}, {LENGTH}
  const prompt = await loadPrompt(task.promptFile, {
    WIDTH: dimensions?.width || 4,
    LENGTH: dimensions?.length || 4
  });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await _runAttempt(task, prompt, referenceImageUrl, onImageReady, onVideoReady);
    if (r.success) {
      await onTaskEvent({ taskId: task.id, status: 'done', chatUrl: r.chatUrl });
      return { taskId: task.id, status: 'done' };
    }
    lastError = `Attempt ${attempt}: Flow không tạo được kết quả (outputCount=${r.outputCount}, uploaded=${r.uploadedCount}).`;
    if (attempt < maxAttempts) await delay(3000);
  }

  await onTaskEvent({ taskId: task.id, status: 'failed', error: lastError });
  return { taskId: task.id, status: 'failed', error: lastError };
}
```

**Success criterion (QUAN TRỌNG):**
```js
success = outputCount > 0 && uploadedCount > 0
```

- `outputCount > 0`: Flow thực sự render và bot tải được file về
- `uploadedCount > 0`: callback upload Cloudinary thành công (URL không null)

Chỉ mark `done` khi CẢ 2 đều ok. Ngăn trạng thái lấp lửng "UI xanh DONE nhưng không có ảnh".

### 6.4 `_runAttempt` — wrapper dispatch type

```js
async function _runAttempt(task, prompt, referenceImageUrl, onImageReady, onVideoReady) {
  const refAsset = { url: referenceImageUrl, label: 'pass2_reference' };

  if (task.type === 'image') {
    let uploadedCount = 0;
    const result = await runFlowAutomation({
      prompt, assets: [refAsset],
      variantCount: 1,   // Pass 2 LUÔN x1
      onImageReady: async (localPath) => {
        try {
          await onImageReady(task, localPath);
          uploadedCount++;   // tăng KHI upload thành công
        } catch (e) { /* log */ }
      }
    });
    return {
      success: result.outputPaths.length > 0 && uploadedCount > 0,
      outputCount: result.outputPaths.length,
      uploadedCount,
      chatUrl: result.chatUrl
    };
  } else {
    // video task — tương tự nhưng track videoLocalPath
    let videoLocalPath = null, uploadedCount = 0;
    const result = await runFlowVideoAutomation({
      prompt, imageUrl: referenceImageUrl,
      onVideoReady: async (localPath) => {
        videoLocalPath = localPath;
        try { await onVideoReady(task, localPath); uploadedCount++; }
        catch (e) { /* log */ }
      }
    });
    return {
      success: !!videoLocalPath && uploadedCount > 0,
      outputCount: videoLocalPath ? 1 : 0,
      uploadedCount,
      chatUrl: result.chatUrl
    };
  }
}
```

### 6.5 Prompt loading với biến

```js
async function loadPrompt(file, replacements = {}) {
  let text = await fs.readFile(path.join(PROMPTS_DIR, file), 'utf-8');
  for (const [key, value] of Object.entries(replacements)) {
    text = text.split(`{${key}}`).join(String(value));   // replaceAll
  }
  return text;
}
```

Chỉ `05_mat_bang.txt` có `{WIDTH}` `{LENGTH}`. Các prompt khác không có biến → replacements không ảnh hưởng.

---

## 7. Upload callback — đường đi của localPath

Đây là phần caller phải implement trong endpoint handler. Trong file này chỉ giải thích contract.

```js
// Caller truyền vào runFlowAutomation / runPass2Tasks
const onImageReady = async (task, localPath) => {
  // 1. Upload Cloudinary (timeout 10min, retry 3x, resource_type: 'auto')
  const url = await uploadToCloudinary(localPath);

  // 2. Guard: nếu upload fail, uploadToCloudinary trả fallback = localPath
  //    → không bắt đầu với 'http' → caller BỎ QUA update DB
  if (!url || !url.startsWith('http')) return;

  // 3. Update DB — $set đúng task qua array positional operator
  await Project.findOneAndUpdate(
    { id: projectId, 'pass2Results.tasks.taskId': task.id },
    { $set: { 'pass2Results.tasks.$.url': url } }
  );
};
```

**Contract:**
- `localPath` là file đã tồn tại trên disk, caller đọc là OK
- Callback có thể throw — runner sẽ log và tiếp tục (không crash)
- Callback phải idempotent — có thể được gọi lại khi retry

**Upload Cloudinary:**
```js
async function uploadToCloudinary(fileStr) {
  if (!fileStr || fileStr.startsWith('http')) return fileStr;
  const opts = { folder: 'landscape_app', resource_type: 'auto', timeout: 600000 };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await cloudinary.uploader.upload(fileStr, opts);
      if (res?.secure_url) return res.secure_url;
    } catch (err) { /* log */ }
    if (attempt < 3) await delay(2000);
  }
  return fileStr;   // FALLBACK — caller dùng startsWith('http') để biết fail
}
```

**KHÔNG dùng `upload_large()`:** hàm đó không resolve Promise với `secure_url` khi await. Gây silent fail. Luôn dùng `upload()` với timeout dài.

---

## 8. Timeouts & constants (cheat sheet)

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `IDLE_CLOSE_MS` | 30s | Browser idle trước khi đóng |
| Image wait timeout | **360s (6 phút)** | Chờ `<img>` mới xuất hiện |
| Image settle delay | 20s | Sau detect, chờ DOM ổn định |
| Video wait timeout | **600s (10 phút)** | Chờ `media.getMediaUrlRedirect` |
| Video settle delay | 5s | URL redirect stable nhanh hơn img |
| Asset upload wait | 120s | Chờ thumbnail asset xuất hiện sau paste |
| Composer ready wait | 60s | Chờ send button enabled |
| Cloudinary timeout | 10 phút/attempt | Upload timeout |
| Cloudinary retries | 3 | Với delay 2s giữa attempts |
| Pass 2 max attempts | 2 | 1 chính + 1 retry tự động |
| Pass 2 retry delay | 3s | Giữa attempts |
| Dialog watcher tick | 3s | Check consent popup |

---

## 9. Landmines — lỗi đã từng mắc

### 9.1 `upload_large()` vs `upload()`
Dùng `upload_large()` với `await` → không trả `secure_url` → silent fail → task marked done nhưng url=null. **Luôn dùng `upload()`** kèm `timeout: 600000`.

### 9.2 Mongoose schema `type` field collision
Viết `tasks: [{ type: String }]` → Mongoose hiểu `type` là typeKey → cast cả task thành string → CastError. **Phải viết `type: { type: String }`**.

### 9.3 Chrome profile commit nhầm
`tooltaoanh/flow_profile/` lần đầu không có trong `.gitignore` → commit lên git → máy B pull → ghi đè profile → login session corrupt → server không chạy được. **Giữ trong `.gitignore`**, nếu lỡ commit: `git rm -r --cached tooltaoanh/flow_profile/`.

### 9.4 Task status=done nhưng url=null
Trước đây: gọi `onTaskEvent({status:'done'})` sau mỗi `_runAttempt` bất kể kết quả → task marked done mà không có URL. **Fix**: chỉ mark done khi `outputCount > 0 && uploadedCount > 0` (xem section 6.3).

### 9.5 Server crash giữa chừng → task stuck running
Background IIFE chết theo process → DB kẹt `running` mãi → nút Retry reject vì check status !== 'running'. **Fix**: `sweepStuckPass2()` chạy 3s sau khi Mongo connect lúc boot, mark stuck tasks = failed.

### 9.6 Timeout quá ngắn cho prompt dài
Prompt `plant_map` (3818 chars), `floor_plan` (4680 chars) → Flow render có thể >4 phút → timeout 240s fail. **Đã tăng lên 360s (6 phút)**. Nếu vẫn fail: cần tăng tiếp hoặc thay đổi selector detect.

### 9.7 Consent dialog popup giữa chừng
Google Flow bật dialog "Tôi đồng ý" mid-flow → bot kẹt. **Fix**: `startDialogWatcher` chạy background mỗi 3s tự click.

### 9.8 Tab crash với nhiều tab song song
"Target page, context or browser has been closed" khi 7 tab cùng config Flow UI → 1 vài tab bị crash vì resource contention. **Fix**: auto-retry attempt 2 trong `runSinglePass2Task` (section 6.3).

### 9.9 Fetch blob/URL từ Node.js fail
Blob URL chỉ tồn tại trong browser context. HTTPS URL cần cookies session. **Luôn fetch qua `page.evaluate`** (xem section 4 Bước 8).
