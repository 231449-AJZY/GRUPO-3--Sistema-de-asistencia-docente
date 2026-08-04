import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_role_management_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    try:
        driver = webdriver.Chrome(options=chrome_options)
        wait = WebDriverWait(driver, 10)
        
        # Test Case 1: Docente access restriction
        print("Test 1: Verificando restricción de acceso para el rol DOCENTE...")
        driver.get("http://44.193.208.43")
        
        # Simulamos inicio de sesión de Docente (Ajustar credenciales según backend real)
        print(" -> Ingresando como Docente (mquispe@unsaac.edu.pe)")
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        username_field.clear()
        username_field.send_keys("mquispe@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("password123")  # Placeholder password
        login_button.click()
        
        time.sleep(3) # Esperar redirección
        
        print(" -> Intentando acceder a /Admin/roles...")
        driver.get("http://44.193.208.43/Admin/roles")
        time.sleep(2)
        
        page_source_lower = driver.page_source.lower()
        if "admin/roles" not in driver.current_url.lower() or "403" in page_source_lower or "no autorizado" in page_source_lower:
            print("  -> ÉXITO: El DOCENTE no pudo acceder a la gestión de roles. Fue bloqueado o redirigido.")
        else:
            print("  -> FALLO: El DOCENTE logró acceder a la ruta restringida /Admin/roles.")
            
        driver.delete_all_cookies() # Limpiar sesión para el siguiente test
        
        # Test Case 2: Administrador access
        print("\nTest 2: Verificando acceso permitido para el rol ADMINISTRADOR...")
        driver.get("http://44.193.208.43")
        
        print(" -> Ingresando como Administrador (admin@unsaac.edu.pe)")
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("admin123")  # Placeholder password
        login_button.click()
        
        time.sleep(3) # Esperar redirección
        
        print(" -> Navegando a /Admin/roles...")
        driver.get("http://44.193.208.43/Admin/roles")
        time.sleep(2)
        
        if "gestión de roles" in driver.page_source.lower() or "administrador" in driver.page_source.lower():
            print("  -> ÉXITO: El ADMINISTRADOR accedió correctamente al módulo de gestión de roles.")
        else:
            print("  -> FALLO: El ADMINISTRADOR no pudo cargar la página de gestión de roles.")

    except Exception as e:
        print(f"\nOcurrió un error durante la prueba de roles: {e}")
        sys.exit(1)
    finally:
        print("\nCerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_role_management_test()
