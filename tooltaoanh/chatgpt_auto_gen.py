import os
import time
from playwright.sync_api import sync_playwright

PROMPT = """IMPORTANT:
The uploaded image is the ONE AND ONLY reference.

This is a CLEANUP + SITE RESET task.

====================================================
PRIMARY OBJECTIVE
====================================================

Transform the messy construction area into a CLEAN, EMPTY, FINISHED BASE SURFACE.

The result must look like:
- a completed, flat ground ready for landscaping or construction
- clean, minimal, professional
- no temporary or messy elements

====================================================
ABSOLUTE CONSTRAINTS — ZERO TOLERANCE
====================================================

DO NOT CHANGE:
- house architecture (walls, windows, doors, columns)
- stairs, steps, tiles, edges
- camera position, angle, perspective, framing
- overall spatial layout

DO NOT ADD:
- plants
- furniture
- decorations
- new design elements

====================================================
STRICT REMOVAL — COMPLETE CLEANUP
====================================================

Remove ALL construction-related elements:

- soil piles, uneven dirt
- plastic covers, tarps
- tools, wood planks, boards
- pipes, cables, hoses
- debris, trash, dust
- temporary materials
- construction marks or stains

The area must be completely cleared.

====================================================
GROUND RECONSTRUCTION (CRITICAL)
====================================================

Rebuild the ground area into:

- a flat, continuous surface
- clean and level geometry
- clearly defined edges
- aligned with surrounding steps and borders

Surface options (choose most realistic based on context):
- compacted clean soil
- smooth concrete base
- neutral stone base layer

NO:
- holes
- bumps
- broken surfaces
- messy textures

====================================================
REALISM REQUIREMENTS
====================================================

- ultra photorealistic
- natural lighting consistent with the scene
- physically believable materials
- clean, sharp, high-end residential look
- no CGI artifacts
- no blur, no noise

====================================================
FINAL RESULT
====================================================

The scene must feel like:
- construction has been fully cleaned up
- site is professionally prepared
- ready for the next phase (landscape or koi pond build)"""

