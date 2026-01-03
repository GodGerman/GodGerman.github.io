/**
 * Capa de UI para calculadoras CIDR y VLSM.
 *
 * Orquesta eventos del DOM, valida entradas con utilidades y renderiza resultados.
 * Este modulo tiene efectos secundarios sobre el DOM.
 */
import {
  formatBinaryIp,
  formatIp,
  isNetworkAddress,
  parseCidrInput,
  parseIp,
  parseMask,
  prefixToMask,
} from "./ip-utils.js";
import { computeCidr, computeSubnets } from "./cidr.js";
import { computeVlsm } from "./vlsm.js";
import { runTests } from "./tests.js";

/**
 * Actualiza el mensaje de estado del formulario.
 *
 * @param {HTMLElement} element - Contenedor del mensaje.
 * @param {string|null} type - Tipo de estado ("error", "warning", etc.).
 * @param {string|null} message - Texto del mensaje o null para limpiar.
 * @returns {void}
 * Flujo:
 * - Si no hay mensaje, limpia texto y atributo data-type.
 * - Si hay mensaje, actualiza el texto y el tipo.
 * Efectos secundarios: muta el DOM.
 */
function setStatus(element, type, message) {
  // Cuando no hay mensaje, limpia el estado visual.
  if (!message) {
    element.textContent = "";
    element.removeAttribute("data-type");
    return;
  }

  // Caso normal: asigna mensaje y tipo para estilos.
  element.textContent = message;
  element.setAttribute("data-type", type);
}

/**
 * Parsea un entero no negativo en formato decimal estricto.
 *
 * @param {string|number} value - Valor crudo de entrada.
 * @returns {number|null} Entero no negativo o null si es invalido.
 * Flujo:
 * - Normaliza a string y valida con regex.
 * - Convierte a numero y verifica seguridad de rango.
 * Efectos secundarios: ninguno.
 */
function parseStrictInt(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) return null;

  return parsed;
}

/**
 * Inicializa la calculadora CIDR y enlaza eventos del formulario.
 * No recibe parametros.
 *
 * @returns {void}
 * Flujo:
 * - Obtiene nodos del DOM.
 * - Declara helpers internos (vista, ejemplo, calculo).
 * - Registra handlers para acciones del usuario.
 * Efectos secundarios: registra listeners y actualiza el DOM.
 */
