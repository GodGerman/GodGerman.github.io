/**
 * Calculos VLSM para IPv4.
 *
 * Implementa asignacion de bloques contiguos segun hosts requeridos.
 * Este modulo es puro y no tiene efectos secundarios.
 */
import { ipToInt, intToIp, prefixToMask, isValidIpArray } from "./ip-utils.js";

/**
 * Maximo teorico de hosts utilizables (sin contar red/broadcast) en IPv4.
 *
 * Se usa para validar entradas absurdamente grandes.
 */
const MAX_HOSTS = Math.pow(2, 32) - 2;

/**
 * Calcula la cantidad de bits necesarios para alojar hosts requeridos.
 *
 * @param {number} neededHosts - Hosts requeridos incluyendo red y broadcast.
 * @returns {number} Bits de host necesarios (ceil(log2)).
 * Flujo:
 * - Usa log2 para calcular el numero de direcciones potencias de 2.
 * - Redondea hacia arriba para garantizar capacidad suficiente.
 * Efectos secundarios: ninguno.
 */
function getHostBits(neededHosts) {
  return Math.ceil(Math.log2(neededHosts));
}

/*
 * Algoritmo VLSM (resumen):
 * 1) neededHosts = requiredHosts + 2 (red + broadcast).
 * 2) Ordenar subredes por neededHosts desc.
 * 3) hostBits = ceil(log2(neededHosts)), prefix = 32 - hostBits.
 * 4) Asignar bloques contiguos desde baseNetwork con un cursor.
 * 5) Validar que cada bloque no exceda baseEnd.
 *
 * La estrategia de ordenar de mayor a menor minimiza la fragmentacion.
 */
/**
 * Asigna subredes VLSM dentro de una red base.
 *
 * @param {number[]} baseIpArr - IP base en arreglo (debe ser direccion de red).
 * @param {number} basePrefix - Prefijo de la red base.
 * @param {Array<{name: string, hosts: number}>} subnets - Subredes solicitadas.
 * @returns {object} Resultado con asignaciones y resumen, o { error } si falla.
 * Flujo:
 * - Valida red base y prefijo.
 * - Normaliza subredes (nombre, hosts, prefijo y bloque requerido).
 * - Ordena por hosts requeridos para minimizar fragmentacion.
 * - Asigna bloques contiguos y calcula remanente.
 * Efectos secundarios: ninguno.
 */
