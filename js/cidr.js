import { ipToInt, intToIp, prefixToMask, isValidIpArray } from "./ip-utils.js";

const MAX_SUBNET_RESULTS = 4096;

export function computeCidr(ipArr, prefix) {
  if (!isValidIpArray(ipArr)) {
    return { error: "Direccion IP invalida." };
  }
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return { error: "Prefijo invalido." };
  }
  const maskArr = prefixToMask(prefix);
  if (!maskArr) {
    return { error: "Prefijo invalido." };
  }
  const maskInt = ipToInt(maskArr);
  const ipInt = ipToInt(ipArr);
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt)) >>> 0;
  const totalAddresses = Math.pow(2, 32 - prefix);
  const usableHosts = Math.max(totalAddresses - 2, 0);
  const firstHostInt = totalAddresses > 2 ? networkInt + 1 : null;
  const lastHostInt = totalAddresses > 2 ? broadcastInt - 1 : null;
  const firstHost = firstHostInt !== null ? intToIp(firstHostInt) : null;
  const lastHost = lastHostInt !== null ? intToIp(lastHostInt) : null;

  return {
    ip: ipArr,
    prefix,
    mask: maskArr,
    wildcard: intToIp((~maskInt) >>> 0),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstHost,
    lastHost,
    totalAddresses,
    usableHosts,
  };
}

export function computeSubnets(ipArr, currentPrefix, desiredSubnets) {
  if (!isValidIpArray(ipArr)) {
    return { error: "Direccion IP invalida para subredes." };
  }
  if (!Number.isInteger(currentPrefix) || currentPrefix < 0 || currentPrefix > 32) {
    return { error: "Prefijo invalido para subredes." };
  }
  if (!Number.isSafeInteger(desiredSubnets) || desiredSubnets <= 0) {
    return { error: "Cantidad de subredes invalida." };
  }
  const borrowedBits = Math.log2(desiredSubnets);
  if (!Number.isInteger(borrowedBits)) {
    return { error: "Cantidad de subredes invalida. Usa una potencia de 2." };
  }
  const newPrefix = currentPrefix + borrowedBits;

  // Maximum prefix is 32, but practically for subnets usually 30 or 32 depending on use case.
  // We'll allow up to 32 but typically you need hosts.
  if (newPrefix > 32) return { error: "No es posible generar esa cantidad de subredes con el prefijo actual." };

  const totalSubnets = desiredSubnets;
  if (totalSubnets > MAX_SUBNET_RESULTS) {
    return {
      error: `Demasiadas subredes para mostrar (maximo ${MAX_SUBNET_RESULTS}).`,
    };
  }

  // Safety check for massive rendering, though logic handles it.
  // 65536 subnets might freeze UI if we render all.
  // The user prompt specifically showed 256. 

  const subnets = [];
  const ipInt = ipToInt(ipArr);

  // Ensure we start from the network address of the current block
  const maskArr = prefixToMask(currentPrefix);
  if (!maskArr) {
    return { error: "Prefijo invalido para subredes." };
  }
  const maskInt = ipToInt(maskArr);
  const baseNetworkInt = (ipInt & maskInt) >>> 0;

  // Calculate increment step
  // 2^(32 - newPrefix)
  // Shift can be tricky with 32 bits in JS (treated as signed 32-bit for bitwise operators).
  // Using Math.pow is safer for the step size.
  const increment = Math.pow(2, 32 - newPrefix);

  for (let i = 0; i < totalSubnets; i++) {
    // We need to handle potential unsigned 32-bit wrap around or just large numbers.
    // In JS bitwise operations cast to Int32.
    // Using simple arithmetic with standard Numbers (doubles) is safer for IPs > 2^31.
    // However, ipToInt returns unsigned >>> 0.

    // We can use the logic:
    const currentSubnetInt = (baseNetworkInt + (i * increment)) >>> 0;
    const currentSubnetIp = intToIp(currentSubnetInt);

    const cidrData = computeCidr(currentSubnetIp, newPrefix);
    if (cidrData.error) {
      return { error: "No se pudo calcular las subredes solicitadas." };
    }
    subnets.push(cidrData);
  }

  return {
    subnets,
    newPrefix,
    totalSubnetsGenerated: totalSubnets,
    borrowedBits
  };
}
