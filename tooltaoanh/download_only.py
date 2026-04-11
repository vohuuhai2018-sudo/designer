import os
import time
from playwright.sync_api import sync_playwright

def test_download_only(url):
    profile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chatgpt_profile')
    output_image_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'tested_download_{int(time.time())}.png')

    print("Khởi động Playwright để test logic tải ảnh...")
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            viewport={'width': 1280, 'height': 800},
            args=['--disable-blink-features=AutomationControlled'],
            accept_downloads=True
        )
            
        page = browser.pages[0] if browser.pages else browser.new_page()
        print(f"Đang truy cập vào chat cũ: {url} ...")
        page.goto(url)
        
        # Đợi trang được load ổn định
        time.sleep(5)
        
        print("Đang quét DOM để tìm nút 'Chỉnh sửa' làm mốc tọa độ...")
        
        try:
            # Thuật toán siêu quét DOM theo anh gợi ý:
            # 1. Tìm text "Chỉnh sửa"
            # 2. Ngược lên trên div cha
            # 3. Kéo nút button số 2 (là svg download icon) ra và ép click qua expect_download
            
            clicked = False
            
            with page.expect_download(timeout=15000) as download_info:
                clicked = page.evaluate('''() => {
                    // Bước 1: Quét lấy thẻ sát rạt chứa text Chỉnh sửa
                    let allNodes = document.querySelectorAll('*');
                    let editNode = null;
                    
                    for (let i = allNodes.length - 1; i >= 0; i--) {
                        let text = allNodes[i].textContent;
                        if (text && (text.includes("Chỉnh sửa") || text.includes("Edit"))) {
                            // Ưu tiên thẻ lõi (thường là button hoặc span), không duyệt mấy thẻ div to bọc ngoài
                            if (allNodes[i].children.length <= 1) {
                                editNode = allNodes[i];
                                break; // Bức ảnh ở dưới cùng form chat nên bọc từ dưới lên là chuẩn nhất
                            }
                        }
                    }
                    
                    if (!editNode) return false;
                    
                    // Bước 2: Truy vết lên thẻ mẹ bọc cái thanh Menu đen mờ
                    let container = editNode.parentElement;
                    while (container && container !== document.body) {
                        let buttons = Array.from(container.querySelectorAll('button, a'));
                        
                        // Nếu thẻ mẹ này bọc ôm >=2 nút, và có SVG (Nút kế bên = nút share/download) 
                        // Thì CHỐT HẠ ĐÂY LÀ VÙNG CHỨA.
                        if (buttons.length >= 2 && container.querySelector('svg')) {
                            
                            // Nút đó là nút nằm chung mâm nhưng không phải nó
                            let downloadBtn = buttons.find(b => b !== editNode && !editNode.contains(b) && !b.contains(editNode));
                            
                            if (downloadBtn) {
                                downloadBtn.click();
                                return true;
                            }
                        }
                        container = container.parentElement;
                    }
                    return false;
                }''')
                
            if clicked:
                print("✅ TÌM THẤY! Đã mô phỏng click chọt đúng vào cái Icon Nút Bấm bên cạnh chữ 'Chỉnh sửa'.")
                dl = download_info.value
                dl.save_as(output_image_path)
                print("\n" + "★"*50)
                print(f"🎉 SUCCESSS! LƯU TRỮ NATIVE QUA NÚT CỦA BẢN CHỮ KÍ CHATGPT THÀNH CÔNG!")
                print(f"-> Nơi cất file: {output_image_path}")
                print("★"*50 + "\n")
            else:
                print("❌ FAIL: Tìm thấy chữ Chỉnh Sửa nhưng không dò ra được cái hình SVG nút kế bên để bấm.")
                raise Exception("Cannot click Native Download Button")
                
        except Exception as e:
            print("⚠️ CẢNH BÁO DỘI NGƯỢC XUỐNG KẾ HOẠCH B:", e)
            print("Thử phương pháp Fallback: Ép trình duyệt Fetch Link...")
            
            try:
                img_src = page.evaluate('''() => {
                    let imgs = Array.from(document.querySelectorAll('img'));
                    let validImgs = imgs.filter(img => 
                        img.src && !img.src.includes('avatar') && !img.src.includes('logo') && img.width > 200
                    );
                    if (validImgs.length > 0) return validImgs[validImgs.length - 1].src;
                    return null;
                }''')
                
                if img_src:
                    print(f"-> Thấy Link gốc: {img_src[:60]}...")
                    with page.expect_download(timeout=15000) as download_info:
                        page.evaluate(f'''async () => {{
                            const res = await fetch("{img_src}");
                            const blob = await res.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = "generated_fallback.png";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(blobUrl);
                        }}''')
                    dl = download_info.value
                    dl.save_as(output_image_path)
                    print(f"🎉 SUCCESSS! Đã kéo được tấm hình xuống bằng ByPass Data Fetch: {output_image_path}")
            except Exception as fe:
                print("❌ Fallback cũng khóc nốt:", fe)

        try:
            print("\n🔔 DONE! Giữ Browser luôn mở để anh lôi vào tab khác check. (Bấm Ctrl+C để tắt)")
            while True: time.sleep(1)
        except KeyboardInterrupt: pass
        finally: browser.close()

if __name__ == "__main__":
    # Link đoạn chat nháp đã gen xong theo yêu cầu của anh
    url_to_test = "https://chatgpt.com/c/69d88f16-4630-839c-83a2-ae2db4f33cf7"
    test_download_only(url_to_test)
