#!/usr/bin/env python3
"""
compose_base.py — Stage 2 của pipeline tooltaoanh.

Đầu vào : master_result_*.png (từ stage 1 chatgpt_auto_gen.py)
Xử lý   : tự detect zones (pond / nước / kè / thác / cảnh / cá)
         → cutout assets từ Tai nguyen/ bằng rembg (local ONNX)
         → composite kiểu "cắt dán" thuần pixel (OpenCV + Pillow)
Đầu ra  : base_final_<timestamp>.png

KHÔNG dùng ChatGPT. KHÔNG AI repaint. Chỉ cắt và dán.
"""

import argparse
import random
import time
from pathlib import Path

import cv2
import numpy as np

# ============================================================================
# CONFIG — tunables
# ============================================================================

SCRIPT_DIR   = Path(__file__).resolve().parent
RESOURCE_DIR = SCRIPT_DIR / "Tai nguyen"
CACHE_DIR    = RESOURCE_DIR / ".cache"

ASSET_SUBDIRS = {
    "THÁC": ("THÁC", (".png", ".jpg", ".jpeg")),
    "CÁ":   ("CÁ",   (".png", ".jpg", ".jpeg")),
    "CẢNH": ("CẢNH", (".png", ".jpg", ".jpeg")),
    "KÈ":   ("KÈ",   (".png", ".jpg", ".jpeg")),
    "NƯỚC": ("NƯỚC", (".jpg", ".jpeg", ".png")),
}

FISH_COUNT        = 14
FISH_SCALE_FRAC   = 0.055    # cá ≈ 5.5 % chiều rộng hồ (nhỏ gọn)
FISH_ALPHA        = 0.82     # hơi trong → gợi cảm giác ngập nước
KE_THICKNESS_PX   = 28
CANH_RADIUS_FRAC  = 0.24
CANH_FILL_FRAC    = 0.95     # cảnh phủ bao nhiêu % mask bounding box
THAC_WIDTH_FRAC   = 0.28
THAC_HEIGHT_FRAC  = 1.0      # nhân với width thác → kéo lên tường
THAC_OVERLAP_PX   = 20       # đáy thác đè xuống mặt nước px
WATER_OPACITY     = 0.92     # để lộ nhẹ base bên dưới
FEATHER_PX        = 3
KMEANS_K          = 5

# BGR debug colors — khớp với bố cục .jpeg (xanh dương, tím, xanh lá, đỏ, vàng)
DEBUG_COLORS = {
    "NƯỚC": (255, 80, 0),
    "KÈ":   (200, 0, 180),
    "CẢNH": (0, 200, 0),
    "THÁC": (0, 0, 255),
    "CÁ":   (0, 255, 255),
}


def log(msg: str) -> None:
    print(f"[compose] {msg}", flush=True)


# ============================================================================
# I/O helpers — tolerant to Unicode paths (Tai nguyen, bố cục, etc.)
# ============================================================================

def imread_unicode(path, flags=cv2.IMREAD_UNCHANGED):
    data = np.fromfile(str(path), dtype=np.uint8)
    img = cv2.imdecode(data, flags)
    if img is None:
        raise IOError(f"Không đọc được ảnh: {path}")
    return img


def imwrite_unicode(path, img) -> None:
    ext = Path(path).suffix.lower() or ".png"
    ok, buf = cv2.imencode(ext, img)
    if not ok:
        raise IOError(f"Lỗi encode: {path}")
    buf.tofile(str(path))


def to_bgra(img):
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    if img.shape[2] == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    return img


