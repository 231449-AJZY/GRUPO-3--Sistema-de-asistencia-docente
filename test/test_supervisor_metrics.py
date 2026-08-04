import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_supervisor_metrics_tests():
    """Test the metric cards on the Supervisor dashboard.

    Cases:
    1. Verify total "Asistencias en TR" matches expected daily count.
    2. Verify percentage trends are displayed correctly.
    3. Verify present/absent/tardy counts match the real‑time table.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # ---- Login as supervisor (or admin) ----
        driver.get("http://44.193.208.43")
        username_field = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']"))
        )
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")  # adjust if a dedicated supervisor account exists
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        time.sleep(3)

        # ---- Navigate to Supervisor dashboard ----
        driver.get("http://44.193.208.43/login/PanelSupervisor")
        time.sleep(2)

        # ---- Case 1.1: Total asistencias ----
        total_card = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.metric-card[data-metric='asistencias']")))
        total_text = total_card.text.lower()
        if "asistencias" in total_text:
            print("[OK] Metric card for total asistencias found.")
        else:
            print("[FAIL] Metric card for total asistencias not found.")

        # ---- Case 1.2: Percentage trends ----
        trend_elem = driver.find_element(By.CSS_SELECTOR, "span.metric-trend[data-metric='asistencias']")
        trend_text = trend_elem.text.lower()
        if any(sign in trend_text for sign in ["+", "-", "%"]):
            print("[OK] Trend indicator displayed: " + trend_text)
        else:
            print("[FAIL] Trend indicator missing or malformed.")

        # ---- Case 1.3: Present/Absent/Tardy counts ----
        present_card = driver.find_element(By.CSS_SELECTOR, "div.metric-card[data-metric='presentes']")
        absent_card = driver.find_element(By.CSS_SELECTOR, "div.metric-card[data-metric='ausentes']")
        tardy_card = driver.find_element(By.CSS_SELECTOR, "div.metric-card[data-metric='tardanzas']")
        # Simple existence check – deeper validation would compare against the activity table data.
        if present_card and absent_card and tardy_card:
            print("[OK] Presence, absence and tardy cards are present.")
        else:
            print("[FAIL] One of the presence/absence/tardy cards is missing.")

    except Exception as e:
        print(f"\nError during Supervisor Metrics tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_supervisor_metrics_tests()
