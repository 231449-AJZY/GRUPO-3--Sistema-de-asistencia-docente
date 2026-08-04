import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_new_frontend_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para probar el nuevo frontend...")
        driver = webdriver.Chrome(options=chrome_options)
        
        # Asumiendo que esta IP aloja la versión actualizada del proyecto
        # o puedes cambiarlo a http://localhost:3000 si levantas el frontend localmente
        url = "http://44.193.208.43" 
        print(f"Test: Cargando la página {url}...")
        driver.get(url)
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Buscando elementos según la nueva estructura del código fuente...")
        
        # En la nueva UI, los inputs no tienen ID, así que usamos selectores CSS por atributos
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[autoComplete='username']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[autoComplete='current-password']")
        
        # El botón de login es de tipo submit
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        # El selector de rol
        role_select = driver.find_element(By.CSS_SELECTOR, "select")
        
        print("  -> Ingresando datos de prueba...")
        username_field.clear()
        username_field.send_keys("correo@unsaac.edu.pe")
        
        password_field.clear()
        password_field.send_keys("password123")
        
        # Interactuando con el checkbox "Recordar sesión"
        remember_checkbox = driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
        if not remember_checkbox.is_selected():
            remember_checkbox.click()
            
        print("  -> Haciendo clic en el botón de login...")
        login_button.click()
        
        # Esperamos a ver qué sucede (idealmente debería aparecer un mensaje o redireccionar)
        time.sleep(3)
        
        print("  -> Prueba ejecutada con éxito. Verificando URL resultante...")
        if "dashboard" in driver.current_url.lower():
            print("  -> ÉXITO: El usuario fue redirigido al dashboard.")
        else:
            print("  -> INFO: El usuario no fue redirigido. Probablemente porque el API aún no responde credenciales válidas o es un error esperado.")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_new_frontend_test()
