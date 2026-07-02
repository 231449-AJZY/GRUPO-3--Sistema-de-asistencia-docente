import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_missing_username_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para prueba de nombre de usuario faltante...")
        driver = webdriver.Chrome(options=chrome_options)
        
        print("Test: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Ingresando SOLO contraseña, sin nombre de usuario...")
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='usuario@unsaac.edu.pe']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        username_field.clear()
        # No se envía nombre de usuario
        
        password_field.clear()
        password_field.send_keys("alguna_contraseña")
        
        print("  -> Contraseña ingresada. Haciendo clic en el botón de login...")
        login_button.click()
        
        print("Test: Verificando que NO se inicie sesión...")
        time.sleep(3) # Esperar para ver el resultado
        
        if "dashboard" not in driver.current_url.lower():
            print("  -> ÉXITO: El usuario no fue redirigido al dashboard (comportamiento esperado cuando falta el usuario).")
        else:
            print("  -> FALLO: El usuario fue redirigido a pesar de no ingresar el usuario.")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_missing_username_test()
