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

function setStatus(element, type, message) {
  if (!message) {
    element.textContent = "";
    element.removeAttribute("data-type");
    return;
  }
  element.textContent = message;
  element.setAttribute("data-type", type);
}

function parseStrictInt(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

export function initCidrCalculator() {
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

  const subnetElements = {
    container: document.getElementById("cidr-subnet-results"),
    rows: document.getElementById("cidr-subnet-rows"),
    chip: document.getElementById("cidr-subnet-count-chip"),
    newMask: document.getElementById("cidr-new-mask"),
    subnetHosts: document.getElementById("cidr-subnet-hosts"),
  };

  let cidrView = "empty";

  function setCidrView(view) {
    cidrView = view;
    const showSummary = view === "summary" || view === "subnets";
    const showSubnets = view === "subnets";
    resultsEl.hidden = !showSummary;
    subnetElements.container.hidden = !showSubnets;
    if (emptyEl) emptyEl.hidden = showSummary || showSubnets;
    if (binaryEl) binaryEl.hidden = showSummary ? !binaryToggle.checked : true;
  }

  function clearForm() {
    combinedInput.value = "";
    ipInput.value = "";
    maskInput.value = "";
    binaryToggle.checked = false;
    subnetsInput.value = "";
    setCidrView("empty");
    setStatus(statusEl, null, null);
  }

  exampleBtn.addEventListener("click", () => {
    combinedInput.value = "192.168.10.0/24";
    ipInput.value = "";
    maskInput.value = "";
  });

  clearBtn.addEventListener("click", clearForm);

  binaryToggle.addEventListener("change", () => {
    const showSummary = cidrView === "summary" || cidrView === "subnets";
    binaryEl.hidden = showSummary ? !binaryToggle.checked : true;
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus(statusEl, null, null);

    let ipArr = null;
    let prefix = null;

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

    const result = computeCidr(ipArr, prefix);
    if (result.error) {
      setStatus(statusEl, "error", result.error);
      setCidrView("empty");
      return;
    }
    const range = result.firstHost && result.lastHost
      ? `${formatIp(result.firstHost)} - ${formatIp(result.lastHost)}`
      : "N/A";

    fields.network.textContent = formatIp(result.network);
    fields.hostRange.textContent = range;
    fields.broadcast.textContent = formatIp(result.broadcast);
    fields.maskDec.textContent = formatIp(result.mask);
    fields.maskPrefix.textContent = `/${result.prefix}`;
    fields.hosts.textContent = result.usableHosts;
    fields.total.textContent = result.totalAddresses;
    fields.wildcard.textContent = formatIp(result.wildcard);
    fields.chip.textContent = `/${result.prefix}`;

    fields.binIp.textContent = formatBinaryIp(result.ip);
    fields.binMask.textContent = formatBinaryIp(result.mask);
    fields.binNetwork.textContent = formatBinaryIp(result.network);
    fields.binBroadcast.textContent = formatBinaryIp(result.broadcast);

    // Subnet Calculation Logic
    const subnetsValue = subnetsInput.value.trim();
    if (subnetsValue) {
      const desiredSubnets = parseStrictInt(subnetsValue);
      if (desiredSubnets === null || desiredSubnets <= 0) {
        setStatus(statusEl, "error", "Cantidad de subredes invalida. Usa un entero positivo.");
        setCidrView("summary");
        return;
      }
      if (!isNetworkAddress(ipArr, prefix)) {
        setStatus(statusEl, "warning", "Nota: La IP ingresada no es direccion de red, se usara la red base calculada para las subredes.");
      }

      const subnetResult = computeSubnets(result.network, prefix, desiredSubnets);

      if (subnetResult.error) {
        setStatus(statusEl, "error", subnetResult.error);
        setCidrView("summary");
        return;
      } else {
        subnetElements.chip.textContent = subnetResult.subnets.length;
        subnetElements.newMask.textContent = `/${subnetResult.newPrefix} (${formatIp(prefixToMask(subnetResult.newPrefix))})`;
        subnetElements.subnetHosts.textContent = subnetResult.subnets.length > 0 ? subnetResult.subnets[0].usableHosts : "-";

        subnetElements.rows.innerHTML = "";

        const fragment = document.createDocumentFragment();
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
      }
    } else {
      setCidrView("summary");
    }
  });
}

export function initVlsmCalculator() {
  const form = document.getElementById("vlsm-form");
  const baseInput = document.getElementById("vlsm-base");
  const statusEl = document.getElementById("vlsm-status");
  const resultsEl = document.getElementById("vlsm-results");

  const rowsBody = document.getElementById("vlsm-rows");
  const template = document.getElementById("vlsm-row-template");
  const addRowBtn = document.getElementById("vlsm-add-row");
  const exampleBtn = document.getElementById("vlsm-example");
  const clearBtn = document.getElementById("vlsm-clear");

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

  function addRow(name = "", hosts = "") {
    const row = template.content.cloneNode(true);
    const nameInput = row.querySelector(".vlsm-name");
    const hostInput = row.querySelector(".vlsm-hosts");
    const removeBtn = row.querySelector(".vlsm-remove");

    nameInput.value = name;
    hostInput.value = hosts;

    removeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const tr = removeBtn.closest("tr");
      if (rowsBody.children.length > 1) {
        tr.remove();
      }
    });

    rowsBody.appendChild(row);
  }

  function clearRows() {
    rowsBody.innerHTML = "";
  }

  function resetForm() {
    baseInput.value = "";
    clearRows();
    addRow();
    addRow();
    setStatus(statusEl, null, null);
    setStatus(statusEl, null, null);
    resultsEl.hidden = true;
  }

  addRow();
  addRow();

  addRowBtn.addEventListener("click", () => addRow());
  clearBtn.addEventListener("click", resetForm);

  exampleBtn.addEventListener("click", () => {
    baseInput.value = "192.168.0.0/24";
    clearRows();
    addRow("A", 100);
    addRow("B", 50);
    addRow("C", 25);
    addRow("D", 10);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus(statusEl, null, null);

    const parsedBase = parseCidrInput(baseInput.value);
    if (!parsedBase) {
      setStatus(statusEl, "error", "Red base invalida. Usa formato IP/prefijo.");
      resultsEl.hidden = true;
      return;
    }

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

    const subnets = [];
    const rows = Array.from(rowsBody.querySelectorAll("tr"));

    rows.forEach((row, index) => {
      const nameInput = row.querySelector(".vlsm-name");
      const hostInput = row.querySelector(".vlsm-hosts");
      const nameValue = nameInput.value.trim();
      const hostValue = hostInput.value.trim();

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

    if (statusEl.getAttribute("data-type") === "error") {
      resultsEl.hidden = true;
      return;
    }

    const result = computeVlsm(parsedBase.ipArr, parsedBase.prefix, subnets);
    if (result.error) {
      setStatus(statusEl, "error", result.error);
      resultsEl.hidden = true;
      return;
    }

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
  });
}

export function initTestRunner() {
  const button = document.getElementById("run-tests");
  const output = document.getElementById("test-results");

  button.addEventListener("click", () => {
    const report = runTests();
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
  });
}



export function initDefaults() {
  const note = document.getElementById("vlsm-note");
  if (note) note.value = "Se ordena por hosts requeridos de mayor a menor";
}

