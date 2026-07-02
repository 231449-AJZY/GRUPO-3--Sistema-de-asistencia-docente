import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_missing_password_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para prueba de contraseña faltante...")
        driver = webdriver.Chrome(options=chrome_options)
        
        print("Test: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Ingresando usuario pero omitiendo la contraseña...")
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='usuario@unsaac.edu.pe']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        username_field.clear()
        username_field.send_keys("usuario_valido_o_cualquiera")
        
        password_field.clear()
        # No ingresamos nada en el campo de la contraseña
        
        print("  -> Haciendo clic en el botón de login sin ingresar contraseña...")
        login_button.click()
        
        time.sleep(2)
        
        print("Test: Verificando comportamiento tras intentar login sin contraseña...")
        if "dashboard" not in driver.current_url.lower():
            print("  -> ÉXITO: El sistema bloqueó el acceso con la contraseña vacía.")
        else:
            print("  -> FALLO: El sistema permitió el acceso (o redirección) sin contraseña.")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_missing_password_test()
