import { ipToInt, intToIp, prefixToMask, isValidIpArray } from "./ip-utils.js";

const MAX_HOSTS = Math.pow(2, 32) - 2;

function getHostBits(neededHosts) {
  return Math.ceil(Math.log2(neededHosts));
}

export function computeVlsm(baseIpArr, basePrefix, subnets) {
  if (!isValidIpArray(baseIpArr)) {
    return { error: "Red base invalida." };
  }
  if (!Number.isInteger(basePrefix) || basePrefix < 0 || basePrefix > 32) {
    return { error: "Prefijo base invalido." };
  }

  const baseMaskArr = prefixToMask(basePrefix);
  if (!baseMaskArr) {
    return { error: "Prefijo base invalido." };
  }
  const baseMaskInt = ipToInt(baseMaskArr);
  const baseIpInt = ipToInt(baseIpArr);
  const baseNetworkInt = (baseIpInt & baseMaskInt) >>> 0;
  const baseSize = Math.pow(2, 32 - basePrefix);
  const baseEnd = baseNetworkInt + baseSize - 1;

  if (baseNetworkInt !== baseIpInt) {
    return { error: "La IP base no es direccion de red." };
  }
  if (!Array.isArray(subnets) || subnets.length === 0) {
    return { error: "Agrega al menos una subred con hosts requeridos." };
  }

  const normalized = [];
  for (let index = 0; index < subnets.length; index++) {
    const subnet = subnets[index] || {};
    const rawName = typeof subnet.name === "string" ? subnet.name.trim() : "";
    const name = rawName || `Subred ${index + 1}`;
    const requiredHosts = Number(subnet.hosts);
    if (!Number.isSafeInteger(requiredHosts) || requiredHosts <= 0) {
      return { error: `Hosts invalidos en la subred ${index + 1}.` };
    }
    if (requiredHosts > MAX_HOSTS) {
      return { error: `Hosts exceden el maximo permitido (${MAX_HOSTS}).` };
    }
    const neededHosts = requiredHosts + 2;
    const hostBits = getHostBits(neededHosts);
    if (!Number.isFinite(hostBits) || hostBits > 32) {
      return { error: `Hosts exceden el maximo permitido (${MAX_HOSTS}).` };
    }
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
  normalized.sort((a, b) => b.neededHosts - a.neededHosts);

  let cursor = baseNetworkInt;
  let usedAddresses = 0;
  const allocations = [];

  // Allocate contiguous blocks inside the base network range.
  for (const item of normalized) {
    const networkInt = cursor;
    const broadcastInt = networkInt + item.blockSize - 1;

    if (broadcastInt > baseEnd) {
      return {
        error: `La red base no tiene espacio suficiente para ${item.name}.`,
      };
    }

    const firstHostInt = networkInt + 1;
    const lastHostInt = broadcastInt - 1;
    const usableHosts = item.blockSize - 2;
    const wasted = usableHosts - item.requiredHosts;

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

    cursor = broadcastInt + 1;
    usedAddresses += item.blockSize;
  }

  const remainingAddresses = baseSize - usedAddresses;
  const remainingHosts = Math.max(remainingAddresses - 2, 0);
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
