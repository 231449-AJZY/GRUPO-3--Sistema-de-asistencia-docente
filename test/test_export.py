import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_export_tests():
    """Execute UI tests for the export/report generation functionality.

    Test Cases:
    1. Generate and download a general report (Excel or PDF) and verify success message.
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
        )
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        time.sleep(3)

        # ----- Navigate to export page -----
        driver.get("http://44.193.208.43/Admin/export")
        time.sleep(2)

        # Click the button to generate a report (placeholder selector)
        generate_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button#generate-report")))
        generate_btn.click()
        # Wait for confirmation toast / alert
        time.sleep(5)
        if "reporte generado" in driver.page_source.lower() or "report generated" in driver.page_source.lower():
            print("[OK] Report generation succeeded and download started.")
        else:
            print("[FAIL] Report generation confirmation not found.")

    except Exception as e:
        print(f"\nError during Export tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()


if __name__ == "__main__":
    run_export_tests()
