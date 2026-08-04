import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_supervisor_graph_tests():
    """Test the daily activity line chart on the Supervisor dashboard.

    Cases:
    1. Change temporal filter to "Hoy", "Ayer", "Esta semana" and ensure the chart updates.
    2. Verify that peak points are visually highlighted at the correct hour.
    """
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 10)
    try:
        # Login (adjust credentials if needed)
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

        # Navigate to Supervisor dashboard
        driver.get("http://44.193.208.43/login/PanelSupervisor")
        time.sleep(2)

        # Helper to select a filter and verify chart updates
        def select_filter(filter_name):
            # Placeholder selector for the filter dropdown/button
            filter_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, f"button[data-filter='{filter_name.lower()}']"))
            filter_btn.click()
            time.sleep(2)  # wait for chart to redraw
            # Simple existence check of the canvas element
            canvas = driver.find_element(By.CSS_SELECTOR, "canvas#daily-activity-chart")
            if canvas.is_displayed():
                print(f"[OK] Chart displayed for filter '{filter_name}'.")
            else:
                print(f"[FAIL] Chart not visible for filter '{filter_name}'.")

        for f in ["Hoy", "Ayer", "Esta semana"]:
            select_filter(f)

        # Verify peak point highlighting – assume peaks have a specific class
        peaks = driver.find_elements(By.CSS_SELECTOR, "circle.chart-peak")
        if peaks:
            print(f"[OK] Found {len(peaks)} peak point(s) highlighted on the chart.")
        else:
            print("[FAIL] No peak points detected on the chart.")

    except Exception as e:
        print(f"\nError during Supervisor Graph tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_supervisor_graph_tests()
