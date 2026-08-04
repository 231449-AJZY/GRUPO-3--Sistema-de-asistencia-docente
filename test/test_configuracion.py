import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_configuracion_tests():
    """Execute UI tests for the /Admin/configuracion module.

    Test Cases:
    1. Change global tardiness tolerance and verify attendance status.
    2. Test database connection button works.
    3. Test manual backup generation/download.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # ----- Login as administrator -----
        driver.get("http://44.193.208.43")
        username_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']"))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        time.sleep(3)

        # ----- Test Case 3.1: Tolerance change -----
        driver.get("http://44.193.208.43/Admin/configuracion")
        time.sleep(2)
        # Locate tolerance input (placeholder selector)
        tolerance_input = wait.until(EC.presence_of_element_located((By.NAME, "tolerance_minutes")))
        tolerance_input.clear()
        tolerance_input.send_keys("15")
        # Save changes (placeholder selector)
        save_btn = driver.find_element(By.CSS_SELECTOR, "button#save-config")
        save_btn.click()
        time.sleep(2)
        # Simulate a check‑in at minute 12 (this would normally be done via backend API;
        # here we just verify the UI reflects the new limit)
        # Assuming there is a “Simular Marcación” button for demo purposes
        simulate_btn = driver.find_element(By.CSS_SELECTOR, "button#simulate-mark")
        simulate_btn.click()
        time.sleep(2)
        # Verify status label shows "Presente"
        status_label = driver.find_element(By.CSS_SELECTOR, "span#attendance-status").text.lower()
        if "presente" in status_label:
            print("[OK] Tolerance updated – attendance correctly marked as Presente.")
        else:
            print("[FAIL] Attendance status did not respect new tolerance.")

        # ----- Test Case 3.2: Database connection -----
        driver.get("http://44.193.208.43/Admin/configuracion")
        time.sleep(2)
        test_conn_btn = driver.find_element(By.CSS_SELECTOR, "button#test-db-connection")
        test_conn_btn.click()
        # Wait for toast / alert
        time.sleep(3)
        if "conexión exitosa" in driver.page_source.lower() or "connection successful" in driver.page_source.lower():
            print("[OK] Database connection test succeeded.")
        else:
            print("[FAIL] Database connection test failed.")

        # ----- Test Case 3.3: Backup generation -----
        driver.get("http://44.193.208.43/Admin/configuracion")
        time.sleep(2)
        backup_btn = driver.find_element(By.CSS_SELECTOR, "button#generate-backup")
        backup_btn.click()
        # Wait for download to start (browser‑dependent). We check for a success message.
        time.sleep(5)
        if "backup creado" in driver.page_source.lower() or "backup generated" in driver.page_source.lower():
            print("[OK] Backup generation confirmed.")
        else:
            print("[FAIL] Backup generation message not found.")

    except Exception as e:
        print(f"\nError during Configuración tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_configuracion_tests()
