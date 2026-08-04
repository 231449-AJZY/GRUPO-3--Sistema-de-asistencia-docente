import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_sql_injection_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para prueba de Inyección SQL en login...")
        driver = webdriver.Chrome(options=chrome_options)
        
        print("Test: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Ingresando payload de Inyección SQL...")
        username_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
        password_field = driver.find_element(By.ID, "password")
        login_button = driver.find_element(By.ID, "btnLogin")
        
        username_field.clear()
        # Payload SQLi común
        username_field.send_keys("' OR '1'='1")
        
        password_field.clear()
        password_field.send_keys("' OR '1'='1")
        
        print("  -> Payload ingresado. Haciendo clic en el botón de login...")
        login_button.click()
        
        print("Test: Verificando comportamiento ante Inyección SQL...")
        time.sleep(3) 
        
        if "dashboard" not in driver.current_url.lower():
            print("  -> ÉXITO: El sistema no permitió el acceso (aparentemente no vulnerable a esta inyección SQL básica).")
        else:
            print("  -> FALLO: El sistema permitió el acceso (vulnerabilidad SQLi detectada).")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_sql_injection_test()
