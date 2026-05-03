# Google Labs Flow — Reverse-Engineered API Spec

**Last verified:** 2026-05-03
**Source:** Webpack bundle `chunks/9566...js` + captured network traffic from real UI gen
**Reference implementation:** `flowAutomation.js` (617 dòng)
**Legacy UI implementation:** `flowAutomation.legacy.js` (xóa được sau khi confirm prod ổn)

> ⚠️ **Disclaimer**: Đây là reverse-engineering từ public web bundle để tự động hóa workflow. Không có cam kết stability — Google có thể đổi shape bất cứ lúc nào. Khi gen fail bất thường, kiểm tra trước hết: (1) shape body, (2) recaptcha action, (3) model name.

---

## Mục lục

1. [Auth chain](#auth-chain)
2. [Magic constants](#magic-constants)
3. [Endpoint #1 — `/fx/api/auth/session`](#1-get-fxapiauthsession)
4. [Endpoint #2 — `/fx/api/trpc/project.createProject`](#2-post-fxapitrpcprojectcreateproject)
5. [Endpoint #3 — `/fx/api/trpc/media.getMediaUrlRedirect`](#3-get-fxapitrpcmediagetmediaurlredirect)
6. [Endpoint #4 — `/v1/flow/uploadImage`](#4-post-v1flowuploadimage)
7. [Endpoint #5 — `/v1/projects/{id}/flowMedia:batchGenerateImages`](#5-post-v1projectsidflowmediabatchgenerateimages)
8. [Endpoint #6 — `/v1/video:batchAsyncGenerateVideoReferenceImages`](#6-post-v1videobatchasyncgeneratevideoreferenceimages)
9. [Endpoint #7 — `/v1/video:batchCheckAsyncVideoGenerationStatus`](#7-post-v1videobatchcheckasyncvideogenerationstatus)
10. [Endpoint #8 — `<fifeUrl>` (lh3.googleusercontent.com)](#8-get-fifeurl-lh3googleusercontentcom)
11. [Discovered endpoints không dùng](#discovered-endpoints-không-dùng)
12. [Common gotchas](#common-gotchas)
13. [Decoder bundle](#decoder-bundle)

---

## Auth chain

Tất cả gen request đều cần 2 thứ: **access_token** (Bearer) + **recaptchaToken** (per-request).

```
┌──────────────────┐
│ Browser Chrome   │  ← persistent profile có cookie OAuth Google
│ labs.google/fx   │
└────────┬─────────┘
         │
         ├─→ #1 GET /fx/api/auth/session ─→ { access_token, expires } [TTL ~1h]
         │
         └─→ grecaptcha.enterprise.execute(siteKey, {action})
                 │
                 ▼
            recaptchaToken [TTL ~120s, single-use, action-bound]
                 │
                 ├─→ recaptchaContext = { token, applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB' }
                 │
                 └─→ Bearer + recaptchaContext → các endpoint #4/#5/#6/#7
```

**Tại sao bắt buộc browser:** `grecaptcha.execute` chỉ chạy trong page có site key đã register, fingerprint browser real → server-side không gen được token này. Đây là design chống bot của Google.

---

## Magic constants

```javascript
// Site key reCAPTCHA Enterprise — cố định cho toàn bộ Flow
const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';

// Action names theo từng nhóm endpoint
const ACTIONS = {
  IMAGE: 'IMAGE_GENERATION',     // dùng cho upload + batchGenerateImages
  VIDEO: 'VIDEO_GENERATION',     // dùng cho startVideoGen + pollStatus
};

// Model names
const MODELS = {
  image: 'NARWHAL',                                    // Flow image gen model
  video: {
    landscape: 'veo_3_1_r2v_fast_landscape_ultra',   // 16:9
    portrait:  'veo_3_1_r2v_fast_portrait_ultra',    // 9:16
    // 1:1 → vẫn dùng landscape model
  },
};

// Aspect ratio enums
const IMAGE_ASPECT = {
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '4:3':  'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '3:4':  'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
  '1:1':  'IMAGE_ASPECT_RATIO_SQUARE',
};
const VIDEO_ASPECT = {
  '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
  // 'VIDEO_ASPECT_RATIO_UNSPECIFIED' tồn tại nhưng không dùng
};

// Tool name (dùng trong clientContext của tất cả endpoint)
const TOOL = 'PINHOLE';

// User tier (dùng cho video gen, ảnh hưởng quota)
const USER_TIER = 'PAYGATE_TIER_TWO';

// Hosts
const FX_HOST  = 'https://labs.google';                  // tRPC + auth
const API_HOST = 'https://aisandbox-pa.googleapis.com';  // gen endpoints
const CDN_HOST = 'https://lh3.googleusercontent.com';    // generated images
```

---

## #1 GET /fx/api/auth/session

**Domain:** `labs.google`
**Auth:** Cookie OAuth (sticky session từ persistent Chrome profile)
**Mục đích:** Lấy `access_token` để dùng làm Bearer cho `aisandbox-pa.googleapis.com`

### Request
```http
GET https://labs.google/fx/api/auth/session
Cookie: __Secure-next-auth.session-token=...; ...
```

### Response 200
```json
{
  "user": { "name": "...", "email": "...", "image": "..." },
  "expires": "2026-06-03T05:23:11.000Z",
  "access_token": "ya29.A0AS3H6Nx...",
  "refresh_token": "...",
  "id_token": "..."
}
```

### Error cases
- **No session-token cookie** → 200 với `{}` (no `access_token` field) → throw `Flow session chưa đăng nhập`
- **Cookie hết hạn** → 200 với refresh failed → re-login: `node server/test_login.js`

### TTL
`access_token` ~1 giờ. Code gọi mới mỗi lần để đơn giản (không cache).

---

## #2 POST /fx/api/trpc/project.createProject

**Domain:** `labs.google`
**Auth:** Cookie (tRPC v10)
**Mục đích:** Tạo project trên Flow để chứa media output

### Request
```http
POST https://labs.google/fx/api/trpc/project.createProject
Content-Type: application/json
Cookie: ...

{
  "json": {
    "projectTitle": "landscape-2026-05-03T05:23:11",
    "toolName": "PINHOLE"
  }
}
```

### Response 200
```json
{
  "result": {
    "data": {
      "json": {
        "result": {
          "projectId": "a7e6ab6c-494d-4286-a1bc-15f757f28bfc"
        }
      }
    }
  }
}
```

→ Extract: `result.data.json.result.projectId`

### Notes
- `projectTitle` chỉ hiển thị trên UI Flow, không ràng buộc unique
- Mỗi gen tạo 1 project mới (overhead nhỏ, ~200ms)
- Nếu page đã ở `/project/<id>`, có thể skip bước này (code có shortcut)

---

## #3 GET /fx/api/trpc/media.getMediaUrlRedirect

**Domain:** `labs.google`
**Auth:** Cookie (KHÔNG phải tRPC mặc dù path là `/fx/api/trpc/`)
**Mục đích:** Lấy URL playback của video đã gen

### ⚠️ Quan trọng — KHÔNG phải tRPC
Mặc dù path nằm dưới `/fx/api/trpc/`, endpoint này là **REST handler thuần**, nhận `?name=<id>` làm query param thường (không bọc trong `?input={"json":{...}}`). Đã thử 14 biến thể tRPC v10 → tất cả trả 400 "Internal Error".

### Request
```http
GET https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=<mediaId>
Cookie: ...
```

### Response 302
```http
HTTP/1.1 302 Found
Location: <signed CDN URL>
```

→ Follow redirect → mp4 bytes

### Code pattern
```javascript
// Node-side, dùng Playwright để inherit cookies
const ctx = page.context();
const dl = await ctx.request.get(
  `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${encodeURIComponent(mediaId)}`,
  { timeout: 60000 }
);
const buf = await dl.body();
await fs.writeFile(outputPath, buf);
```

### Notes
- Endpoint cũng dùng được cho image (chỉ cần `name` là mediaId của image), nhưng image gen trả về `fifeUrl` luôn nên không cần dùng
- Polling response cho video KHÔNG có URL → bắt buộc gọi endpoint này riêng

---

## #4 POST /v1/flow/uploadImage

**Domain:** `aisandbox-pa.googleapis.com`
**Auth:** Bearer + KHÔNG cần recaptchaContext (chỉ vài upload endpoint không cần recaptcha)
**Mục đích:** Upload ảnh lên Flow để dùng làm input cho gen

### Request
```http
POST https://aisandbox-pa.googleapis.com/v1/flow/uploadImage
Authorization: Bearer ya29.A0AS3H6Nx...
Content-Type: text/plain;charset=UTF-8

{
  "clientContext": {
    "projectId": "a7e6ab6c-...",
    "tool": "PINHOLE"
  },
  "imageBytes": "<base64 string không có data:image/png;base64, prefix>"
}
```

### Response 200
```json
{
  "media": {
    "name": "d16964bd-6557-44a0-88f1-d28402cd594f",
    "projectId": "a7e6ab6c-...",
    "workflowId": "7cc2d8a9-...",
    "workflowStepId": "CAE",
    "mediaMetadata": { /* ... */ }
  }
}
```

→ Extract: `media.name` = mediaId dùng cho gen sau

### Notes
- Upload song song N ảnh OK (`Promise.all`)
- `imageBytes` raw base64, **không có** prefix `data:image/png;base64,`
- Content-Type là `text/plain` (proto-as-JSON, đây là quirk của Google APIs)

---

## #5 POST /v1/projects/{id}/flowMedia:batchGenerateImages

**Domain:** `aisandbox-pa.googleapis.com`
**Auth:** Bearer + recaptchaContext (action=`IMAGE_GENERATION`)
**Mục đích:** Generate ảnh (sync, ~30-50s)

### Request
```http
POST https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages
Authorization: Bearer ya29.A0AS3H6Nx...
Content-Type: text/plain;charset=UTF-8

{
  "clientContext": {
    "recaptchaContext": {
      "token": "<recaptcha_token>",
      "applicationType": "RECAPTCHA_APPLICATION_TYPE_WEB"
    },
    "projectId": "a7e6ab6c-...",
    "tool": "PINHOLE",
    "sessionId": ";1714770191234",
    "workflowId": "7cc2d8a9-..."  // optional, từ uploadImage response
  },
  "mediaGenerationContext": {
    "batchId": "<UUID v4>"
  },
  "useNewMedia": true,
  "requests": [{
    "clientContext": { /* same as outer */ },
    "imageModelName": "NARWHAL",
    "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
    "structuredPrompt": {
      "parts": [{ "text": "<prompt text>" }]
    },
    "seed": 123456,
    "imageInputs": [
      { "imageInputType": "IMAGE_INPUT_TYPE_BASE_IMAGE", "name": "<mediaId>" },
      { "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE",  "name": "<mediaId>" },
      { "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE",  "name": "<mediaId>" }
    ]
  }]
}
```

### Response 200
```json
{
  "media": [
    {
      "name": "...",
      "workflowId": "...",
      "image": {
        "generatedImage": {
          "fifeUrl": "https://lh3.googleusercontent.com/...=s4096-rwa-v1",
          "seed": 123456
        },
        "dimensions": { "width": 1376, "height": 768 }
      }
    },
    /* ... N items if requests[0] gen multiple variants ... */
  ]
}
```

→ Extract: `media[i].image.generatedImage.fifeUrl` → fetch từ CDN lấy PNG

### Notes — `imageInputs` rules

- **`imageInputs[0]` là BASE_IMAGE** (singular trong proto). Bundle dùng `baseImageServerId` (số ít).
- **`imageInputs[1+]` là REFERENCE** (multiple OK).
- LandscapeApp convention: `assets[0]` = base (site/landscape), `assets[1+]` = reference (style).
- Có thể KHÔNG có `imageInputs` (text-only gen) → vẫn hợp lệ.

### Variant count
Để gen nhiều biến thể từ cùng prompt, fan-out N requests song song với cùng `batchId` nhưng `seed` khác nhau. Endpoint chỉ gen 1 variant per request.

### Error cases
| Status | Error message | Nguyên nhân |
|---|---|---|
| 400 | `Invalid value at 'requests[0].imageInputs[0]'` | Sai shape imageInputs |
| 400 | `Unknown name 'X'` | Field không tồn tại trong proto |
| 403 | `PUBLIC_ERROR_UNUSUAL_ACTIVITY` | reCAPTCHA score thấp (headless / IP datacenter) |
| 403 | `reCAPTCHA evaluation failed` | Token expired / wrong action |
| 429 | quota exceeded | Hết credit hoặc rate limit |

---

## #6 POST /v1/video:batchAsyncGenerateVideoReferenceImages

**Domain:** `aisandbox-pa.googleapis.com`
**Auth:** Bearer + recaptchaContext (action=`VIDEO_GENERATION`)
**Mục đích:** Start video gen R2V mode (Reference-to-Video, không phải I2V)
**Async:** Trả ngay với `mediaId`, polling riêng để chờ xong

### Request
```http
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoReferenceImages
Authorization: Bearer ya29.A0AS3H6Nx...
Content-Type: text/plain;charset=UTF-8

{
  "mediaGenerationContext": {
    "batchId": "<UUID>",
    "audioFailurePreference": "BLOCK_SILENCED_VIDEOS"
  },
  "clientContext": {
    "projectId": "a7e6ab6c-...",
    "tool": "PINHOLE",
    "userPaygateTier": "PAYGATE_TIER_TWO",
    "sessionId": ";1714770191234",
    "recaptchaContext": {
      "token": "<recaptcha_token>",
      "applicationType": "RECAPTCHA_APPLICATION_TYPE_WEB"
    }
  },
  "requests": [{
    "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
    "seed": 24911,
    "textInput": {
      "structuredPrompt": {
        "parts": [{ "text": "Camera slowly pans left across the mountain valley" }]
      }
    },
    "videoModelKey": "veo_3_1_r2v_fast_landscape_ultra",
    "metadata": {},
    "referenceImages": [
      {
        "mediaId": "<mediaId từ uploadImage>",
        "imageUsageType": "IMAGE_USAGE_TYPE_ASSET"
      }
    ]
  }],
  "useV2ModelConfig": true
}
```

### Response 200
```json
{
  "media": [
    {
      "name": "<operationId — UUID>",
      "projectId": "a7e6ab6c-..."
    }
  ]
}
```

→ Extract: `media[0].name` = operationId dùng cho polling

### ⚠️ Field gotchas (đã waste nhiều thời gian)

| Sai | Đúng | Hậu quả nếu sai |
|---|---|---|
| `clientContext` lặp trong `requests[i]` | Chỉ ở top-level | 400 "Unknown name" |
| `request:` (số ít) | `requests:` (mảng) | 400 |
| `imageUsageType: 'ASSET'` | `'IMAGE_USAGE_TYPE_ASSET'` | 400 |
| `textInput: { text }` | `textInput: { structuredPrompt: { parts: [{text}] }}` | 400 |
| `videoModelKey: 'VEO_3_1_R2V'` | `'veo_3_1_r2v_fast_landscape_ultra'` (lowercase) | 400 |
| Action `'GENERATE_VIDEO_REFERENCES_AND_STYLE'` | `'VIDEO_GENERATION'` | reCAPTCHA fail |
| Endpoint `:batchAsyncGenerateVideoStartAndEndImage` | `:batchAsyncGenerateVideoReferenceImages` | 400 |

### Modes — chọn endpoint khác cho use case khác
| Endpoint | Use case |
|---|---|
| `batchAsyncGenerateVideoReferenceImages` | R2V (đang dùng): refs → video |
| `batchAsyncGenerateVideoStartAndEndImage` | I2V có start/end frame |
| `batchAsyncGenerateVideoExtendVideo` | Extend video có sẵn |
| `batchAsyncGenerateVideoCameraControl` | Camera control I2V |
| `batchAsyncGenerateVideoObjectInsertion` | Insert object vào scene |

---

## #7 POST /v1/video:batchCheckAsyncVideoGenerationStatus

**Domain:** `aisandbox-pa.googleapis.com`
**Auth:** Bearer + recaptchaContext (action=`VIDEO_GENERATION`, có thể dùng lại)
**Mục đích:** Polling status của 1 hoặc nhiều video gen operations

### Request
```http
POST https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus
Authorization: Bearer ya29.A0AS3H6Nx...
Content-Type: text/plain;charset=UTF-8

{
  "media": [
    { "name": "<operationId>", "projectId": "..." }
  ]
}
```

### Response 200 — đang gen
```json
{
  "media": [{
    "name": "<operationId>",
    "projectId": "...",
    "mediaMetadata": {
      "createTime": "2026-05-03T03:13:48.936212Z",
      "mediaStatus": {
        "mediaGenerationStatus": "MEDIA_GENERATION_STATUS_RUNNING"
      }
    }
  }]
}
```

### Response 200 — xong
```json
{
  "remainingCredits": 24920,
  "media": [{
    "name": "<operationId>",
    "projectId": "...",
    "workflowId": "...",
    "workflowStepId": "CAE",
    "mediaMetadata": {
      "mediaStatus": {
        "mediaGenerationStatus": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
      },
      "requestData": { /* echo lại request gốc */ }
    },
    "video": {
      "generatedVideo": {
        "seed": 909656,
        "prompt": "...",
        "model": "veo_3_1_r2v_fast_landscape_ultra",
        "isLooped": false,
        "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE"
      },
      "dimensions": {},
      "operation": { "name": "<same as outer name>" }
    }
  }]
}
```

### Status enum
```
MEDIA_GENERATION_STATUS_PENDING
MEDIA_GENERATION_STATUS_RUNNING
MEDIA_GENERATION_STATUS_SUCCESSFUL  ← thành công
MEDIA_GENERATION_STATUS_FAILED      ← lỗi gen
MEDIA_GENERATION_STATUS_ERROR       ← lỗi system
```

### Polling pattern
```javascript
const deadline = Date.now() + 10 * 60 * 1000;     // max 10 phút
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 8000));    // 8s/lần
  const poll = await pollVideoStatus({ accessToken, mediaRefs });
  const item = poll.media[0];
  const status = item?.mediaMetadata?.mediaStatus?.mediaGenerationStatus;
  if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') break;
  if (/FAILED|ERROR/.test(status)) throw new Error('Video gen FAILED: ' + status);
}
```

### Notes
- `remainingCredits` chỉ xuất hiện khi response có ít nhất 1 successful — useful để monitor quota
- Polling trả về **không có URL playable** — phải gọi endpoint #3 riêng

---

## #8 GET <fifeUrl> (lh3.googleusercontent.com)

**Domain:** `lh3.googleusercontent.com`
**Auth:** Không cần (signed URL)
**Mục đích:** Tải PNG đã gen về

### Request
```http
GET https://lh3.googleusercontent.com/<signed_id>=s4096-rwa-v1
```

### Response 200
Binary PNG bytes (~500KB - 3MB tùy resolution).

### URL pattern
- Suffix `=s4096-rwa-v1` = max 4096px wide, RWA quality
- Có thể đổi sang `=s2048-rwa-v1` để giảm size
- Signed URL có TTL — fetch ngay sau khi gen xong, không lưu URL dài hạn

### Code pattern
```javascript
const res = await fetch(fifeUrl);
const buf = Buffer.from(await res.arrayBuffer());
await fs.writeFile(outputPath, buf);
```

---

## Discovered endpoints không dùng

Tìm thấy trong bundle nhưng chưa cần → ghi lại để mai mốt cần feature mở rộng:

```
# Video variants
POST /v1/video:batchAsyncGenerateVideoStartAndEndImage   # I2V có start+end frame
POST /v1/video:batchAsyncGenerateVideoExtendVideo        # Extend video có sẵn
POST /v1/video:batchAsyncGenerateVideoCameraControl      # Camera control I2V
POST /v1/video:batchAsyncGenerateVideoObjectInsertion    # Insert object vào scene

# Helpers
POST /v1/video:getVideoCreditStatus                      # Check credits còn lại
POST /v1/video:generateGif                               # Tạo GIF từ video
POST /v1/video:uploadUserImage                           # Upload riêng cho video pipeline
```

### Video model keys khác (từ bundle)
```
VEO_2_0_I2V, VEO_3_0_I2V_DISTILLED, VEO_3_0_I2V_12STEP,
VEO_3_1_I2V_12STEP, VEO_2_1_I2V_DISTILLED, VEO_2_1_START_END_IMAGE,
VEO_3_1_T2V_12STEP, VEO_3_1_T2V_12STEP_VISIBLE_WATERMARK,
VEO_3_0_T2V_DISTILLED, VEO_2_1_I2V, VEO_2_1_T2V, VEO_2_0_T2V,
VEO_1_5_I2V, VEO_1_5_T2V, VEO_ECHOS_POSE_CUSTOM_I2V, VEO_3
```
→ Đây có vẻ là **proto enum names** cũ. Real keys gửi qua API là **lowercase** dạng `veo_3_1_r2v_fast_landscape_ultra`. Cẩn thận khi thử model mới.

---

## Common gotchas

### 1. Headless mode = death
- `puppeteer.launch({ headless: true })` hoặc Playwright headless thuần → **reCAPTCHA score thấp** → 403 `PUBLIC_ERROR_UNUSUAL_ACTIVITY`
- **Solution**: chạy `headless: false` + Xvfb trên Linux server:
  ```bash
  xvfb-run -a -s "-screen 0 1440x900x24" node server/index.js
  ```

### 2. Per-page recaptcha session
- Mỗi page có "recaptcha session" riêng. Sau ~4 phút idle → session stale → token bị reject.
- **Solution**: code recycle page sau `API_PAGE_MAX_AGE_MS = 4 * 60 * 1000`.

### 3. Burst rate limit
- > 10 request đồng thời từ cùng session → reCAPTCHA score giảm → fail.
- **Solution**: cap concurrency với `p-limit(4)` (chưa implement).

### 4. Content-Type quirk
- Tất cả POST gen endpoint phải dùng `Content-Type: text/plain;charset=UTF-8`, KHÔNG phải `application/json`.
- Lý do: Google's proto-as-JSON serialization. Set sai → 400.

### 5. SessionId format
- `sessionId: ';' + Date.now()` — leading semicolon là cố ý, copy từ bundle.

### 6. Workflow IDs
- `workflowId` từ uploadImage response → optional pass vào gen request → có vẻ giúp track lineage. Skip cũng OK.

### 7. Project lifetime
- Mỗi gen tạo project mới → 1 user có hàng nghìn project trong UI Flow → KHÔNG cần cleanup, Google không complain.

---

## Decoder bundle

Bundle webpack có obfuscator `window.a1_0x40c4(idx)` — useful khi reverse-engineer:

```javascript
// Paste vào console của Flow page:
window.a1_0x40c4(0x23e2)  // → "https://aisandbox-pa.googleapis.com"
window.a1_0x40c4(0x2554)  // → "/v1"
window.a1_0x40c4(0x220)   // → "optional"
window.a1_0x40c4(0xf7b)   // → "video"
window.a1_0x40c4(0x178b)  // → "IMAGE_ASPECT_RATIO_UNSPECIFIED"
window.a1_0x40c4(0x1e02)  // → "Bearer "
```

Khi phát hiện endpoint mới trong bundle:
1. Tìm string obfuscated, dùng decoder lấy URL path
2. Tìm hàm xung quanh để xem body shape
3. Test bằng `test_capture_video.js` (intercept fetch + grecaptcha) trên 1 gen UI thật
4. Copy body shape vào code

---

## Test tools có sẵn

```bash
# Smoke test image gen (text + 1 asset + pair)
node server/test_api_flow.js [text|single|pair|all]

# Smoke test 4 concurrent
node server/test_api_parallel.js

# Smoke test video gen
node server/test_api_video.js

# Capture API requests từ UI gen thật (debugging)
node server/test_capture_video.js
# → Manual gen 1 video, Ctrl+C → flow_video_capture.json

# Re-login khi cookie expire
node server/test_login.js
```

---

## Lịch sử thay đổi

| Ngày | Thay đổi |
|---|---|
| 2026-05-02 | Initial reverse-engineer image gen từ bundle |
| 2026-05-02 | Refactor `flowAutomation.js` từ UI → API (1880 → 617 dòng) |
| 2026-05-03 | Capture được video gen body shape qua `test_capture_video.js` |
| 2026-05-03 | Phát hiện `media.getMediaUrlRedirect` là REST `?name=<id>`, không phải tRPC |
| 2026-05-03 | Confirm reCAPTCHA action = `VIDEO_GENERATION` |
| 2026-05-03 | Document hosting cần Xvfb (headless thuần fail) |
