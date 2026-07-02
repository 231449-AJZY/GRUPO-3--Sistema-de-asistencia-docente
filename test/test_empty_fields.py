import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_empty_fields_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para prueba de campos vacíos...")
        driver = webdriver.Chrome(options=chrome_options)
        
        print("Test: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Intentando iniciar sesión con campos VACÍOS...")
        # Esperar a que cargue el formulario
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='usuario@unsaac.edu.pe']")))
        
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        print("  -> Haciendo clic en el botón de login sin ingresar datos...")
        login_button.click()
        
        time.sleep(2)
        
        # Verificar si hay validación HTML5 o mensajes de error
        print("Test: Verificando comportamiento tras intentar login vacío...")
        if "dashboard" not in driver.current_url.lower():
            print("  -> ÉXITO: El sistema bloqueó el acceso con campos vacíos.")
        else:
            print("  -> FALLO: El sistema permitió el acceso (o redirección) sin credenciales.")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_empty_fields_test()
