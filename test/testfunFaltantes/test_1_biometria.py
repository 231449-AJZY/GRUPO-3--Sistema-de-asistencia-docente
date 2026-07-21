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

def test_1_biometria():
    driver = setup_driver()
    try:
        login_as_admin(driver)
        print("\n--- Ejecutando Prueba Faltante 1: Módulo de Biometría ---")
        driver.get(f"{BASE_URL}/Admin/biometria")
        time.sleep(2)
        
        # CP 1.1: Intentar añadir biométrico con IP inválida
        try:
            btn_nuevo = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nuevo Biométrico') or contains(text(), 'Agregar')]"))
            )
            btn_nuevo.click()
            input_ip = WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.NAME, "ip_address")))
            input_ip.send_keys("300.999.0.1") # IP Inválida
            
            btn_guardar = driver.find_element(By.XPATH, "//button[contains(text(), 'Guardar')]")
            btn_guardar.click()
            
            error_msg = WebDriverWait(driver, 3).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'formato incorrecto') or contains(@class, 'error')]"))
            )
            print("✓ Validación de IP incorrecta (CP 1.1) superada. Sistema rechazó IP inválida.")
        except TimeoutException:
            print("✗ No se encontró formulario de nuevo biométrico o validación de IP ausente.")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_1_biometria()
