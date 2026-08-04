import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_supervisor_realtime_tests():
    """Test that the real‑time activity table on the Supervisor dashboard updates
    automatically when a new attendance is recorded.

    Cases:
    1. Simulate a backend attendance event (placeholder – actual implementation depends on API).
    2. Verify that a new row appears in the table without page reload.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # ---- Login (use admin or supervisor credentials) ----
        driver.get("http://44.193.208.43")
        username_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']"))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")  # adjust if needed
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        time.sleep(3)

        # ---- Navigate to Supervisor dashboard ----
        driver.get("http://44.193.208.43/login/PanelSupervisor")
        time.sleep(2)

        # Capture current number of rows in the activity table
        table_body = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table#activity-table tbody")))
        initial_rows = len(table_body.find_elements(By.TAG_NAME, "tr"))
        print(f"[INFO] Initial rows: {initial_rows}")

        # ---- Simulate a new attendance event ----
        # NOTE: This is a placeholder. Replace with an actual API call or DB insertion that triggers the real‑time update.
        # Example (pseudo‑code):
        # requests.post("http://44.193.208.43/api/simulate_attendance", json={"docente_id": 123, "timestamp": "2026-07-25T18:00:00Z"})
        print("[NOTE] Simulate attendance event here (implementation dependent).")
        time.sleep(5)  # Wait for the real‑time push to arrive

        # Re‑fetch table rows after the simulated event
        updated_rows = len(table_body.find_elements(By.TAG_NAME, "tr"))
        print(f"[INFO] Updated rows: {updated_rows}")
        if updated_rows > initial_rows:
            print("[OK] Real‑time table updated with new attendance.")
        else:
            print("[FAIL] Table did not update; no new row detected.")

    except Exception as e:
        print(f"\nError during Supervisor Real‑time Table tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()


if __name__ == "__main__":
    run_supervisor_realtime_tests()
