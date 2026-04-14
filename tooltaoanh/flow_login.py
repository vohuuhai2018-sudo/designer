from playwright.sync_api import sync_playwright
import time
import os

def main():
    profile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flow_profile')
    print("Dữ liệu đăng nhập Google Flow sẽ được lưu tại:", profile_dir)
    
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=profile_dir,
            headless=False,
            viewport={'width': 1280, 'height': 800},
            args=['--disable-blink-features=AutomationControlled']
        )
        
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto('https://labs.google/fx/vi/tools/flow')
        
        print("\n" + "="*50)
        print("✅ ĐÃ MỞ TRÌNH DUYỆT THÀNH CÔNG!")
        print("-> Anh hãy đăng nhập Google trên cửa sổ trình duyệt vừa hiện lên.")
        print("-> Thông tin đăng nhập sẽ được lưu lại cho các lần chạy tool tự động sau này.")
        print("-> Cửa sổ này sẽ giữ mở trong 1 giờ để anh thong thả thao tác.")
        print("-> Khi đã đăng nhập thành công và thấy giao diện Flow, hãy báo em trên này nhé!")
        print("="*50 + "\n")
        
        try:
            # Hold browser open for 1 hour
            time.sleep(3600)
        except Exception:
            pass
        finally:
            browser.close()

if __name__ == "__main__":
    main()
