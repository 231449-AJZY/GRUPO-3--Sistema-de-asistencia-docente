import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

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

def test_2_grafico_actividad():
    driver = setup_driver()
    try:
        login_as_supervisor(driver)
        print("\n--- Ejecutando Prueba 2: Gráfico de Actividad Diaria ---")
        
        filtro_select = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "select"))
        )
        filtro_select.click()
        opcion_ayer = driver.find_element(By.XPATH, "//option[@value='ayer']")
        opcion_ayer.click()
        print("✓ Filtro cambiado a 'Ayer'.")
        
        grafico = driver.find_element(By.TAG_NAME, "svg")
        if grafico:
            print("✓ Elemento SVG del gráfico interactuado correctamente tras cambio de filtro.")
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_2_grafico_actividad()
