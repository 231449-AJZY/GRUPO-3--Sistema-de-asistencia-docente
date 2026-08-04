import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_supervisor_alerts_tests():
    """Test the recent alerts panel on the Supervisor dashboard.

    Cases:
    1. Verify alerts appear in reverse chronological order.
    2. Verify alert icons (color) correspond to severity.
    3. Verify "Ver todas" button navigates to full alerts history.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # ---- Login (adjust credentials if needed) ----
        driver.get("http://44.193.208.43")
        username_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']"))
        )
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        time.sleep(3)

        # ---- Navigate to Supervisor dashboard ----
        driver.get("http://44.193.208.43/login/PanelSupervisor")
        time.sleep(2)

        # ---- Case 3.1: Alerts order ----
        alerts = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.alert-item")))
        if alerts:
            timestamps = [a.get_attribute('data-timestamp') for a in alerts]
            if timestamps == sorted(timestamps, reverse=True):
                print("[OK] Alerts are ordered newest first.")
            else:
                print("[FAIL] Alerts ordering is incorrect.")
        else:
            print("[FAIL] No alerts found on panel.")

        # ---- Case 3.2: Icon severity ----
        severity_map = {"rojo": "high", "naranja": "medium", "azul": "low"}
        for alert in alerts:
            icon = alert.find_element(By.CSS_SELECTOR, "i.alert-icon")
            classes = icon.get_attribute('class')
            if any(color in classes for color in severity_map):
                continue
            else:
                print("[FAIL] Alert icon does not match expected severity colors.")
                break
        else:
            print("[OK] All alert icons match severity colors.")

        # ---- Case 3.3: "Ver todas" button ----
        view_all_btn = driver.find_element(By.CSS_SELECTOR, "button#view-all-alerts")
        view_all_btn.click()
        time.sleep(2)
        if "historico" in driver.current_url.lower() or "alerts" in driver.current_url.lower():
            print("[OK] 'Ver todas' navigates to full alerts history.")
        else:
            print("[FAIL] 'Ver todas' navigation failed.")

    except Exception as e:
        print(f"\nError during Supervisor Alerts tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_supervisor_alerts_tests()
