import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_biometria_tests():
    """Execute automated UI tests for the /Admin/biometria module.

    Test Cases:
    1. Add a new biometric device with valid and invalid IP formats.
    2. Simulate device connection loss and verify status updates.
    3. Trigger manual fingerprint synchronization and check confirmation.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # Login as administrator
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

        # ---------- Test Case 1.1: Add new device (valid IP) ----------
        driver.get("http://44.193.208.43/Admin/biometria")
        time.sleep(2)
        # Click "Add Device" button (placeholder selector)
        add_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button#add-device")))
        add_btn.click()
        # Fill form fields (replace selectors with actual ones)
        ip_input = wait.until(EC.presence_of_element_located((By.NAME, "ip_address")))
        mac_input = driver.find_element(By.NAME, "mac_address")
        location_input = driver.find_element(By.NAME, "location")
        ip_input.clear()
        ip_input.send_keys("192.168.1.50")
        mac_input.clear()
        mac_input.send_keys("AA:BB:CC:DD:EE:FF")
        location_input.clear()
        location_input.send_keys("Sala 101")
        # Submit (placeholder selector)
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button#save-device")
        submit_btn.click()
        time.sleep(2)
        # Verify success message appears
        if "dispositivo agregado" in driver.page_source.lower():
            print("[OK] Device added with valid IP.")
        else:
            print("[FAIL] Device addition with valid IP did not succeed.")

        # ---------- Test Case 1.1 (Invalid IP) ----------
        add_btn.click()
        ip_input = wait.until(EC.presence_of_element_located((By.NAME, "ip_address")))
        ip_input.clear()
        ip_input.send_keys("invalid_ip")
        mac_input = driver.find_element(By.NAME, "mac_address")
        mac_input.clear()
        mac_input.send_keys("AA:BB:CC:DD:EE:11")
        location_input = driver.find_element(By.NAME, "location")
        location_input.clear()
        location_input.send_keys("Sala 102")
        submit_btn.click()
        time.sleep(2)
        if "formato de ip" in driver.page_source.lower() or "invalid ip" in driver.page_source.lower():
            print("[OK] Invalid IP correctly rejected.")
        else:
            print("[FAIL] Invalid IP was not rejected as expected.")

        # ---------- Test Case 1.2: Simulate connection loss ----------
        # Assuming a "Simulate Disconnect" button exists per device row (placeholder selector)
        disconnect_btn = driver.find_element(By.CSS_SELECTOR, "button.disconnect-device")
        disconnect_btn.click()
        time.sleep(3)
        # Verify status label changes to "Desconectado"
        status_label = driver.find_element(By.CSS_SELECTOR, "span.device-status").text.lower()
        if "desconectado" in status_label:
            print("[OK] Device status updated to Desconectado after simulated loss.")
        else:
            print("[FAIL] Device status did not reflect Desconectado.")

        # ---------- Test Case 1.3: Manual fingerprint sync ----------
        sync_btn = driver.find_element(By.CSS_SELECTOR, "button.sync-fingerprints")
        sync_btn.click()
        # Wait for confirmation toast / alert
        time.sleep(5)
        if "sincronización completada" in driver.page_source.lower() or "sync successful" in driver.page_source.lower():
            print("[OK] Manual fingerprint synchronization succeeded.")
        else:
            print("[FAIL] Synchronization confirmation not found.")

    except Exception as e:
        print(f"\nError during Biometría tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_biometria_tests()
