import time
import sys
# pyrefly: ignore [missing-import]
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_tests():
    # Setup Chrome options
    chrome_options = Options()
    # It's recommended to run headless in server/CI environments
    # Uncomment the next line if you want to see the browser window
    # chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador...")
        driver = webdriver.Chrome(options=chrome_options)
        
        # Test 1: Cargar la página
        print("Test 1: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        # Test 2: Verificar el título
        print("Test 2: Verificando el título...")
        expected_title_part = "Control de Asistencia Docente"
        if expected_title_part in driver.title:
            print("  -> ÉXITO: El título es correcto.")
        else:
            print(f"  -> FALLO: El título encontrado fue '{driver.title}'")

        # Wait until the form is loaded
        wait = WebDriverWait(driver, 10)
        
        # Test 3: Ingresar credenciales
        print("Test 3: Ingresando credenciales de prueba...")
        username_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
        password_field = driver.find_element(By.ID, "password")
        login_button = driver.find_element(By.ID, "btnLogin")
        
        username_field.clear()
        username_field.send_keys("usuario_prueba")
        
        password_field.clear()
        password_field.send_keys("password123")
        
        print("  -> Credenciales ingresadas. Haciendo clic en el botón de login...")
        login_button.click()
        
        # Test 4: Esperar resultado
        print("Test 4: Esperando resultado de login...")
        time.sleep(3) # Wait briefly to observe result. Replace with explicit wait in real scenarios.
        print("  -> Prueba completada. Revisa la pantalla o el nuevo estado de la URL.")

        print("\nTodos los tests han finalizado exitosamente (flujo básico).")
        
    except Exception as e:
        print(f"\nOcurrió un error durante las pruebas: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_tests()
