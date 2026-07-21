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

def test_2_usuarios():
    driver = setup_driver()
    try:
        login_as_admin(driver)
        print("\n--- Ejecutando Prueba Faltante 2: Módulo de Usuarios ---")
        driver.get(f"{BASE_URL}/Admin/usuarios")
        time.sleep(2)
        
        # CP 2.1: Verificar botón de nuevo usuario
        try:
            btn_nuevo = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Nuevo Usuario') or contains(text(), 'Registrar')]"))
            )
            print("✓ Botón de 'Nuevo Usuario' habilitado (CP 2.1).")
        except TimeoutException:
            print("✗ No se encontró el botón de crear usuario.")

        # CP 2.3: Validación de paginación
        try:
            btn_siguiente = driver.find_element(By.XPATH, "//button[contains(text(), 'Siguiente') or contains(@class, 'next')]")
            print("✓ Paginación disponible en la tabla de usuarios (CP 2.3).")
        except:
            print("ℹ Paginación no encontrada (quizás hay pocos usuarios en la tabla).")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    test_2_usuarios()
