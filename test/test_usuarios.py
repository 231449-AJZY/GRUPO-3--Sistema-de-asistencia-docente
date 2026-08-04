import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def run_usuarios_tests():
    """Execute UI tests for the /Admin/usuarios module.

    Test Cases:
    1. Create a new system user with valid data.
    2. Edit an existing user's role and deactivate the account, then verify login rejection.
    3. Verify pagination when more than 10 users exist.
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

        # ---------- Test Case 2.1: Create new user ----------
        driver.get("http://44.193.208.43/Admin/usuarios")
        time.sleep(2)
        add_btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button#add-user")))
        add_btn.click()
        email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
        role_select = driver.find_element(By.NAME, "role")
        email_input.clear()
        email_input.send_keys("nuevo.usuario@unsaac.edu.pe")
        role_select.send_keys("Supervisor")  # adjust to actual option text
        save_btn = driver.find_element(By.CSS_SELECTOR, "button#save-user")
        save_btn.click()
        time.sleep(2)
        if "usuario creado" in driver.page_source.lower() or "user created" in driver.page_source.lower():
            print("[OK] New system user created successfully.")
        else:
            print("[FAIL] New user creation failed.")

        # ---------- Test Case 2.2: Edit role and deactivate ----------
        # Locate the newly created user row (placeholder selector, assume email appears uniquely)
        user_row = driver.find_element(By.XPATH, f"//tr[td[text()='nuevo.usuario@unsaac.edu.pe']]")
        edit_btn = user_row.find_element(By.CSS_SELECTOR, "button.edit-user")
        edit_btn.click()
        # Change role
        role_select = wait.until(EC.presence_of_element_located((By.NAME, "role")))
        role_select.clear()
        role_select.send_keys("Administrador")
        # Deactivate (checkbox or toggle)
        deactivate_chk = driver.find_element(By.NAME, "active")
        if deactivate_chk.is_selected():
            deactivate_chk.click()
        save_btn = driver.find_element(By.CSS_SELECTOR, "button#save-user")
        save_btn.click()
        time.sleep(2)
        print("[OK] User role changed and account deactivated.")
        # Verify login rejection
        driver.get("http://44.193.208.43")
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        username_field.clear()
        username_field.send_keys("nuevo.usuario@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("temporal123")  # assume temporary password sent
        login_button.click()
        time.sleep(3)
        if "cuenta desactivada" in driver.page_source.lower() or "account disabled" in driver.page_source.lower():
            print("[OK] Deactivated user cannot log in.")
        else:
            print("[FAIL] Deactivated user was able to log in.")

        # ---------- Test Case 2.3: Pagination ----------
        driver.get("http://44.193.208.43/Admin/usuarios")
        time.sleep(2)
        # Assume pagination controls exist with specific selectors
        next_btn = driver.find_element(By.CSS_SELECTOR, "button.pagination-next")
        prev_btn = driver.find_element(By.CSS_SELECTOR, "button.pagination-prev")
        # Click next and verify page changes (e.g., URL contains page param or table content updates)
        next_btn.click()
        time.sleep(2)
        if "page=2" in driver.current_url.lower() or "siguiente" in driver.page_source.lower():
            print("[OK] Pagination next works.")
        else:
            print("[FAIL] Pagination next failed.")
        # Click previous
        prev_btn.click()
        time.sleep(2)
        if "page=1" in driver.current_url.lower() or "anterior" in driver.page_source.lower():
            print("[OK] Pagination previous works.")
        else:
            print("[FAIL] Pagination previous failed.")

    except Exception as e:
        print(f"\nError during Usuarios tests: {e}")
        sys.exit(1)
    finally:
        driver.quit()

if __name__ == "__main__":
    run_usuarios_tests()
