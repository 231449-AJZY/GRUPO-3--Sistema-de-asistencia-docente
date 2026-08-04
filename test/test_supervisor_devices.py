import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_supervisor_devices_tests():
    """Test the biometric devices monitoring panel on the Supervisor dashboard.

    Cases:
    1. Verify that a device marked as "En línea" appears with the correct status indicator.
    2. Simulate a device disconnect (placeholder button) and check that the status changes to "Atención" or "Desconectado".
    3. Verify that the "Sincronizado" timestamp updates after a simulated ping.
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

        # ---- Case 5.1: Verify online device status ----
        # Placeholder selector for a device row; adjust according to real DOM
        device_row = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "tr.device-row[data-status='online']")))
        status_label = device_row.find_element(By.CSS_SELECTOR, "span.device-status").text.lower()
        if "en línea" in status_label or "online" in status_label:
            print("[OK] Device appears with 'En línea' status.")
        else:
            print("[FAIL] Device online status not displayed correctly.")

        # ---- Case 5.2: Simulate disconnect and verify status change ----
        # Assume there is a button to simulate disconnect for the selected device
        simulate_btn = device_row.find_element(By.CSS_SELECTOR, "button.simulate-disconnect")
        simulate_btn.click()
        time.sleep(3)  # wait for UI to update
        new_status = device_row.find_element(By.CSS_SELECTOR, "span.device-status").text.lower()
        if any(term in new_status for term in ["desconectado", "atención", "offline"]):
            print("[OK] Device status updated to 'Desconectado' or 'Atención' after simulation.")
        else:
            print("[FAIL] Device status did not change after disconnect simulation.")

        # ---- Case 5.3: Verify sync timestamp updates ----
        sync_label = device_row.find_element(By.CSS_SELECTOR, "span.device-sync-time")
        initial_timestamp = sync_label.get_attribute('data-timestamp')
        # Simulate a ping/update (placeholder button)
        ping_btn = device_row.find_element(By.CSS_SELECTOR, "button.simulate-ping")
        ping_btn.click()
        time.sleep(2)
        updated_timestamp = sync_label.get_attribute('data-timestamp')
        if updated_timestamp != initial_timestamp:
            print("[OK] 'Sincronizado' timestamp updated after simulated ping.")
        else:
            print("[FAIL] Sync timestamp did not change after ping simulation.")

    except Exception as e:
        print(f"\nError during Supervisor Devices tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_supervisor_devices_tests()
