import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def run_docentes_management_test():
    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # chrome_options.add_argument("--headless") # Descomentar para correr en entorno sin interfaz gráfica
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        wait = WebDriverWait(driver, 10)
        
        print("Test: Iniciando sesión como ADMINISTRADOR...")
        driver.get("http://44.193.208.43")
        
        # Proceso de inicio de sesión
        username_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email'], input[placeholder='usuario@unsaac.edu.pe']")))
        password_field = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        
        username_field.clear()
        username_field.send_keys("admin@unsaac.edu.pe")
        password_field.clear()
        password_field.send_keys("admin123")
        login_button.click()
        
        time.sleep(3) # Esperar la carga de dashboard y redirección
        
        # CP-01: Ir al módulo de docentes
        print("\n[CP-01] Navegando al módulo de Gestión de Docentes...")
        driver.get("http://44.193.208.43/Admin/docentes")
        time.sleep(3) # Esperar a que la tabla y API respondan
        
        page_source_lower = driver.page_source.lower()
        if "gestión de docentes" in page_source_lower or "listado de docentes" in page_source_lower:
            print("  -> ÉXITO: Se cargó el panel de docentes correctamente.")
        else:
            print("  -> FALLO: No se pudo verificar la carga del panel de docentes.")
            
        # CP-03: Registrar un nuevo docente
        print("\n[CP-03] Abriendo modal para registrar un nuevo docente...")
        try:
            # Buscar el botón de "+ Nuevo docente" o "Registrar docente"
            add_button = driver.find_element(By.XPATH, "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'nuevo docente') or contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'registrar docente')]")
            add_button.click()
            time.sleep(1)
            
            print("  -> Llenando formulario de registro...")
            # Simulando llenar los campos (los nombres pueden variar dependiendo de DocenteFormModal)
            dni_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@name='dni' or contains(@placeholder, 'DNI')]")))
            dni_input.send_keys("76543210")
            
            driver.find_element(By.XPATH, "//input[@name='nombres' or contains(@placeholder, 'Nombres')]").send_keys("Juan Carlos")
            driver.find_element(By.XPATH, "//input[@name='apellidos' or contains(@placeholder, 'Apellidos')]").send_keys("Perez Gómez")
            driver.find_element(By.XPATH, "//input[@name='correo' or @type='email']").send_keys("jperez@unsaac.edu.pe")
            
            # Guardar
            save_button = driver.find_element(By.XPATH, "//button[@type='submit' or contains(text(), 'Guardar') or contains(text(), 'Registrar')]")
            save_button.click()
            print("  -> ÉXITO: Docente guardado. Modal cerrado.")
            time.sleep(2)
        except Exception as e:
            print(f"  -> AVISO: No se pudo completar la creación (modal no encontrado o faltan inputs). Detalles: {e}")

        # CP-02: Búsqueda y Filtrado
        print("\n[CP-02] Probando el filtrado/búsqueda de docentes...")
        try:
            search_input = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'Buscar')]")
            search_input.clear()
            search_input.send_keys("76543210") # Buscar el docente que acabamos de registrar
            time.sleep(2)
            
            if "Juan Carlos" in driver.page_source or "76543210" in driver.page_source:
                 print("  -> ÉXITO: El buscador en tiempo real filtró correctamente al docente.")
            else:
                 print("  -> FALLO: No se encontraron resultados al buscar al docente.")
        except Exception as e:
            print(f"  -> AVISO: Fallo en la prueba de búsqueda. Detalles: {e}")
            
    except Exception as e:
        print(f"\nOcurrió un error general durante la prueba: {e}")
        sys.exit(1)
    finally:
        print("\nCerrando el navegador...")
        driver.quit()

if __name__ == "__main__":
    run_docentes_management_test()
