/**
 * Utilidades para IPv4: parseo, validacion y conversiones.
 *
 * Todas las funciones son puras: no mutan estado global ni el DOM.
 * Se exportan constantes y helpers para reutilizar en calculos CIDR/VLSM.
 *
 * Nota tecnica:
 * - JavaScript opera bitwise en 32 bits con signo.
 * - Se fuerza a unsigned con >>> 0 para evitar negativos.
 */

/**
 * Cantidad de bits de una direccion IPv4.
 *
 * Se usa como referencia para validaciones, calculos de mascara y rangos.
 */
export const IP_BITS = 32;

/*
 * Representaciones usadas en el proyecto:
 * - Arreglo [a, b, c, d] para lectura humana y entrada/salida.
 * - Entero unsigned (0..2^32-1) para operaciones y rangos.
 *
 * Esta dualidad simplifica:
 * - Validacion humana en entradas.
 * - Calculos de red/broadcast con bitwise y sumas.
 */

/**
 * Convierte una cadena IPv4 en un arreglo de 4 octetos.
 *
 * @param {string} ipStr - Cadena en formato "a.b.c.d".
 * @returns {number[]|null} Arreglo de 4 enteros [0-255] o null si es invalida.
 * Flujo:
 * - Verifica que exista entrada.
 * - Divide por puntos y valida que haya 4 partes.
 * - Valida formato decimal estricto (solo digitos).
 * - Valida rango por octeto (0-255).
 * Efectos secundarios: ninguno.
 */
export function parseIp(ipStr) {
  // Validacion rapida de presencia de datos.
  if (!ipStr) return null;

  // Normaliza espacios y separa en octetos.
  const parts = ipStr.trim().split(".");

  // Debe contener exactamente 4 octetos.
  if (parts.length !== 4) return null;

  const nums = [];
  for (const part of parts) {
    // Elimina espacios alrededor de cada octeto.
    const trimmed = part.trim();

    // Acepta solo digitos (sin signos, ni decimales, ni espacios intermedios).
    if (!/^\d{1,3}$/.test(trimmed)) return null;

    // Convierte a entero en base 10.
    const value = Number.parseInt(trimmed, 10);

    // Verifica rango IPv4 valido (0-255).
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;

    nums.push(value);
  }

  // Retorna arreglo validado de 4 octetos.
  return nums;
}

/**
 * Verifica si un arreglo representa una IPv4 valida.
 *
 * @param {number[]} ipArr - Arreglo esperado de 4 enteros.
 * @returns {boolean} true si cada octeto es entero y esta entre 0 y 255.
 * Flujo:
 * - Verifica que sea arreglo y tenga longitud 4.
 * - Evalua cada octeto con una condicion de rango y tipo entero.
 * Efectos secundarios: ninguno.
 */
export function isValidIpArray(ipArr) {
  // Valida que la entrada sea un arreglo de longitud exacta.
  if (!Array.isArray(ipArr) || ipArr.length !== 4) return false;

  // Verifica que cada octeto sea entero y este en el rango permitido.
  return ipArr.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255
  );
}

/**
 * Formatea un arreglo IPv4 a cadena "a.b.c.d".
 *
 * @param {number[]} ipArr - Arreglo de 4 octetos.
 * @returns {string} Representacion en formato decimal punteado.
 * Flujo: concatena los octetos con "." sin validacion adicional.
 * Efectos secundarios: ninguno.
 * Nota: se asume que ipArr es valido.
 */
export function formatIp(ipArr) {
  return ipArr.join(".");
}

/**
 * Convierte un arreglo IPv4 a entero sin signo de 32 bits.
 *
 * @param {number[]} ipArr - Arreglo de 4 octetos.
 * @returns {number} Entero unsigned (0 a 2^32 - 1).
 * Flujo:
 * - Desplaza cada octeto a su posicion (24, 16, 8, 0).
 * - Suma y fuerza a unsigned con >>> 0 para evitar negativos.
 * Efectos secundarios: ninguno.
 */
export function ipToInt(ipArr) {
  return (
    ((ipArr[0] << 24) >>> 0) +
    (ipArr[1] << 16) +
    (ipArr[2] << 8) +
    ipArr[3]
  ) >>> 0;
}

/**
 * Convierte un entero de 32 bits a arreglo IPv4.
 *
 * @param {number} ipInt - Entero unsigned.
 * @returns {number[]} Arreglo de 4 octetos [0-255].
 * Flujo: extrae octetos con desplazamientos y mascara 255.
 * Efectos secundarios: ninguno.
 */
export function intToIp(ipInt) {
  return [
    (ipInt >>> 24) & 255,
    (ipInt >>> 16) & 255,
    (ipInt >>> 8) & 255,
    ipInt & 255,
  ];
}

