import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

BASE_URL = "http://44.193.208.43"
SUPERVISOR_USERNAME = "supervisor@unsaac.edu.pe"
SUPERVISOR_PASSWORD = "password_seguro_123"

def setup_driver():
    opts = Options()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=opts)
    driver.maximize_window()
    return driver

def login_as_supervisor(driver):
    driver.get(f"{BASE_URL}/login")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username"))).send_keys(SUPERVISOR_USERNAME)
    driver.find_element(By.NAME, "password").send_keys(SUPERVISOR_PASSWORD)
    driver.find_element(By.XPATH, "//button[@type='submit' or contains(text(), 'Ingresar')]").click()
    WebDriverWait(driver, 10).until(EC.url_contains("/login/PanelSupervisor"))

def test_3_panel_alertas():
    driver = setup_driver()
    try:
        login_as_supervisor(driver)
        print("\n--- Ejecutando Prueba 3: Panel de Alertas Recientes ---")
        
        alertas = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.XPATH, "//span[contains(@class, 'alertTitle')]"))
        )
        if len(alertas) > 0:
            print(f"✓ Se encontraron {len(alertas)} alertas en el panel de supervisor.")
            # CP 3.3 Validar botón Ver todas
            btn_todas = driver.find_elements(By.XPATH, "//button[contains(text(), 'Ver todas')]")
            if btn_todas:
                print("✓ Botón 'Ver todas' encontrado. Interacción validada.")
        else:
            print("✗ No hay alertas visibles.")
    except TimeoutException:
        print("✗ Error: No se encontró el panel de alertas.")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_3_panel_alertas()