export function initCidrCalculator() {
  // Referencias a nodos principales del formulario CIDR.
  const form = document.getElementById("cidr-form");
  const combinedInput = document.getElementById("cidr-combined");
  const ipInput = document.getElementById("cidr-ip");
  const maskInput = document.getElementById("cidr-mask");
  const binaryToggle = document.getElementById("cidr-binary-toggle");
  const statusEl = document.getElementById("cidr-status");
  const resultsEl = document.getElementById("cidr-results");
  const emptyEl = document.getElementById("cidr-empty");
  const binaryEl = document.getElementById("cidr-binary");
  const exampleBtn = document.getElementById("cidr-example");
  const clearBtn = document.getElementById("cidr-clear");
  const subnetsInput = document.getElementById("cidr-subnets");

  // Campos de salida para el resumen CIDR.
  // Cada propiedad apunta a un nodo donde se imprime el resultado.
  const fields = {
    network: document.getElementById("cidr-network"),
    hostRange: document.getElementById("cidr-host-range"),
    broadcast: document.getElementById("cidr-broadcast"),
    maskDec: document.getElementById("cidr-mask-dec"),
    maskPrefix: document.getElementById("cidr-mask-prefix"),
    hosts: document.getElementById("cidr-hosts"),
    total: document.getElementById("cidr-total"),
    wildcard: document.getElementById("cidr-wildcard"),
    chip: document.getElementById("cidr-prefix-chip"),
    binIp: document.getElementById("cidr-bin-ip"),
    binMask: document.getElementById("cidr-bin-mask"),
    binNetwork: document.getElementById("cidr-bin-network"),
    binBroadcast: document.getElementById("cidr-bin-broadcast"),
  };

  // Elementos usados para resultados de subredes FLSM.
  // Incluye el contenedor, la tabla y los campos de resumen.
  const subnetElements = {
    container: document.getElementById("cidr-subnet-results"),
    rows: document.getElementById("cidr-subnet-rows"),
    chip: document.getElementById("cidr-subnet-count-chip"),
    newMask: document.getElementById("cidr-new-mask"),
    subnetHosts: document.getElementById("cidr-subnet-hosts"),
  };

  // Estado actual de la vista: "empty", "summary" o "subnets".
  // Se usa para saber que paneles mostrar y si el binario aplica.
  let cidrView = "empty";

  /**
   * Controla que paneles se muestran segun el estado actual.
   *
   * @param {string} view - "empty", "summary" o "subnets".
   * @returns {void}
   * Flujo:
   * - Guarda el estado actual.
   * - Alterna visibilidad de resumen, subredes y panel binario.
   * Efectos secundarios: muta el DOM.
   */
  function setCidrView(view) {
    cidrView = view;
    const showSummary = view === "summary" || view === "subnets";
    const showSubnets = view === "subnets";

    resultsEl.hidden = !showSummary;
    subnetElements.container.hidden = !showSubnets;
    if (emptyEl) emptyEl.hidden = showSummary || showSubnets;
    if (binaryEl) binaryEl.hidden = showSummary ? !binaryToggle.checked : true;
  }

  /**
   * Limpia el formulario y restablece la vista inicial.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo:
   * - Resetea inputs y toggles.
   * - Limpia subredes y estado.
   * Efectos secundarios: muta el DOM.
   */
  function clearForm() {
    combinedInput.value = "";
    ipInput.value = "";
    maskInput.value = "";
    binaryToggle.checked = false;
    subnetsInput.value = "";
    setCidrView("empty");
    setStatus(statusEl, null, null);
  }

  /**
   * Carga un ejemplo en el campo CIDR combinado.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo:
   * - Establece el ejemplo.
   * - Limpia el resto de campos para evitar ambiguedad.
   * Efectos secundarios: muta el DOM.
   */
  function handleExampleClick() {
    combinedInput.value = "192.168.10.0/24";
    ipInput.value = "";
    maskInput.value = "";
  }

  // Limpia todos los campos del formulario CIDR.
  clearBtn.addEventListener("click", clearForm);

  /**
   * Alterna la vista binaria segun el estado actual.
   *
   * @param {Event} event - Evento change del checkbox (no se usa).
   * @returns {void}
   * Flujo:
   * - Verifica la vista actual y el estado del toggle.
   * - Actualiza la visibilidad del panel binario.
   * Efectos secundarios: muta el DOM.
   */
  function handleBinaryToggleChange(event) {
    const showSummary = cidrView === "summary" || cidrView === "subnets";
    binaryEl.hidden = showSummary ? !binaryToggle.checked : true;
  }

  /**
   * Ejecuta el flujo CIDR principal: validacion, calculo y render.
   *
   * @param {SubmitEvent} event - Evento submit del formulario.
   * @returns {void}
   * Flujo:
   * - Parsea entradas (prioriza CIDR combinado).
   * - Calcula CIDR y muestra resumen.
   * - Si se solicita, calcula subredes FLSM y renderiza tabla.
   * Efectos secundarios: actualiza mensajes y resultados en el DOM.
   */
  function handleCidrSubmit(event) {
    event.preventDefault();
    setStatus(statusEl, null, null);

    let ipArr = null;
    let prefix = null;

    // Prioriza el campo combinado; si no, acepta IP/prefijo en el campo IP.
    if (combinedInput.value.trim()) {
      const parsed = parseCidrInput(combinedInput.value);
      if (!parsed) {
        setStatus(statusEl, "error", "Formato CIDR invalido. Usa IP/prefijo.");
        setCidrView("empty");
        return;
      }
      ipArr = parsed.ipArr;
      prefix = parsed.prefix;
    } else if (ipInput.value.trim().includes("/")) {
      const parsed = parseCidrInput(ipInput.value);
      if (!parsed) {
        setStatus(statusEl, "error", "Formato CIDR invalido en direccion IP.");
        setCidrView("empty");
        return;
      }
      ipArr = parsed.ipArr;
      prefix = parsed.prefix;
    } else {
      // Caso tradicional: IP y mascara por separado.
      ipArr = parseIp(ipInput.value);
      if (!ipArr) {
        setStatus(statusEl, "error", "Direccion IP invalida.");
        setCidrView("empty");
        return;
      }
      prefix = parseMask(maskInput.value);
      if (prefix === null) {
        setStatus(statusEl, "error", "Mascara invalida. Usa prefijo o decimal punteada.");
        setCidrView("empty");
        return;
      }
    }

    // Ejecuta el calculo CIDR con la IP y el prefijo resultantes.
    const result = computeCidr(ipArr, prefix);
    if (result.error) {
      setStatus(statusEl, "error", result.error);
      setCidrView("empty");
      return;
    }

    // Construye rango de hosts (o N/A si no aplica).
    // En /31 y /32 no hay rango utilizable.
    const range = result.firstHost && result.lastHost
      ? `${formatIp(result.firstHost)} - ${formatIp(result.lastHost)}`
      : "N/A";

    // Renderiza resumen CIDR en el panel principal.
    fields.network.textContent = formatIp(result.network);
    fields.hostRange.textContent = range;
    fields.broadcast.textContent = formatIp(result.broadcast);
    fields.maskDec.textContent = formatIp(result.mask);
    fields.maskPrefix.textContent = `/${result.prefix}`;
    fields.hosts.textContent = result.usableHosts;
    fields.total.textContent = result.totalAddresses;
    fields.wildcard.textContent = formatIp(result.wildcard);
    fields.chip.textContent = `/${result.prefix}`;

    // Renderiza la vista binaria (si se solicita).
    fields.binIp.textContent = formatBinaryIp(result.ip);
    fields.binMask.textContent = formatBinaryIp(result.mask);
    fields.binNetwork.textContent = formatBinaryIp(result.network);
    fields.binBroadcast.textContent = formatBinaryIp(result.broadcast);

    // Logica de subredes FLSM (opcional).
    const subnetsValue = subnetsInput.value.trim();
    if (subnetsValue) {
      const desiredSubnets = parseStrictInt(subnetsValue);
      if (desiredSubnets === null || desiredSubnets < 0) {
        setStatus(statusEl, "error", "Cantidad de subredes invalida. Usa un entero mayor o igual a 0.");
        setCidrView("summary");
        return;
      }

      // Advierte si la IP ingresada no es direccion de red.
      if (!isNetworkAddress(ipArr, prefix)) {
        setStatus(
          statusEl,
          "warning",
          "Nota: La IP ingresada no es direccion de red, se usara la red base calculada para las subredes."
        );
      }

      // Calcula subredes FLSM y valida errores.
      const subnetResult = computeSubnets(result.network, prefix, desiredSubnets);

      if (subnetResult.error) {
        setStatus(statusEl, "error", subnetResult.error);
        setCidrView("summary");
        return;
      }

      // Actualiza el resumen de subredes.
      subnetElements.chip.textContent = subnetResult.subnets.length;
      subnetElements.newMask.textContent = `/${subnetResult.newPrefix} (${formatIp(prefixToMask(subnetResult.newPrefix))})`;
      subnetElements.subnetHosts.textContent = subnetResult.subnets.length > 0
        ? subnetResult.subnets[0].usableHosts
        : "-";

      // Limpia filas existentes antes de renderizar.
      subnetElements.rows.innerHTML = "";

      // Renderiza cada subred calculada en la tabla (con fragmento para eficiencia).
      const fragment = document.createDocumentFragment();
      // Callback: sub (datos de subred), index (orden); no retorna valor, muta el DOM.
      subnetResult.subnets.forEach((sub, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="mono">${formatIp(sub.network)}/${sub.prefix}</td>
            <td class="mono">${sub.firstHost ? formatIp(sub.firstHost) : "N/A"}</td>
            <td class="mono">${sub.lastHost ? formatIp(sub.lastHost) : "N/A"}</td>
            <td class="mono">${formatIp(sub.broadcast)}</td>
            <td class="mono">${formatIp(sub.mask)}</td>
          `;
        fragment.appendChild(tr);
      });

      subnetElements.rows.appendChild(fragment);
      setCidrView("subnets");
    } else {
      // Si no se solicitan subredes, solo muestra el resumen CIDR.
      setCidrView("summary");
    }
  }

  // Enlaza handlers documentados para las acciones principales.
  exampleBtn.addEventListener("click", handleExampleClick);
  binaryToggle.addEventListener("change", handleBinaryToggleChange);
  form.addEventListener("submit", handleCidrSubmit);
}

/**
 * Inicializa la calculadora VLSM y enlaza eventos del formulario.
 * No recibe parametros.
 *
 * @returns {void}
 * Flujo:
 * - Obtiene nodos del DOM.
 * - Define helpers internos para filas y validacion.
 * - Registra handlers de UI.
 * Efectos secundarios: registra listeners y actualiza el DOM.
 */
export function initVlsmCalculator() {
  // Referencias a nodos principales del formulario VLSM.
  const form = document.getElementById("vlsm-form");
  const baseInput = document.getElementById("vlsm-base");
  const statusEl = document.getElementById("vlsm-status");
  const resultsEl = document.getElementById("vlsm-results");

  const rowsBody = document.getElementById("vlsm-rows");
  const template = document.getElementById("vlsm-row-template");
  const addRowBtn = document.getElementById("vlsm-add-row");
  const exampleBtn = document.getElementById("vlsm-example");
  const clearBtn = document.getElementById("vlsm-clear");

  // Campos de resumen y resultados VLSM.
  // Cada propiedad apunta a un nodo de salida en la UI.
  const summary = {
    baseNetwork: document.getElementById("vlsm-base-network"),
    baseMask: document.getElementById("vlsm-base-mask"),
    baseHosts: document.getElementById("vlsm-base-hosts"),
    baseTotal: document.getElementById("vlsm-base-total"),
    requestedHosts: document.getElementById("vlsm-requested-hosts"),
    usedAddresses: document.getElementById("vlsm-used-addresses"),
    remainingAddresses: document.getElementById("vlsm-remaining-addresses"),
    remainingHosts: document.getElementById("vlsm-remaining-hosts"),
    remainingRange: document.getElementById("vlsm-remaining-range"),
    chip: document.getElementById("vlsm-base-chip"),
  };

  /**
   * Agrega una fila editable para subredes VLSM.
   *
   * @param {string} name - Nombre sugerido de la subred.
   * @param {string|number} hosts - Hosts requeridos sugeridos.
   * @returns {void}
   * Flujo:
   * - Clona la plantilla de fila.
   * - Asigna valores por defecto.
   * - Registra el boton de eliminar.
   * Efectos secundarios: inserta nodos en la tabla.
   */
  function addRow(name = "", hosts = "") {
    const row = template.content.cloneNode(true);
    const nameInput = row.querySelector(".vlsm-name");
    const hostInput = row.querySelector(".vlsm-hosts");
    const removeBtn = row.querySelector(".vlsm-remove");

    nameInput.value = name;
    hostInput.value = hosts;

    /**
     * Elimina la fila actual si hay mas de una en la tabla.
     *
     * @param {MouseEvent} event - Evento click del boton quitar.
     * @returns {void}
     * Flujo:
     * - Evita el submit.
     * - Elimina la fila si existe mas de una.
     * Efectos secundarios: muta el DOM.
     */
    function handleRemoveClick(event) {
      event.preventDefault();
      const tr = removeBtn.closest("tr");
      if (rowsBody.children.length > 1) {
        tr.remove();
      }
    }

    removeBtn.addEventListener("click", handleRemoveClick);

    rowsBody.appendChild(row);
  }

  /**
   * Elimina todas las filas de subredes en pantalla.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo: limpia el contenedor de filas.
   * Efectos secundarios: muta el DOM.
   */
  function clearRows() {
    rowsBody.innerHTML = "";
  }

  /**
   * Restablece el formulario VLSM a su estado inicial.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo:
   * - Limpia campos.
   * - Reinicia filas por defecto.
   * - Oculta resultados.
   * Efectos secundarios: muta el DOM.
   */
  function resetForm() {
    baseInput.value = "";
    clearRows();
    addRow();
    addRow();
    setStatus(statusEl, null, null);
    setStatus(statusEl, null, null);
    resultsEl.hidden = true;
  }

  // Estado inicial: dos filas de subredes.
  addRow();
  addRow();

  /**
   * Agrega una fila adicional de subredes en la tabla.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo: delega en addRow para crear una nueva fila vacia.
   * Efectos secundarios: muta el DOM.
   */
  function handleAddRowClick() {
    addRow();
  }

  // Limpia el formulario VLSM.
  clearBtn.addEventListener("click", resetForm);

  /**
   * Carga un ejemplo predefinido de subredes.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo:
   * - Establece red base.
   * - Reinicia filas.
   * - Carga datos ejemplo.
   * Efectos secundarios: muta el DOM.
   */
  function handleVlsmExampleClick() {
    baseInput.value = "192.168.0.0/24";
    clearRows();
    addRow("A", 100);
    addRow("B", 50);
    addRow("C", 25);
    addRow("D", 10);
  }

  /**
   * Maneja el calculo VLSM: validacion, asignacion y render.
   *
   * @param {SubmitEvent} event - Evento submit del formulario.
   * @returns {void}
   * Flujo:
   * - Valida red base.
   * - Recopila filas y valida hosts.
   * - Ejecuta el algoritmo VLSM.
   * - Renderiza resumen y tabla.
   * Efectos secundarios: actualiza mensajes y resultados en el DOM.
   */
  function handleVlsmSubmit(event) {
    event.preventDefault();
    setStatus(statusEl, null, null);

    // Valida la red base en formato CIDR.
    const parsedBase = parseCidrInput(baseInput.value);
    if (!parsedBase) {
      setStatus(statusEl, "error", "Red base invalida. Usa formato IP/prefijo.");
      resultsEl.hidden = true;
      return;
    }

    // La red base debe ser direccion de red, no un host.
    if (!isNetworkAddress(parsedBase.ipArr, parsedBase.prefix)) {
      const baseCidr = computeCidr(parsedBase.ipArr, parsedBase.prefix);
      setStatus(
        statusEl,
        "error",
        `La IP base no es direccion de red. Usa ${formatIp(baseCidr.network)} /${parsedBase.prefix}.`
      );
      resultsEl.hidden = true;
      return;
    }

    // Recopila y valida filas de subredes con hosts.
    const subnets = [];
    const rows = Array.from(rowsBody.querySelectorAll("tr"));

    // Recorre cada fila para construir la solicitud de subredes.
    // Callback: row (fila DOM), index (posicion); no retorna valor y puede mutar subnets/status.
    rows.forEach((row, index) => {
      const nameInput = row.querySelector(".vlsm-name");
      const hostInput = row.querySelector(".vlsm-hosts");
      const nameValue = nameInput.value.trim();
      const hostValue = hostInput.value.trim();

      // Ignora filas completamente vacias.
      if (!nameValue && !hostValue) return;

      const hosts = parseStrictInt(hostValue);
      if (hosts === null || hosts <= 0) {
        setStatus(statusEl, "error", `Hosts invalidos en la fila ${index + 1}.`);
        return;
      }

      subnets.push({
        name: nameValue || `Subred ${index + 1}`,
        hosts,
      });
    });

    if (!subnets.length) {
      setStatus(statusEl, "error", "Agrega al menos una subred con hosts requeridos.");
      resultsEl.hidden = true;
      return;
    }

    // Si hubo errores en filas, se detiene el flujo antes del calculo.
    if (statusEl.getAttribute("data-type") === "error") {
      resultsEl.hidden = true;
      return;
    }

    // Ejecuta el algoritmo VLSM y muestra resultados.
    const result = computeVlsm(parsedBase.ipArr, parsedBase.prefix, subnets);
    if (result.error) {
      setStatus(statusEl, "error", result.error);
      resultsEl.hidden = true;
      return;
    }

    // Suma hosts solicitados para el resumen.
    // Callback reduce: acc (acumulado), item (subred); retorna el nuevo total.
    const requestedHosts = subnets.reduce((acc, item) => acc + item.hosts, 0);

    summary.baseNetwork.textContent = `${formatIp(result.base.network)} /${result.base.prefix}`;
    summary.baseMask.textContent = formatIp(result.base.mask);
    summary.baseHosts.textContent = result.base.usableHosts;
    summary.baseTotal.textContent = result.base.totalAddresses;
    summary.requestedHosts.textContent = requestedHosts;
    summary.usedAddresses.textContent = result.usedAddresses;
    summary.remainingAddresses.textContent = result.remaining.addresses;
    summary.remainingHosts.textContent = result.remaining.hosts;
    summary.remainingRange.textContent = result.remaining.range
      ? `${formatIp(result.remaining.range.start)} - ${formatIp(result.remaining.range.end)}`
      : "0";
    summary.chip.textContent = `/${result.base.prefix}`;

    const tbody = document.getElementById("vlsm-results-body");
    tbody.innerHTML = "";

    // Renderiza cada asignacion VLSM en la tabla.
    // Callback: allocation (bloque asignado); no retorna valor, muta el DOM.
    result.allocations.forEach((allocation) => {
      const row = document.createElement("tr");
      const maskLabel = formatIp(allocation.mask);
      const hostRange = `${formatIp(allocation.firstHost)} - ${formatIp(allocation.lastHost)}`;

      row.innerHTML = `
        <td>${allocation.name}</td>
        <td>${allocation.requiredHosts}</td>
        <td>${allocation.neededHosts}</td>
        <td class="mono">${formatIp(allocation.network)}/${allocation.prefix}</td>
        <td class="mono">${maskLabel}</td>
        <td class="mono">${hostRange}</td>
        <td class="mono">${formatIp(allocation.broadcast)}</td>
        <td>${allocation.usableHosts}</td>
        <td>${allocation.wasted}</td>
      `;

      tbody.appendChild(row);
    });

    resultsEl.hidden = false;
  }

  // Enlaza handlers documentados para la UI VLSM.
  addRowBtn.addEventListener("click", handleAddRowClick);
  exampleBtn.addEventListener("click", handleVlsmExampleClick);
  form.addEventListener("submit", handleVlsmSubmit);
}

/**
 * Inicializa el boton para ejecutar pruebas y mostrar el reporte.
 * No recibe parametros.
 *
 * @returns {void}
 * Flujo: enlaza el handler de pruebas a la UI.
 * Efectos secundarios: agrega listener y muta el DOM.
 */
export function initTestRunner() {
  const button = document.getElementById("run-tests");
  const output = document.getElementById("test-results");

  /**
   * Ejecuta pruebas unitarias en memoria y muestra el resumen.
   * No recibe parametros.
   *
   * @returns {void}
   * Flujo:
   * - Ejecuta runTests.
   * - Construye lineas de reporte legibles.
   * - Actualiza el texto de salida.
   * Efectos secundarios: muta el DOM.
   */
  function handleRunTests() {
    const report = runTests();

    // Convierte cada resultado en una linea legible del reporte.
    // Callback map: item (resultado de prueba); retorna la linea de texto.
    const lines = report.results.map((item) => {
      const status = item.pass ? "OK" : "FAIL";
      return `${status} - ${item.name} | actual: ${item.actual} | esperado: ${item.expected}`;
    });

    output.textContent = [
      `Pruebas ejecutadas: ${report.results.length}`,
      `Aprobadas: ${report.passed}`,
      `Fallidas: ${report.failed}`,
      "",
      ...lines,
    ].join("\n");
  }

  button.addEventListener("click", handleRunTests);
}

/**
 * Inicializa valores por defecto en la interfaz.
 * No recibe parametros.
 *
 * @returns {void}
 * Flujo: establece nota informativa para VLSM si existe.
 * Efectos secundarios: muta el DOM.
 */
export function initDefaults() {
  const note = document.getElementById("vlsm-note");
  if (note) note.value = "Se ordena por hosts requeridos de mayor a menor";
}
