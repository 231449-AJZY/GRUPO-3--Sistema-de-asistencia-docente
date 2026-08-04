import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_xss_injection_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        print("Iniciando el navegador para prueba de Inyección XSS en login...")
        driver = webdriver.Chrome(options=chrome_options)
        
        print("Test: Cargando la página http://44.193.208.43...")
        driver.get("http://44.193.208.43")
        
        wait = WebDriverWait(driver, 10)
        
        print("Test: Ingresando payload de Inyección XSS...")
        username_field = wait.until(EC.presence_of_element_located((By.ID, "username")))
        password_field = driver.find_element(By.ID, "password")
        login_button = driver.find_element(By.ID, "btnLogin")
        
        username_field.clear()
        # Payload XSS común
        xss_payload = "<script>alert('XSS')</script>"
        username_field.send_keys(xss_payload)
        
        password_field.clear()
        password_field.send_keys("cualquier_clave")
        
        print("  -> Payload ingresado. Haciendo clic en el botón de login...")
        login_button.click()
        
        print("Test: Verificando si aparece un alert dialog (indicativo de XSS)...")
        time.sleep(2) 
        
        try:
            # Esperamos a ver si hay una alerta presente
            alert = wait.until(EC.alert_is_present())
            print(f"  -> FALLO: Se detectó una alerta con el texto: '{alert.text}'. ¡Posible vulnerabilidad XSS!")
            alert.accept() # Aceptar la alerta para poder continuar/cerrar
        except:
            print("  -> ÉXITO: No se detectó ninguna alerta de JavaScript (aparentemente no es vulnerable a este XSS básico).")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("Cerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_xss_injection_test()
