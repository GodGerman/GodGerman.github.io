import { ipToInt, intToIp, prefixToMask } from "./ip-utils.js";

function getHostBits(neededHosts) {
  return Math.ceil(Math.log2(neededHosts));
}

export function computeVlsm(baseIpArr, basePrefix, subnets) {
  const baseMaskArr = prefixToMask(basePrefix);
  const baseMaskInt = ipToInt(baseMaskArr);
  const baseIpInt = ipToInt(baseIpArr);
  const baseNetworkInt = baseIpInt & baseMaskInt;
  const baseSize = Math.pow(2, 32 - basePrefix);
  const baseEnd = baseNetworkInt + baseSize - 1;

  const normalized = subnets
    .map((subnet, index) => {
      const requiredHosts = Number(subnet.hosts);
      const neededHosts = requiredHosts + 2;
      const hostBits = getHostBits(neededHosts);
      const blockSize = Math.pow(2, hostBits);
      const prefix = 32 - hostBits;
      return {
        index,
        name: subnet.name,
        requiredHosts,
        neededHosts,
        hostBits,
        blockSize,
        prefix,
      };
    })
    .sort((a, b) => b.neededHosts - a.neededHosts);

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