export function computeVlsm(baseIpArr, basePrefix, subnets) {
  // Valida la IP base.
  if (!isValidIpArray(baseIpArr)) {
    return { error: "Red base invalida." };
  }

  // Valida el prefijo base.
  if (!Number.isInteger(basePrefix) || basePrefix < 0 || basePrefix > 32) {
    return { error: "Prefijo base invalido." };
  }

  // Genera mascara de red base.
  const baseMaskArr = prefixToMask(basePrefix);
  if (!baseMaskArr) {
    return { error: "Prefijo base invalido." };
  }

  // Convierte base a enteros para operar con rangos.
  const baseMaskInt = ipToInt(baseMaskArr);
  const baseIpInt = ipToInt(baseIpArr);
  const baseNetworkInt = (baseIpInt & baseMaskInt) >>> 0;
  const baseSize = Math.pow(2, 32 - basePrefix);
  // baseEnd es la ultima direccion incluida en la red base.
  const baseEnd = baseNetworkInt + baseSize - 1;

  // La IP base debe ser direccion de red para que los bloques inicien alineados.
  if (baseNetworkInt !== baseIpInt) {
    return { error: "La IP base no es direccion de red." };
  }

  // Verifica que haya subredes solicitadas.
  if (!Array.isArray(subnets) || subnets.length === 0) {
    return { error: "Agrega al menos una subred con hosts requeridos." };
  }

  // Normaliza y valida cada subred solicitada.
  const normalized = [];
  for (let index = 0; index < subnets.length; index++) {
    const subnet = subnets[index] || {};

    // Nombre por defecto si no viene definido.
    const rawName = typeof subnet.name === "string" ? subnet.name.trim() : "";
    const name = rawName || `Subred ${index + 1}`;

    // Hosts requeridos deben ser un entero positivo.
    const requiredHosts = Number(subnet.hosts);
    if (!Number.isSafeInteger(requiredHosts) || requiredHosts <= 0) {
      return { error: `Hosts invalidos en la subred ${index + 1}.` };
    }

    // Limite teorico de hosts permitidos.
    if (requiredHosts > MAX_HOSTS) {
      return { error: `Hosts exceden el maximo permitido (${MAX_HOSTS}).` };
    }

    // Suma 2 direcciones para red y broadcast.
    const neededHosts = requiredHosts + 2;

    // Calcula bits de host y bloque necesario.
    const hostBits = getHostBits(neededHosts);
    if (!Number.isFinite(hostBits) || hostBits > 32) {
      return { error: `Hosts exceden el maximo permitido (${MAX_HOSTS}).` };
    }

    // blockSize es el total de direcciones del bloque (incluye red/broadcast).
    const blockSize = Math.pow(2, hostBits);
    const prefix = 32 - hostBits;

    normalized.push({
      index,
      name,
      requiredHosts,
      neededHosts,
      hostBits,
      blockSize,
      prefix,
    });
  }

  // Ordena de mayor a menor para minimizar fragmentacion.
  // Callback de orden: compara cantidad de hosts requeridos por bloque.
  normalized.sort((a, b) => b.neededHosts - a.neededHosts);

  // cursor indica el inicio libre del siguiente bloque.
  let cursor = baseNetworkInt;
  let usedAddresses = 0;
  const allocations = [];

  // Asigna bloques contiguos dentro del rango de la red base.
  for (const item of normalized) {
    const networkInt = cursor;
    const broadcastInt = networkInt + item.blockSize - 1;

    // Verifica que el bloque solicitado no exceda la red base.
    if (broadcastInt > baseEnd) {
      return {
        error: `La red base no tiene espacio suficiente para ${item.name}.`,
      };
    }

    // Calcula rango de hosts utilizables.
    const firstHostInt = networkInt + 1;
    const lastHostInt = broadcastInt - 1;
    const usableHosts = item.blockSize - 2;
    // Direcciones desperdiciadas dentro del bloque asignado.
    const wasted = usableHosts - item.requiredHosts;

    // Guarda la asignacion con todos los campos necesarios para la UI.
    allocations.push({
      name: item.name,
      requiredHosts: item.requiredHosts,
      neededHosts: item.neededHosts,
      prefix: item.prefix,
      mask: prefixToMask(item.prefix),
      network: intToIp(networkInt),
      broadcast: intToIp(broadcastInt),
      firstHost: intToIp(firstHostInt),
      lastHost: intToIp(lastHostInt),
      usableHosts,
      wasted,
      blockSize: item.blockSize,
    });

    // Avanza cursor al siguiente bloque libre.
    cursor = broadcastInt + 1;
    usedAddresses += item.blockSize;
  }

  // Calcula remanente disponible en la red base.
  const remainingAddresses = baseSize - usedAddresses;
  const remainingHosts = Math.max(remainingAddresses - 2, 0);

  // Rango restante solo si aun quedan direcciones en el bloque base.
  const remainingRange = remainingAddresses > 0
    ? { start: intToIp(cursor), end: intToIp(baseEnd) }
    : null;

  return {
    base: {
      network: intToIp(baseNetworkInt),
      prefix: basePrefix,
      mask: baseMaskArr,
      totalAddresses: baseSize,
      usableHosts: Math.max(baseSize - 2, 0),
    },
    allocations,
    usedAddresses,
    remaining: {
      addresses: remainingAddresses,
      hosts: remainingHosts,
      range: remainingRange,
    },
  };
}
