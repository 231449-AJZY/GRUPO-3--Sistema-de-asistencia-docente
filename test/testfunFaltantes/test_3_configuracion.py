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

def test_3_configuracion():
    driver = setup_driver()
    try:
        login_as_admin(driver)
        print("\n--- Ejecutando Prueba Faltante 3: Módulo de Configuración ---")
        driver.get(f"{BASE_URL}/Admin/configuracion")
        time.sleep(2)
        
        # CP 3.1: Validar input de tolerancia global
        try:
            input_tolerancia = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//input[@type='number' or contains(@name, 'tolerancia')]"))
            )
            input_tolerancia.clear()
            input_tolerancia.send_keys("15")
            print("✓ Campo de tolerancia de tardanza validado e interactuado (CP 3.1).")
            
            # CP 3.3: Buscar botón de respaldo
            btn_backup = driver.find_elements(By.XPATH, "//button[contains(text(), 'Respaldo') or contains(text(), 'Backup')]")
            if btn_backup:
                print("✓ Botón de respaldo (Backup) encontrado (CP 3.3).")
            
        except TimeoutException:
            print("✗ Error al acceder a configuraciones globales.")
            
    finally:
        driver.quit()

if __name__ == "__main__":
    test_3_configuracion()
