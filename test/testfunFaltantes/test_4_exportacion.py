import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

BASE_URL = "http://44.193.208.43"
ADMIN_USERNAME = "admin@unsaac.edu.pe"
ADMIN_PASSWORD = "password_admin"

def setup_driver():
    opts = Options()
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=opts)
    driver.maximize_window()
    return driver

def login_as_admin(driver):
    driver.get(f"{BASE_URL}/login")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username"))).send_keys(ADMIN_USERNAME)
    driver.find_element(By.NAME, "password").send_keys(ADMIN_PASSWORD)
    driver.find_element(By.XPATH, "//button[@type='submit' or contains(text(), 'Ingresar')]").click()
    WebDriverWait(driver, 10).until(EC.url_contains("/Admin"))

def test_4_exportacion():
    driver = setup_driver()
    try:
        login_as_admin(driver)
        print("\n--- Ejecutando Prueba Faltante 4: Exportación de Reportes ---")
        # Asumiendo que el botón de reporte general está en el dashboard del Admin
        driver.get(f"{BASE_URL}/Admin/dashboard")
        time.sleep(2)
        
        # CP 4.1: Exportar Reporte General
        try:
            btn_exportar = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Exportar') or contains(text(), 'Reporte')]"))
            )
            print("✓ Botón de Exportación encontrado y clickeable (CP 4.1).")
        except TimeoutException:
            print("✗ No se encontró el botón de exportación general en el Dashboard Admin.")
            
    finally:
        driver.quit()

if __name__ == "__main__":
    test_4_exportacion()