/**
 * Genera la mascara decimal punteada a partir de un prefijo CIDR.
 *
 * @param {number} prefix - Prefijo CIDR entre 0 y 32.
 * @returns {number[]|null} Arreglo de mascara o null si el prefijo es invalido.
 * Flujo:
 * - Valida el rango del prefijo (0-32).
 * - Maneja /0 como caso especial (sin bits en 1).
 * - Construye la mascara con desplazamiento de bits.
 * Efectos secundarios: ninguno.
 */
export function prefixToMask(prefix) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  if (prefix === 0) return [0, 0, 0, 0];

  // 0xffffffff << (32 - prefix) genera bits contiguos en 1 desde la izquierda.
  const maskInt = (0xffffffff << (32 - prefix)) >>> 0;
  return intToIp(maskInt);
}

/**
 * Convierte una mascara decimal punteada a prefijo CIDR.
 *
 * @param {number[]} maskArr - Mascara como arreglo de 4 octetos.
 * @returns {number|null} Prefijo (0-32) o null si la mascara no es valida.
 * Flujo:
 * - Valida el arreglo de mascara.
 * - Convierte a cadena binaria de 32 bits.
 * - Acepta solo secuencias contiguas de 1 seguidas de 0.
 * - Si es valida, el prefijo es el indice del primer 0.
 * Efectos secundarios: ninguno.
 */
export function maskToPrefix(maskArr) {
  if (!isValidIpArray(maskArr)) return null;

  // Convierte cada octeto a 8 bits y concatena en 32 bits.
  const bitString = maskArr
    .map((octet) => octet.toString(2).padStart(8, "0"))
    .join("");

  // La mascara debe tener solo 1s seguidos por 0s (sin interrupciones).
  if (!/^1*0*$/.test(bitString)) return null;

  // Si no hay ceros, el prefijo es /32; si hay, el indice del primer 0.
  if (bitString.indexOf("0") === -1) return 32;
  return bitString.indexOf("0");
}

/**
 * Parsea un prefijo CIDR desde texto.
 *
 * @param {string|number} input - Ej. "/24" o "24".
 * @returns {number|null} Prefijo entre 0 y 32 o null si es invalido.
 * Flujo:
 * - Normaliza a string y elimina espacios.
 * - Remueve un "/" inicial si existe.
 * - Valida formato numerico y rango (0-32).
 * Efectos secundarios: ninguno.
 */
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

/**
 * Parsea una mascara en formato prefijo o decimal punteado.
 *
 * @param {string|number} input - Ej. "/24" o "255.255.255.0".
 * @returns {number|null} Prefijo CIDR o null si la mascara es invalida.
 * Flujo:
 * - Si contiene puntos, interpreta como mascara decimal punteada.
 * - Si no contiene puntos, interpreta como prefijo.
 * Efectos secundarios: ninguno.
 */
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

/**
 * Parsea una entrada en formato CIDR "IP/prefijo".
 *
 * @param {string} input - Cadena con separador "/".
 * @returns {{ ipArr: number[], prefix: number }|null} Objeto parseado o null.
 * Flujo:
 * - Verifica formato con separador "/".
 * - Separa IP y prefijo.
 * - Valida cada parte con utilidades especificas.
 * Efectos secundarios: ninguno.
 */
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

/**
 * Convierte una IPv4 a representacion binaria "xxxxxxxx.xxxxxxxx.xxxxxxxx.xxxxxxxx".
 *
 * @param {number[]} ipArr - Arreglo de 4 octetos.
 * @returns {string} Cadena binaria con padding a 8 bits por octeto.
 * Flujo: convierte cada octeto a binario y concatena con ".".
 * Efectos secundarios: ninguno.
 */
export function formatBinaryIp(ipArr) {
  // Callback: convierte cada octeto a binario con padding de 8 bits.
  return ipArr.map((octet) => octet.toString(2).padStart(8, "0")).join(".");
}

/**
 * Verifica si una IP es direccion de red para un prefijo dado.
 *
 * @param {number[]} ipArr - IP en arreglo.
 * @param {number} prefix - Prefijo CIDR.
 * @returns {boolean} true si la IP coincide con su network address.
 * Flujo:
 * - Valida IP y prefijo.
 * - Calcula mascara y aplica AND.
 * - Compara con la IP original (si coincide, es red).
 * Efectos secundarios: ninguno.
 */
export function isNetworkAddress(ipArr, prefix) {
  if (!isValidIpArray(ipArr)) return false;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const maskArr = prefixToMask(prefix);
  if (!maskArr) return false;

  const maskInt = ipToInt(maskArr);
  const ipInt = ipToInt(ipArr);

  return (ipInt & maskInt) >>> 0 === ipInt >>> 0;
}
