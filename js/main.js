/**
 * Punto de entrada de la aplicacion web.
 *
 * Este archivo decide que modulos de UI activar en funcion del HTML presente.
 * Eso permite reutilizar el mismo bundle JS en las paginas de CIDR y VLSM.
 */
import {
  initCidrCalculator,
  initDefaults,
  initTestRunner,
  initVlsmCalculator,
} from "./ui.js";

/**
 * Maneja la inicializacion cuando el DOM esta listo.
 * No recibe parametros.
 *
 * @returns {void}
 * Flujo:
 * - Aplica valores por defecto visibles (ej. nota VLSM).
 * - Verifica que exista cada formulario antes de inicializar su UI.
 * - Inicializa el runner de pruebas solo si el boton esta en la pagina.
 * Efectos secundarios: registra listeners y actualiza el DOM.
 */
function handleDOMContentLoaded() {
  // Inicializa valores por defecto visibles en la UI (no depende de la pagina).
  initDefaults();

  // Inicializa solo los modulos presentes en la pagina actual.
  // Esto evita errores cuando un formulario no existe en la pagina.
  if (document.getElementById("cidr-form")) {
    initCidrCalculator();
  }

  if (document.getElementById("vlsm-form")) {
    initVlsmCalculator();
  }

  if (document.getElementById("run-tests")) {
    initTestRunner();
  }
}

// Enlaza la inicializacion al evento DOMContentLoaded para asegurar que el DOM este listo.
document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