def automate_chatgpt(image_path):
    if not os.path.exists(image_path):
        print(f"Lỗi: Không tìm thấy ảnh tại {image_path}")
        return

    profile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_profile')
    output_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'master_result_{int(time.time())}.png')

    print("Khởi động Playwright Tích Hợp Đa Phân Cấp...")
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            viewport={'width': 1280, 'height': 800},
            args=['--disable-blink-features=AutomationControlled'],
            accept_downloads=True
        )
            
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto('https://chatgpt.com')
        page.wait_for_selector('#prompt-textarea', timeout=30000)
        time.sleep(2)
        
        # 1. SETUP TẠO ẢNH
        try:
            chat_input = page.locator('#prompt-textarea')
            chat_input.click()
            time.sleep(0.5)
            chat_input.evaluate("node => node.innerHTML = ''")
            page.keyboard.insert_text("/")
            time.sleep(1.5)
            tao_hinh_anh = page.get_by_text("Tạo hình ảnh", exact=False)
            if tao_hinh_anh.count() > 0:
                tao_hinh_anh.first.click()
            else:
                page.keyboard.press("Backspace")
        except:
            pass

        # 2. UPLOAD ẢNH LOCAL
        print(f"-> Đang bốc ảnh {os.path.basename(image_path)} quăng lên web...")
        try:
            file_input = page.locator('#upload-photos')
            if file_input.count() > 0:
                file_input.set_input_files(image_path)
            else:
                page.locator('input[type="file"]').first.set_input_files(image_path)
        except:
            pass
        time.sleep(5)
        
        # 3. NHẬP LỆNH DỌN DẸP
        print("-> Đang gõ lệnh dọn sạch công trường...")
        try:
            chat_input = page.locator('#prompt-textarea')
            chat_input.click()
            page.keyboard.insert_text(PROMPT)
            time.sleep(1)
        except:
            pass
            
        # ================= LƯU TRẠNG THÁI HIỆN TẠI TRƯỚC KHI GỬI =================
        # Đếm số lượng Nút "Chỉnh sửa" hiện tại đang có trên màn hình
        edit_count_before = page.evaluate('''() => {
            let count = 0;
            let allNodes = document.querySelectorAll('*');
            for (let i = allNodes.length - 1; i >= 0; i--) {
                let text = allNodes[i].textContent;
                if (text && (text.trim() === "Chỉnh sửa" || text.trim() === "Edit") && allNodes[i].children.length <= 1) {
                    count++;
                }
            }
            return count;
        }''')
        
        # 4. GỬI
        print("-> Cất cánh! Đã bấm Submit...")
        page.locator('#prompt-textarea').focus()
        page.keyboard.press("Enter")
        
        # =========================================================================
        # LIÊN HIỆP THEO DÕI & TẢI XUỐNG SIÊU CAO CẤP
        # =========================================================================
        print("\n" + "="*50)
        print("⏳ ĐANG CHỜ AI HOẠT ĐỘNG. ANH CỨ THẢ TAY RA NHÉ...")
        print(f"-> Ghi chú tàng hình: Đang có {edit_count_before} mốc 'Chỉnh sửa' cũ.")
        print("="*50 + "\n")
        
        try:
            time.sleep(5)
            # Theo dõi DALL-E bằng Mắt Thường: Chờ Tín Hiệu Nút "Chỉnh sửa" sinh sôi nảy nở thêm 1
            page.wait_for_function(f'''() => {{
                let count = 0;
                let allNodes = document.querySelectorAll('*');
                for (let i = allNodes.length - 1; i >= 0; i--) {{
                    let text = allNodes[i].textContent;
                    if (text && (text.trim() === "Chỉnh sửa" || text.trim() === "Edit") && allNodes[i].children.length <= 1) {{
                        count++;
                    }}
                }}
                return count > {edit_count_before};
            }}''', timeout=180000)
            
            print("✅ BẮT SÓNG ĐƯỢC ẢNH VỪA ĐẺ RA RỒI! Kích hoạt tiến trình săn ngầm (chờ 10s fix load ảnh)...")
            time.sleep(10) 
            
            download_success = False

            # PHƯƠNG ÁN A: Tải qua UI Click "Chỉnh Sửa" Landmark (cách anh dặn dò)
            try:
                print("Phương Án A: Rà rút Download sát vách nút Chỉnh Sửa...")
                clicked = False
                with page.expect_download(timeout=10000) as download_info:
                    clicked = page.evaluate('''() => {
                        let allNodes = document.querySelectorAll('*');
                        let editNode = null;
                        for (let i = allNodes.length - 1; i >= 0; i--) {
                            let text = allNodes[i].textContent;
                            if (text && (text.trim() === "Chỉnh sửa" || text.trim() === "Edit")) {
                                if (allNodes[i].children.length <= 1) {
                                    editNode = allNodes[i]; break;
                                }
                            }
                        }
                        if (!editNode) return false;
                        let container = editNode.parentElement;
                        while (container && container !== document.body) {
                            let buttons = Array.from(container.querySelectorAll('button, a'));
                            if (buttons.length >= 2 && container.querySelector('svg')) {
                                let dlBtn = buttons.find(b => b !== editNode && !editNode.contains(b) && !b.contains(editNode));
                                if (dlBtn) { dlBtn.click(); return true; }
                            }
                            container = container.parentElement;
                        }
                        return false;
                    }''')
                if clicked:
                    dl = download_info.value
                    dl.save_as(output_image_path)
                    print(f"🎉 SUCCESSS! LƯU TRỮ VỀ HỆ THỐNG TRỰC TIẾP TỪ GIAO DIỆN XONG: {output_image_path}")
                    download_success = True
            except:
                pass
                
            # PHƯƠNG ÁN B: Data Fetch
            if not download_success:
                print("-> Phương Án A hụt định vị, bật Phương Án B: Bẻ Khóa URL Blob xả về rễ máy tính...")
                img_src = page.evaluate('''() => {
                    let imgs = Array.from(document.querySelectorAll('img'));
                    let validImgs = imgs.filter(img => 
                        img.src && !img.src.includes('avatar') && !img.src.includes('logo') && img.width > 200
                    );
                    if (validImgs.length > 0) return validImgs[validImgs.length - 1].src;
                    return null;
                }''')
                
                if img_src:
                    with page.expect_download(timeout=15000) as download_info:
                        page.evaluate(f'''async () => {{
                            const res = await fetch("{img_src}");
                            const blob = await res.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = "master_pull.png";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(blobUrl);
                        }}''')
                    dl = download_info.value
                    dl.save_as(output_image_path)
                    print("\n" + "★"*50)
                    print(f"🎉 TRỢ THỦ PHƯƠNG TRÌNH B SUCCESSS! HOÀN THIỆN ĐÓNG GÓI OUTPUT BẤT BẠI: {output_image_path}")
                    print("★"*50 + "\n")
                else:
                    print("❌ Thua, thẻ ảnh bị giấu quá kĩ.")

        except Exception as e:
            print("❌ LỖI HỆ THỐNG Ở QUY TRÌNH CHỜ/TẢI:", str(e))
            
        print("\n🔔 HOÀN TRẢ TRÌNH DUYỆT. Tắt cửa sổ dòng lệnh bằng Ctrl+C khi xong.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            browser.close()

if __name__ == "__main__":
    image_to_process = "/Users/bephi/tooltaoanh/d14ac998-38b8-430c-85bb-53e475cecdf8.jpeg"
    automate_chatgpt(image_to_process)
