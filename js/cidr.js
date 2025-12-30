import { ipToInt, intToIp, prefixToMask } from "./ip-utils.js";

export function computeCidr(ipArr, prefix) {
  const maskArr = prefixToMask(prefix);
  const maskInt = ipToInt(maskArr);
  const ipInt = ipToInt(ipArr);
  const networkInt = ipInt & maskInt;
  const broadcastInt = (networkInt | (~maskInt)) >>> 0;
  const totalAddresses = Math.pow(2, 32 - prefix);
  const usableHosts = Math.max(totalAddresses - 2, 0);
  const firstHostInt = totalAddresses > 2 ? networkInt + 1 : null;
  const lastHostInt = totalAddresses > 2 ? broadcastInt - 1 : null;

  return {
    ip: ipArr,
    prefix,
    mask: maskArr,
    wildcard: intToIp((~maskInt) >>> 0),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstHost: firstHostInt ? intToIp(firstHostInt) : null,
    lastHost: lastHostInt ? intToIp(lastHostInt) : null,
    totalAddresses,
    usableHosts,
  };
}
