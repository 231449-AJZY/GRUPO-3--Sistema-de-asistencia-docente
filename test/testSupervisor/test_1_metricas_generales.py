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
    print("Iniciando sesión como Supervisor...")
    driver.get(f"{BASE_URL}/login")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.NAME, "username"))).send_keys(SUPERVISOR_USERNAME)
    driver.find_element(By.NAME, "password").send_keys(SUPERVISOR_PASSWORD)
    driver.find_element(By.XPATH, "//button[@type='submit' or contains(text(), 'Ingresar')]").click()
    WebDriverWait(driver, 10).until(EC.url_contains("/login/PanelSupervisor"))

def test_1_metricas_generales():
    driver = setup_driver()
    try:
        login_as_supervisor(driver)
        print("\n--- Ejecutando Prueba 1: Verificación de Métricas Generales ---")
        metricas_esperadas = ["Asistencias en TR", "Docentes Presentes", "Docentes Ausentes", "Tardanzas del día", "Alertas Totales"]
        
        for metrica in metricas_esperadas:
            try:
                elemento_titulo = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//span[contains(text(), '{metrica}')]"))
                )
                tarjeta = elemento_titulo.find_element(By.XPATH, "./../..")
                valor = tarjeta.find_element(By.XPATH, ".//span[contains(@class, 'cardValue')]").text
                print(f"✓ Métrica encontrada: '{metrica}' con valor: {valor}")
            except TimeoutException:
                print(f"✗ Error: No se encontró la métrica '{metrica}'.")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_1_metricas_generales()
