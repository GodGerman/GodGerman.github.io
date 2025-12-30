import {
  formatBinaryIp,
  formatIp,
  isNetworkAddress,
  parseCidrInput,
  parseIp,
  parseMask,
} from "./ip-utils.js";
import { computeCidr } from "./cidr.js";
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

function toggleResults(resultsEl, emptyEl, show) {
  resultsEl.hidden = !show;
  emptyEl.hidden = show;
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

  function clearForm() {
    combinedInput.value = "";
    ipInput.value = "";
    maskInput.value = "";
    binaryToggle.checked = false;
    binaryEl.hidden = true;
    toggleResults(resultsEl, emptyEl, false);
    setStatus(statusEl, null, null);
  }

  exampleBtn.addEventListener("click", () => {
    combinedInput.value = "192.168.10.0/24";
    ipInput.value = "";
    maskInput.value = "";
  });

  clearBtn.addEventListener("click", clearForm);

  binaryToggle.addEventListener("change", () => {
    binaryEl.hidden = !binaryToggle.checked;
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
        toggleResults(resultsEl, emptyEl, false);
        return;
      }
      ipArr = parsed.ipArr;
      prefix = parsed.prefix;
    } else if (ipInput.value.trim().includes("/")) {
      const parsed = parseCidrInput(ipInput.value);
      if (!parsed) {
        setStatus(statusEl, "error", "Formato CIDR invalido en direccion IP.");
        toggleResults(resultsEl, emptyEl, false);
        return;
      }
      ipArr = parsed.ipArr;
      prefix = parsed.prefix;
    } else {
      ipArr = parseIp(ipInput.value);
      if (!ipArr) {
        setStatus(statusEl, "error", "Direccion IP invalida.");
        toggleResults(resultsEl, emptyEl, false);
        return;
      }
      prefix = parseMask(maskInput.value);
      if (prefix === null) {
        setStatus(statusEl, "error", "Mascara invalida. Usa prefijo o decimal punteada.");
        toggleResults(resultsEl, emptyEl, false);
        return;
      }
    }

    const result = computeCidr(ipArr, prefix);
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

    binaryEl.hidden = !binaryToggle.checked;
    toggleResults(resultsEl, emptyEl, true);
  });
}

export function initVlsmCalculator() {
  const form = document.getElementById("vlsm-form");
  const baseInput = document.getElementById("vlsm-base");
  const statusEl = document.getElementById("vlsm-status");
  const resultsEl = document.getElementById("vlsm-results");
  const emptyEl = document.getElementById("vlsm-empty");
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
    toggleResults(resultsEl, emptyEl, false);
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
      toggleResults(resultsEl, emptyEl, false);
      return;
    }

    if (!isNetworkAddress(parsedBase.ipArr, parsedBase.prefix)) {
      const baseCidr = computeCidr(parsedBase.ipArr, parsedBase.prefix);
      setStatus(
        statusEl,
        "error",
        `La IP base no es direccion de red. Usa ${formatIp(baseCidr.network)} /${parsedBase.prefix}.`
      );
      toggleResults(resultsEl, emptyEl, false);
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

      const hosts = Number(hostValue);
      if (!hostValue || Number.isNaN(hosts) || hosts <= 0 || !Number.isSafeInteger(hosts)) {
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
      toggleResults(resultsEl, emptyEl, false);
      return;
    }

    if (statusEl.getAttribute("data-type") === "error") {
      toggleResults(resultsEl, emptyEl, false);
      return;
    }

    const result = computeVlsm(parsedBase.ipArr, parsedBase.prefix, subnets);
    if (result.error) {
      setStatus(statusEl, "error", result.error);
      toggleResults(resultsEl, emptyEl, false);
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
      const maskLabel = `${formatIp(allocation.mask)} /${allocation.prefix}`;
      const hostRange = `${formatIp(allocation.firstHost)} - ${formatIp(allocation.lastHost)}`;

      row.innerHTML = `
        <td>${allocation.name}</td>
        <td>${allocation.requiredHosts}</td>
        <td>${allocation.neededHosts}</td>
        <td class="mono">${formatIp(allocation.network)} /${allocation.prefix}</td>
        <td class="mono">${maskLabel}</td>
        <td class="mono">${hostRange}</td>
        <td class="mono">${formatIp(allocation.broadcast)}</td>
        <td>${allocation.usableHosts}</td>
        <td>${allocation.wasted}</td>
      `;

      tbody.appendChild(row);
    });

    toggleResults(resultsEl, emptyEl, true);
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

