export const IP_BITS = 32;

export function parseIp(ipStr) {
  if (!ipStr) return null;
  const parts = ipStr.trim().split(".");
  if (parts.length !== 4) return null;
  const nums = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!/^\d{1,3}$/.test(trimmed)) return null;
    const value = Number.parseInt(trimmed, 10);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    nums.push(value);
  }
  return nums;
}

export function isValidIpArray(ipArr) {
  if (!Array.isArray(ipArr) || ipArr.length !== 4) return false;
  return ipArr.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255
  );
}

export function formatIp(ipArr) {
  return ipArr.join(".");
}

export function ipToInt(ipArr) {
  return (
    ((ipArr[0] << 24) >>> 0) +
    (ipArr[1] << 16) +
    (ipArr[2] << 8) +
    ipArr[3]
  ) >>> 0;
}

export function intToIp(ipInt) {
  return [
    (ipInt >>> 24) & 255,
    (ipInt >>> 16) & 255,
    (ipInt >>> 8) & 255,
    ipInt & 255,
  ];
}

export function prefixToMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  if (prefix === 0) return [0, 0, 0, 0];
  const maskInt = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(maskInt);
}

export function maskToPrefix(maskArr) {
  if (!isValidIpArray(maskArr)) return null;
  // Accept only contiguous 1s followed by 0s.
  const bitString = maskArr
    .map((octet) => octet.toString(2).padStart(8, "0"))
    .join("");

  if (!/^1*0*$/.test(bitString)) return null;

  if (bitString.indexOf("0") === -1) return 32;
  return bitString.indexOf("0");
}

export function parsePrefix(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const raw = trimmed.startsWith("/") ? trimmed.slice(1).trim() : trimmed;
  if (!/^\d{1,2}$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 32) return null;
  return value;
}

export function parseMask(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  if (trimmed.includes(".")) {
    const maskArr = parseIp(trimmed);
    if (!maskArr) return null;
    return maskToPrefix(maskArr);
  }
  return parsePrefix(trimmed);
}

export function parseCidrInput(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed.includes("/")) return null;
  const parts = trimmed.split("/");
  if (parts.length !== 2) return null;
  const [ipStr, prefixStr] = parts;
  if (!ipStr.trim() || !prefixStr.trim()) return null;
  const ipArr = parseIp(ipStr);
  const prefix = parsePrefix(prefixStr);
  if (!ipArr || prefix === null) return null;
  return { ipArr, prefix };
}

export function formatBinaryIp(ipArr) {
  return ipArr.map((octet) => octet.toString(2).padStart(8, "0")).join(".");
}

export function isNetworkAddress(ipArr, prefix) {
  if (!isValidIpArray(ipArr)) return false;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const maskArr = prefixToMask(prefix);
  if (!maskArr) return false;
  const maskInt = ipToInt(maskArr);
  const ipInt = ipToInt(ipArr);
  return (ipInt & maskInt) >>> 0 === ipInt >>> 0;
}