def find_base_image(explicit: str | None):
    if explicit:
        p = Path(explicit)
        if not p.exists():
            raise FileNotFoundError(p)
        return p
    candidates = sorted(
        SCRIPT_DIR.glob("master_result_*.png"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            "Không tìm thấy master_result_*.png. Chạy stage 1 (chatgpt_auto_gen.py) trước."
        )
    return candidates[0]


def find_asset(category: str) -> Path:
    subdir_name, exts = ASSET_SUBDIRS[category]
    subdir = RESOURCE_DIR / subdir_name
    if not subdir.exists():
        raise FileNotFoundError(f"Thiếu thư mục {subdir}")
    all_matches = []
    for ext in exts:
        all_matches.extend(sorted(subdir.glob(f"*{ext}")))
    if not all_matches:
        raise FileNotFoundError(f"Không có asset trong {subdir}")
    # KÈ: ưu tiên file có nhiều hoa (12_44_41) hơn file 12_43_04
    if category == "KÈ":
        for m in all_matches:
            if "44_41" in m.name:
                return m
    return all_matches[0]


def cutout_asset(path: Path):
    """rembg background removal with file cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{path.stem}_cutout.png"
    if cache_file.exists() and cache_file.stat().st_mtime >= path.stat().st_mtime:
        return to_bgra(imread_unicode(cache_file))

    log(f"  rembg cutout: {path.name} (lần đầu chậm, sẽ cache)")
    from rembg import remove  # lazy import

    with open(path, "rb") as f:
        raw = f.read()
    out = remove(raw)
    arr = np.frombuffer(out, dtype=np.uint8)
    cut = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if cut is None:
        raise RuntimeError(f"rembg lỗi: {path}")
    cut = to_bgra(cut)
    cv2.imencode(".png", cut)[1].tofile(str(cache_file))
    return cut


# ============================================================================
# Alpha paste & feather
# ============================================================================

def alpha_paste(canvas, overlay, x, y, extra_mask=None):
    """Paste BGRA overlay at (x, y) onto BGRA canvas; overlay alpha × extra_mask."""
    oh, ow = overlay.shape[:2]
    H, W = canvas.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + ow), min(H, y + oh)
    if x0 >= x1 or y0 >= y1:
        return
    ox0, oy0 = x0 - x, y0 - y
    ox1, oy1 = ox0 + (x1 - x0), oy0 + (y1 - y0)

    roi = canvas[y0:y1, x0:x1]
    over = overlay[oy0:oy1, ox0:ox1]

    a = over[:, :, 3:4].astype(np.float32) / 255.0
    if extra_mask is not None:
        m = extra_mask[y0:y1, x0:x1].astype(np.float32) / 255.0
        a = a * m[:, :, None]

    roi[:, :, :3] = (
        over[:, :, :3].astype(np.float32) * a
        + roi[:, :, :3].astype(np.float32) * (1.0 - a)
    ).astype(np.uint8)
    roi[:, :, 3] = np.maximum(roi[:, :, 3], (a[:, :, 0] * 255).astype(np.uint8))
    canvas[y0:y1, x0:x1] = roi


def feather(mask, px=FEATHER_PX):
    if px <= 0:
        return mask
    k = px * 2 + 1
    return cv2.GaussianBlur(mask, (k, k), 0)


# ============================================================================
# AUTO LAYOUT DETECTION
# ============================================================================

def detect_pond_mask(base_bgr):
    """
    Phát hiện vùng mặt bằng phẳng trước cửa nhà bằng k-means trên LAB.
    Trả mask uint8 (0 / 255).
    """
    H, W = base_bgr.shape[:2]
    lab = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2LAB)
    blurred = cv2.GaussianBlur(lab, (9, 9), 0)

    # Chỉ xét phần dưới (ground zone)
    roi_top = int(H * 0.32)
    roi = blurred[roi_top:, :, :]
    Z = roi.reshape(-1, 3).astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(
        Z, KMEANS_K, None, criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    labels = labels.reshape(roi.shape[:2])

    h_roi, w_roi = labels.shape
    cx0, cx1 = int(w_roi * 0.18), int(w_roi * 0.82)
    cy0, cy1 = int(h_roi * 0.05), int(h_roi * 0.80)

    best_mask, best_score = None, -1.0
    for k in range(KMEANS_K):
        mk = (labels == k).astype(np.uint8)
        center_area = int(mk[cy0:cy1, cx0:cx1].sum())
        if center_area == 0:
            continue
        L, a_ch, b_ch = centers[k]
        # Ưu tiên gray-ish (a, b gần 128) và L đủ sáng (> 90)
        neutral = 1.0 / (1.0 + abs(a_ch - 128) + abs(b_ch - 128))
        brightness = max(0.0, (L - 60) / 180.0)
        score = center_area * (0.25 + neutral * 2.0 + brightness)
        if score > best_score:
            best_score = score
            best_mask = mk

    if best_mask is None:
        raise RuntimeError("Không detect được pond footprint (k-means rỗng)")

    full = np.zeros((H, W), dtype=np.uint8)
    full[roi_top:, :] = best_mask * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    full = cv2.morphologyEx(full, cv2.MORPH_CLOSE, kernel, iterations=3)
    full = cv2.morphologyEx(full, cv2.MORPH_OPEN, kernel, iterations=1)

    num, lbl, stats, _ = cv2.connectedComponentsWithStats(full, connectivity=8)
    if num <= 1:
        raise RuntimeError("Pond mask rỗng sau morph")
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    pond = (lbl == largest).astype(np.uint8) * 255

    # Fill internal holes + smooth contour
    contours, _ = cv2.findContours(pond, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(pond)
    for cnt in contours:
        if cv2.contourArea(cnt) < 500:
            continue
        # Simplify jagged edges
        epsilon = 0.004 * cv2.arcLength(cnt, True)
        smooth = cv2.approxPolyDP(cnt, epsilon, True)
        cv2.drawContours(filled, [smooth], -1, 255, thickness=cv2.FILLED)
    # Extra smoothing with large kernel
    smooth_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    filled = cv2.morphologyEx(filled, cv2.MORPH_CLOSE, smooth_k, iterations=2)
    filled = cv2.morphologyEx(filled, cv2.MORPH_OPEN, smooth_k, iterations=1)
    return filled


def detect_wall_horizon(base_bgr, above_y: int):
    """
    Tìm đường ngang gần nhất phía trên (bậc cửa / chân cột / window sill).
    Dùng để clamp đỉnh vùng THÁC.
    """
    H, W = base_bgr.shape[:2]
    gray = cv2.cvtColor(base_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 160)
    edges[above_y:, :] = 0

    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, 80,
        minLineLength=int(W * 0.22), maxLineGap=25,
    )
    if lines is None:
        return None
    best_y = None
    for x1, y1, x2, y2 in lines[:, 0]:
        if abs(y1 - y2) < 8 and 0 < y1 < above_y:
            if best_y is None or y1 > best_y:
                best_y = int(y1)
    return best_y


def derive_zones(base_bgr, pond_mask):
    """Từ pond footprint → 4 zone masks + fish positions + pond bbox."""
    H, W = pond_mask.shape

    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (KE_THICKNESS_PX * 2 + 1,) * 2
    )
    inner = cv2.erode(pond_mask, kernel)
    ke_mask = cv2.subtract(pond_mask, inner)
    nuoc_mask = inner.copy()

    # --- Fish scatter ---
    fish_region = cv2.erode(
        nuoc_mask,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)),
    )
    ys, xs = np.where(fish_region > 0)
    fish_positions: list[tuple[int, int]] = []
    if len(xs) > 0:
        rng = random.Random(42)
        min_dist = max(25, int(np.sqrt(len(xs) / max(FISH_COUNT, 1)) * 0.55))
        tries = 0
        while len(fish_positions) < FISH_COUNT and tries < FISH_COUNT * 80:
            i = rng.randrange(len(xs))
            px, py = int(xs[i]), int(ys[i])
            if all(
                (px - fx) ** 2 + (py - fy) ** 2 > min_dist ** 2
                for fx, fy in fish_positions
            ):
                fish_positions.append((px, py))
            tries += 1

    # --- Pond bbox ---
    contours, _ = cv2.findContours(
        pond_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    main = max(contours, key=cv2.contourArea)
    px, py, pw, ph = cv2.boundingRect(main)

    # --- CẢNH: đặt trong 1/4 trái của pond, không lấn tường/ra canvas ---
    canh_r = int(min(pw, ph) * CANH_RADIUS_FRAC * 1.4)
    canh_cx = px + max(canh_r // 2, int(pw * 0.12))
    canh_cy = py + ph // 2
    canh_cx = max(canh_r, min(W - canh_r, canh_cx))
    canh_cy = max(canh_r, min(H - canh_r, canh_cy))
    canh_mask = np.zeros_like(pond_mask)
    cv2.circle(canh_mask, (canh_cx, canh_cy), canh_r, 255, thickness=-1)
    # Chỉ giữ phần nửa trái (tránh lấn qua giữa hồ)
    left_clip = np.zeros_like(pond_mask)
    left_clip[:, : px + pw // 2] = 255
    canh_mask = cv2.bitwise_and(canh_mask, left_clip)

    # --- THÁC: rectangle sát mép trên hồ, kéo lên tường ---
    thac_w = int(pw * THAC_WIDTH_FRAC)
    thac_cx = px + pw // 2
    thac_bottom = py + 8

    ideal_top = max(0, thac_bottom - int(thac_w * THAC_HEIGHT_FRAC))
    horizon = detect_wall_horizon(base_bgr, thac_bottom)
    if horizon is not None and thac_bottom - horizon > 60:
        thac_top = max(ideal_top, horizon)
    else:
        thac_top = ideal_top

    thac_left = max(0, thac_cx - thac_w // 2)
    thac_right = min(W, thac_cx + thac_w // 2)
    thac_mask = np.zeros_like(pond_mask)
    thac_mask[thac_top:thac_bottom, thac_left:thac_right] = 255

    return (
        {"NƯỚC": nuoc_mask, "KÈ": ke_mask, "CẢNH": canh_mask, "THÁC": thac_mask},
        fish_positions,
        (int(px), int(py), int(pw), int(ph)),
    )


# ============================================================================
# MIMIC MODE — reverse-engineer zones từ base mẫu đẹp (base.jpg)
# ============================================================================

def extract_zones_from_reference(ref_path, target_shape):
    """
    Dùng base.jpg như reference → segment thành zones thực tế
    (nước, plants ring, thác, cá). Guarantee tỉ lệ thẩm mỹ = ref.
    """
    ref = imread_unicode(ref_path, cv2.IMREAD_COLOR)
    H, W = target_shape[:2]
    if ref.shape[:2] != (H, W):
        ref = cv2.resize(ref, (W, H), interpolation=cv2.INTER_LINEAR)
    hsv = cv2.cvtColor(ref, cv2.COLOR_BGR2HSV)

    k_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    k_big   = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))

    # --- 1. NƯỚC: turquoise/green tile ở giữa hồ ---
    water_raw = cv2.inRange(hsv, np.array([40, 80, 80]), np.array([95, 255, 255]))
    water_raw[: int(H * 0.5)] = 0                     # exclude wall/sky
    water_raw = cv2.morphologyEx(water_raw, cv2.MORPH_CLOSE, k_big, iterations=3)
    water_raw = cv2.morphologyEx(water_raw, cv2.MORPH_OPEN, k_big, iterations=2)
    num, lbl, stats, _ = cv2.connectedComponentsWithStats(water_raw, connectivity=8)
    if num > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        water_raw = (lbl == largest).astype(np.uint8) * 255
    # Convex hull để mặt nước kín
    cnts, _ = cv2.findContours(water_raw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    water = np.zeros_like(water_raw)
    if cnts:
        hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
        cv2.drawContours(water, [hull], -1, 255, thickness=cv2.FILLED)

    # --- 2. KÈ / plants ring: vành quanh hồ ---
    # Dùng dilate(water) \ water để đảm bảo ring sạch, bám sát hồ,
    # không lẫn nhiễu từ cửa sổ/bậc thang trong reference.
    if water.any():
        _xs = np.where(water > 0)[1]
        wpw = int(_xs.max() - _xs.min())
    else:
        wpw = 200
    ring_thickness = max(24, int(wpw * 0.09))
    ring_kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (ring_thickness * 2 + 1,) * 2
    )
    dilated_water = cv2.dilate(water, ring_kernel)
    plant = cv2.subtract(dilated_water, water)

    # --- 3. THÁC: khối đá nâu/tan cao ở back của hồ ---
    thac_hsv = cv2.inRange(hsv, np.array([5, 20, 60]), np.array([30, 200, 230]))
    # Restrict vùng: trên centroid của nước + centered ±30%
    ys, xs = np.where(water > 0)
    if len(xs) == 0:
        raise RuntimeError("Không detect được water từ reference")
    wx0, wx1 = int(xs.min()), int(xs.max())
    wy0 = int(ys.min())
    wcx = (wx0 + wx1) // 2
    wpw = wx1 - wx0
    thac_region = np.zeros_like(thac_hsv)
    tx0 = max(0, wcx - int(wpw * 0.35))
    tx1 = min(W, wcx + int(wpw * 0.35))
    ty0 = max(0, wy0 - int(wpw * 0.45))
    ty1 = min(H, wy0 + int(wpw * 0.12))
    thac_region[ty0:ty1, tx0:tx1] = 255
    thac = cv2.bitwise_and(thac_hsv, thac_region)
    thac = cv2.morphologyEx(thac, cv2.MORPH_CLOSE, k_small, iterations=3)
    num, lbl, stats, _ = cv2.connectedComponentsWithStats(thac, connectivity=8)
    if num > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        thac = (lbl == largest).astype(np.uint8) * 255
    # Convex hull để thác có hình khối đẹp
    cnts, _ = cv2.findContours(thac, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if cnts:
        hull = cv2.convexHull(max(cnts, key=cv2.contourArea))
        thac = np.zeros_like(thac)
        cv2.drawContours(thac, [hull], -1, 255, thickness=cv2.FILLED)

    # --- 4. CÁ: red saturated spots trong vùng nước ---
    koi = cv2.inRange(hsv, np.array([0, 130, 130]), np.array([12, 255, 255]))
    koi |= cv2.inRange(hsv, np.array([165, 130, 130]), np.array([179, 255, 255]))
    koi = cv2.bitwise_and(koi, water)
    koi = cv2.morphologyEx(koi, cv2.MORPH_OPEN,
                           cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    num, lbl, stats, cent = cv2.connectedComponentsWithStats(koi, connectivity=8)
    fish_positions: list[tuple[int, int]] = []
    for i in range(1, num):
        if stats[i, cv2.CC_STAT_AREA] > 60:
            fish_positions.append((int(cent[i][0]), int(cent[i][1])))
    if len(fish_positions) < 5:
        # Fallback: scatter đều trong vùng nước
        inner = cv2.erode(water, k_big, iterations=2)
        ys2, xs2 = np.where(inner > 0)
        if len(xs2) > 0:
            rng = random.Random(3)
            while len(fish_positions) < 8:
                i = rng.randrange(len(xs2))
                fish_positions.append((int(xs2[i]), int(ys2[i])))

    # --- 5. CẢNH (bonsai accent): fixed box ở góc trái-trên của hồ ---
    canh_mask = np.zeros_like(plant)
    cw = int(wpw * 0.32)
    ch = int(wpw * 0.48)
    cx0 = max(0, wx0 - int(wpw * 0.02))
    cy1 = max(0, wy0 + int(wpw * 0.05))
    cy0 = max(0, cy1 - ch)
    cx1 = min(W, cx0 + cw)
    canh_mask[cy0:cy1, cx0:cx1] = 255

    # --- Pond bbox ---
    pond = cv2.bitwise_or(water, plant)
    ys, xs = np.where(pond > 0)
    px, py = int(xs.min()), int(ys.min())
    pw, ph = int(xs.max() - px), int(ys.max() - py)

    return (
        {"NƯỚC": water, "KÈ": plant, "CẢNH": canh_mask, "THÁC": thac},
        fish_positions,
        (px, py, pw, ph),
    )


# ============================================================================
# MANUAL LAYOUT MODE — đọc màu từ ảnh bố cục vẽ tay
# ============================================================================

# HSV ranges (OpenCV: H 0-179)
LAYOUT_HSV_RANGES = {
    "THÁC": [((0, 110, 70), (10, 255, 255)),
             ((170, 110, 70), (179, 255, 255))],      # đỏ (wrap-around)
    "CẢNH": [((38, 70, 60), (85, 255, 255))],          # xanh lá
    "NƯỚC": [((95, 110, 70), (125, 255, 255))],        # xanh dương
    "CÁ":   [((20, 120, 150), (35, 255, 255))],        # vàng
    "KÈ":   [((128, 50, 60), (165, 255, 255))],        # tím/magenta
}


def _hsv_mask(hsv, ranges):
    mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lo, hi in ranges:
        mask |= cv2.inRange(hsv, np.array(lo, np.uint8), np.array(hi, np.uint8))
    return mask


def _fill_outline(outline_mask, min_area=500):
    """Close gaps + fill interior for outline-shaped masks."""
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    closed = cv2.morphologyEx(outline_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(outline_mask)
    for cnt in contours:
        if cv2.contourArea(cnt) < min_area:
            continue
        cv2.drawContours(filled, [cnt], -1, 255, thickness=cv2.FILLED)
    return filled


def extract_zones_from_layout(layout_path, target_shape):
    """
    Đọc bố cục vẽ tay → trả về (zones_dict, fish_positions, pond_bbox)
    với cùng kích thước target_shape (H, W) của base.
    """
    layout = imread_unicode(layout_path, cv2.IMREAD_COLOR)
    H, W = target_shape[:2]
    layout = cv2.resize(layout, (W, H), interpolation=cv2.INTER_LINEAR)
    hsv = cv2.cvtColor(layout, cv2.COLOR_BGR2HSV)

    raw = {name: _hsv_mask(hsv, rngs) for name, rngs in LAYOUT_HSV_RANGES.items()}

    # --- Các vùng outline → fill ---
    thac_mask = _fill_outline(raw["THÁC"])
    canh_mask = _fill_outline(raw["CẢNH"])
    nuoc_mask = _fill_outline(raw["NƯỚC"])

    # KÈ: ưu tiên fill từ purple closed loop; nếu vòng tím hở
    # (vẽ sát tường → không đóng), fallback dùng dilate(nước) \ nước
    purple_filled = _fill_outline(raw["KÈ"])
    # Check if purple actually filled a region (not just the outline line)
    purple_area = int((purple_filled > 0).sum())
    purple_raw_area = int((raw["KÈ"] > 0).sum())
    if purple_area > purple_raw_area * 1.8 and purple_area > nuoc_mask.sum() / 255 * 0.3:
        # Closed-loop fill worked
        pond_mask = cv2.bitwise_or(purple_filled, nuoc_mask)
        ke_mask = cv2.subtract(pond_mask, nuoc_mask)
    else:
        # Fallback: dilate water để tạo vành kè cố định
        log("  (vòng tím hở → dùng dilate(nước) làm KÈ)")
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (KE_THICKNESS_PX * 2 + 1,) * 2
        )
        dilated = cv2.dilate(nuoc_mask, kernel)
        ke_mask = cv2.subtract(dilated, nuoc_mask)
        # Cộng thêm nét tím thô để không mất đường viền anh vẽ
        ke_mask = cv2.bitwise_or(ke_mask, raw["KÈ"])
        pond_mask = cv2.bitwise_or(dilated, nuoc_mask)

    # --- Cá: mỗi chấm vàng = 1 vị trí ---
    fish_raw = raw["CÁ"]
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fish_raw = cv2.morphologyEx(fish_raw, cv2.MORPH_OPEN, kernel)
    num, _, stats, centroids = cv2.connectedComponentsWithStats(fish_raw, connectivity=8)
    fish_positions = []
    for i in range(1, num):
        if stats[i, cv2.CC_STAT_AREA] < 30:
            continue
        cx, cy = centroids[i]
        fish_positions.append((int(cx), int(cy)))

    # Pond bbox
    ys, xs = np.where(pond_mask > 0)
    if len(xs) == 0:
        raise RuntimeError("Không trích được pond mask từ bố cục (check HSV ranges)")
    px, py = int(xs.min()), int(ys.min())
    pw, ph = int(xs.max() - px), int(ys.max() - py)

    return (
        {"NƯỚC": nuoc_mask, "KÈ": ke_mask, "CẢNH": canh_mask, "THÁC": thac_mask},
        fish_positions,
        (px, py, pw, ph),
    )


def dump_debug_overlay(base_bgr, zones, fish_positions, out_path):
    overlay = base_bgr.copy()
    for name, mask in zones.items():
        color = DEBUG_COLORS[name]
        colored = np.full_like(base_bgr, color, dtype=np.uint8)
        m3 = (mask > 0)[:, :, None]
        overlay = np.where(
            m3, (overlay * 0.45 + colored * 0.55).astype(np.uint8), overlay
        )
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(overlay, cnts, -1, color, 4)
    for fx, fy in fish_positions:
        cv2.circle(overlay, (fx, fy), 9, DEBUG_COLORS["CÁ"], -1)
    imwrite_unicode(out_path, overlay)
    log(f"Debug overlay → {out_path.name}")


# ============================================================================
# COMPOSITING
# ============================================================================

def composite_water(canvas, nuoc_mask, water_path, pond_bbox):
    texture = to_bgra(imread_unicode(water_path))
    px, py, pw, ph = pond_bbox
    if pw <= 0 or ph <= 0:
        return
    resized = cv2.resize(texture, (pw, ph), interpolation=cv2.INTER_AREA)
    H, W = canvas.shape[:2]
    overlay = np.zeros((H, W, 4), dtype=np.uint8)
    overlay[py : py + ph, px : px + pw] = resized
    overlay[:, :, 3] = feather(nuoc_mask)
    alpha_paste(canvas, overlay, 0, 0)


def composite_ke(canvas, ke_mask, ke_cutout):
    """
    Vẽ kè đá bằng cách: tile crop nhỏ của rock từ asset dọc theo ring mask.
    Tránh stretch asset full canvas → vừa distort vừa để lộ nền đen.
    """
    H, W = canvas.shape[:2]

    # 1. Crop vùng có đá thật (loại bỏ nền đen + hoa) từ asset
    ah, aw = ke_cutout.shape[:2]
    alpha = ke_cutout[:, :, 3]
    if int((alpha > 30).sum()) == 0:
        log("  KÈ asset rỗng alpha, bỏ qua")
        return

    # 2. Resize asset giữ aspect ratio sao cho chiều cao ≈ 2× ke thickness
    target_h = KE_THICKNESS_PX * 3
    scale = target_h / ah
    tile_w = max(1, int(aw * scale))
    tile = cv2.resize(ke_cutout, (tile_w, target_h), interpolation=cv2.INTER_AREA)

    # 3. Tile theo chiều ngang full canvas
    texture = np.zeros((target_h, W, 4), dtype=np.uint8)
    x = 0
    while x < W:
        ww = min(tile_w, W - x)
        texture[:, x : x + ww] = tile[:, :ww]
        x += tile_w

    # 4. Lặp texture theo chiều dọc để phủ full canvas
    full_texture = np.tile(texture, (H // target_h + 2, 1, 1))[:H, :W]

    # 5. GIỮ alpha gốc của cutout, chỉ clip bằng ke_mask (không ghi đè)
    asset_alpha = full_texture[:, :, 3].astype(np.float32) / 255.0
    clip = feather(ke_mask).astype(np.float32) / 255.0
    combined = (asset_alpha * clip * 255).astype(np.uint8)
    full_texture[:, :, 3] = combined
    alpha_paste(canvas, full_texture, 0, 0)


def composite_canh(canvas, canh_mask, canh_cutout):
    ys, xs = np.where(canh_mask > 0)
    if len(xs) == 0:
        return
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    w, h = x1 - x0, y1 - y0
    ah, aw = canh_cutout.shape[:2]
    # Dùng scale LỚN hơn để phủ bounding box; không fit nhỏ xíu nữa.
    scale = max(w / aw, h / ah) * CANH_FILL_FRAC
    if scale <= 0:
        return
    nw, nh = max(1, int(aw * scale)), max(1, int(ah * scale))
    resized = cv2.resize(canh_cutout, (nw, nh), interpolation=cv2.INTER_AREA)
    # Anchor: center ngang, bottom chạm đáy mask (cây mọc từ đất)
    cx = x0 + (w - nw) // 2
    cy = y1 - nh + int(nh * 0.1)   # cho phép cây nhô lên khỏi mask 10 %
    alpha_paste(canvas, resized, cx, cy)


def composite_thac(canvas, thac_mask, thac_cutout):
    ys, xs = np.where(thac_mask > 0)
    if len(xs) == 0:
        return
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
    # Kéo đáy thác xuống để chân thác ngâm trong nước
    H_canvas = canvas.shape[0]
    y1 = min(H_canvas - 1, y1 + THAC_OVERLAP_PX)
    w = x1 - x0
    ah, aw = thac_cutout.shape[:2]

    shrink = int(w * 0.08)   # perspective: đỉnh hẹp hơn đáy ~16 %
    src = np.float32([[0, 0], [aw, 0], [aw, ah], [0, ah]])
    dst = np.float32(
        [
            [x0 + shrink, y0],
            [x1 - shrink, y0],
            [x1, y1],
            [x0, y1],
        ]
    )
    M = cv2.getPerspectiveTransform(src, dst)
    H, W = canvas.shape[:2]
    warped = cv2.warpPerspective(
        thac_cutout, M, (W, H),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    alpha_paste(canvas, warped, 0, 0)


def split_fish_sprites(fish_cutout):
    """
    Tách cá bằng cách tìm các vùng màu BÃO HÒA cao (cá koi đỏ/cam/trắng
    nổi bật trên nền). Sau đó erode mạnh để tách từng con, pick sprite
    dài nhất theo axis ratio (cá dài hơn rộng).
    """
    # Dùng saturation + value để tìm cá (tránh nền xám)
    bgr = fish_cutout[:, :, :3]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    val = hsv[:, :, 2]
    fish_mask = ((sat > 60) & (val > 100)).astype(np.uint8) * 255

    # Kết hợp với alpha có sẵn
    alpha = fish_cutout[:, :, 3]
    fish_mask = cv2.bitwise_and(fish_mask, alpha)

    # Erode mạnh để tách các con cá chồng lên nhau
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    eroded = cv2.morphologyEx(fish_mask, cv2.MORPH_OPEN, k, iterations=3)

    num, lbl, stats, _ = cv2.connectedComponentsWithStats(eroded, connectivity=8)
    sprites = []
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if area < 1200 or area > 15000:
            continue
        ratio = max(w, h) / max(1, min(w, h))
        if ratio < 1.4 or ratio > 4.5:   # cá có dáng thuôn
            continue
        # Dilate lại vùng để lấy full con cá (không chỉ phần core đã erode)
        comp = (lbl == i).astype(np.uint8) * 255
        comp = cv2.dilate(comp, k, iterations=3)
        ys, xs = np.where(comp > 0)
        if len(xs) == 0:
            continue
        bx0, bx1 = int(xs.min()), int(xs.max()) + 1
        by0, by1 = int(ys.min()), int(ys.max()) + 1
        crop = fish_cutout[by0:by1, bx0:bx1].copy()
        comp_crop = comp[by0:by1, bx0:bx1]
        crop[:, :, 3] = np.minimum(crop[:, :, 3], comp_crop)
        # Feather mép
        crop[:, :, 3] = cv2.GaussianBlur(crop[:, :, 3], (5, 5), 0)
        sprites.append(crop)

    if len(sprites) < 3:
        # Fallback: crop toàn asset nếu không tìm ra
        log(f"  (fish split yếu: {len(sprites)} sprites → dùng fallback CC thô)")
        _, binary = cv2.threshold(alpha, 100, 255, cv2.THRESH_BINARY)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, k, iterations=1)
        num, lbl, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
        for i in range(1, num):
            x, y, w, h, area = stats[i]
            if 1500 < area < 20000 and 40 < w < 250 and 20 < h < 160:
                crop = fish_cutout[y:y+h, x:x+w].copy()
                comp = (lbl[y:y+h, x:x+w] == i).astype(np.uint8) * 255
                crop[:, :, 3] = np.minimum(crop[:, :, 3], comp)
                sprites.append(crop)
    return sprites or [fish_cutout]


def composite_fish(canvas, fish_positions, fish_cutout, pond_bbox):
    sprites = split_fish_sprites(fish_cutout)
    _, _, pw, _ = pond_bbox
    target_w = max(32, int(pw * FISH_SCALE_FRAC))
    rng = random.Random(7)
    for fx, fy in fish_positions:
        sprite = sprites[rng.randrange(len(sprites))]
        sh, sw = sprite.shape[:2]
        scale = target_w / sw
        nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
        resized = cv2.resize(sprite, (nw, nh), interpolation=cv2.INTER_AREA)
        angle = rng.uniform(-55, 55)
        M = cv2.getRotationMatrix2D((nw / 2, nh / 2), angle, 1.0)
        rotated = cv2.warpAffine(
            resized, M, (nw, nh),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        )
        # Giảm độ mờ → cá như ngập dưới mặt nước
        rotated[:, :, 3] = (rotated[:, :, 3].astype(np.float32) * FISH_ALPHA).astype(np.uint8)
        alpha_paste(canvas, rotated, fx - nw // 2, fy - nh // 2)


# ============================================================================
# MAIN
# ============================================================================

def warp_zones_to_bbox(zones, fish_positions, src_bbox, dst_bbox, canvas_shape):
    """
    Scale + translate toàn bộ zones & fish_positions từ src_bbox → dst_bbox.
    Phục vụ mimic mode: giữ nguyên tỉ lệ thẩm mỹ từ reference mà vẫn khớp
    footprint hồ trong master_result.
    """
    H, W = canvas_shape[:2]
    sx, sy, sw, sh = src_bbox
    dx, dy, dw, dh = dst_bbox
    # Preserve aspect ratio. Cho phép pond cao hơn dst_bbox (tràn lên tường
    # phía trên — đó là nơi thác gắn sát vào). Scale upscale 1.4× so với fit
    # ngắn, nhưng clamp để pond không vượt khung hình.
    base_f = min(dw / max(1, sw), dh / max(1, sh))
    f = base_f * 1.45
    # clamp: đảm bảo warped bbox vẫn trong canvas
    max_f_h = (H - dy) / max(1, sh)
    f = min(f, max_f_h)
    new_w = sw * f
    new_h = sh * f
    dx_centered = dx + (dw - new_w) / 2.0
    dy_bottom = dy + dh - new_h
    M = np.array([[f, 0, dx_centered - sx * f],
                  [0, f, dy_bottom - sy * f]], dtype=np.float32)
    fx = fy = f
    dx, dy = dx_centered, dy_bottom
    sx_ref, sy_ref = src_bbox[0], src_bbox[1]
    warped = {
        name: cv2.warpAffine(
            mask, M, (W, H),
            flags=cv2.INTER_NEAREST, borderValue=0,
        )
        for name, mask in zones.items()
    }
    new_fish = []
    for px, py in fish_positions:
        nx = int(dx + (px - sx_ref) * fx)
        ny = int(dy + (py - sy_ref) * fy)
        if 0 <= nx < W and 0 <= ny < H:
            new_fish.append((nx, ny))
    # Compute actual warped pond bbox (could be smaller than dst_bbox)
    pond_any = np.zeros(canvas_shape[:2], np.uint8)
    for m in warped.values():
        pond_any = cv2.bitwise_or(pond_any, m)
    ys, xs = np.where(pond_any > 0)
    if len(xs) > 0:
        out_bbox = (int(xs.min()), int(ys.min()),
                    int(xs.max() - xs.min()), int(ys.max() - ys.min()))
    else:
        out_bbox = dst_bbox
    return warped, new_fish, out_bbox


def main():
    ap = argparse.ArgumentParser(description="Stage 2: local compositing từ master_result.")
    ap.add_argument("--base", help="master_result_*.png (mặc định: file mới nhất)")
    ap.add_argument("--layout", help="ảnh bố cục vẽ tay (nếu có → skip auto-detect)")
    ap.add_argument(
        "--mimic",
        help="base mẫu đẹp (vd: base.jpg) → reverse-engineer zones từ đây",
    )
    ap.add_argument("--output", help="output path")
    ap.add_argument(
        "--debug-zones",
        action="store_true",
        help="Chỉ dump overlay debug (không composite)",
    )
    args = ap.parse_args()

    base_path = find_base_image(args.base)
    log(f"Base: {base_path.name}")
    base = imread_unicode(base_path, cv2.IMREAD_COLOR)

    if args.mimic:
        log(f"Mimic reference: {Path(args.mimic).name}")
        src_zones, src_fish, src_bbox = extract_zones_from_reference(
            args.mimic, base.shape
        )
        # Geometric alignment: base.jpg và master_result là 2 khung hình khác nhau,
        # coords tuyệt đối không map trực tiếp được. Detect pond footprint trong
        # master_result rồi warp zones từ src_bbox → dst_bbox.
        log("Detect pond footprint trong master_result để align mimic zones…")
        dst_pond = detect_pond_mask(base)
        ys, xs = np.where(dst_pond > 0)
        dst_bbox = (int(xs.min()), int(ys.min()),
                    int(xs.max() - xs.min()), int(ys.max() - ys.min()))
        log(f"  src_bbox={src_bbox} → dst_bbox={dst_bbox}")
        zones, fish_positions, pond_bbox = warp_zones_to_bbox(
            src_zones, src_fish, src_bbox, dst_bbox, base.shape
        )
    elif args.layout:
        log(f"Layout (manual): {Path(args.layout).name}")
        zones, fish_positions, pond_bbox = extract_zones_from_layout(
            args.layout, base.shape
        )
    else:
        log("Detect pond footprint…")
        pond_mask = detect_pond_mask(base)
        log("Derive zones…")
        zones, fish_positions, pond_bbox = derive_zones(base, pond_mask)
    log(f"  pond bbox={pond_bbox}, fish={len(fish_positions)}")

    overlay_path = SCRIPT_DIR / f"debug_zones_{int(time.time())}.png"
    dump_debug_overlay(base, zones, fish_positions, overlay_path)

    if args.debug_zones:
        log("--debug-zones → dừng lại, không composite.")
        return

    log("Cutout assets (rembg, lần đầu sẽ chậm)…")
    thac_src = find_asset("THÁC")
    canh_src = find_asset("CẢNH")
    ke_src   = find_asset("KÈ")
    ca_src   = find_asset("CÁ")
    nuoc_src = find_asset("NƯỚC")

    thac_cut = cutout_asset(thac_src)
    canh_cut = cutout_asset(canh_src)
    ke_cut   = cutout_asset(ke_src)
    ca_cut   = cutout_asset(ca_src)
    # NƯỚC: giữ nguyên (texture nền), không cutout

    canvas = to_bgra(base)

    log("Paint NƯỚC…")
    composite_water(canvas, zones["NƯỚC"], nuoc_src, pond_bbox)
    log("Paint KÈ…")
    composite_ke(canvas, zones["KÈ"], ke_cut)
    log("Paint CẢNH…")
    composite_canh(canvas, zones["CẢNH"], canh_cut)
    log("Paint THÁC (perspective warp)…")
    composite_thac(canvas, zones["THÁC"], thac_cut)
    log("Paint CÁ…")
    composite_fish(canvas, fish_positions, ca_cut, pond_bbox)

    out_path = (
        Path(args.output)
        if args.output
        else SCRIPT_DIR / f"base_final_{int(time.time())}.png"
    )
    result = cv2.cvtColor(canvas, cv2.COLOR_BGRA2BGR)
    imwrite_unicode(out_path, result)
    log(f"🎉 DONE → {out_path}")


if __name__ == "__main__":
    main()
