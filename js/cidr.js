/**
 * Calculos CIDR y FLSM para IPv4.
 *
 * Este modulo expone utilidades puras: no muta el estado global ni el DOM.
 * Se apoya en conversiones a entero para aplicar operaciones bitwise.
 */
import { ipToInt, intToIp, prefixToMask, isValidIpArray } from "./ip-utils.js";

/**
 * Limite superior de subredes a devolver para evitar bloqueos en UI.
 *
 * Este limite no altera el calculo; solo restringe la cantidad mostrada,
 * ya que renderizar miles de filas puede congelar el navegador.
 */
const MAX_SUBNET_RESULTS = 4096;

/*
 * Algoritmo CIDR (resumen):
 * - mask = prefixToMask(prefix)
 * - network = ip AND mask
 * - broadcast = network OR (~mask)
 * - total = 2^(32 - prefix)
 * - usable = max(total - 2, 0) para /31 y /32
 *
 * En todos los pasos se trabaja con enteros de 32 bits unsigned.
 */
/**
 * Calcula datos CIDR para una IP y un prefijo.
 *
 * @param {number[]} ipArr - IP en arreglo de 4 octetos.
 * @param {number} prefix - Prefijo CIDR (0-32).
 * @returns {object} Objeto con red, broadcast, mascara, rango de hosts y conteos,
 *                   o { error } si la entrada es invalida.
 * Flujo:
 * - Valida IP y prefijo.
 * - Genera mascara, calcula network y broadcast.
 * - Deriva totales y rangos de hosts.
 * Efectos secundarios: ninguno.
 */
export function computeCidr(ipArr, prefix) {
  // Valida formato de IP y rango del prefijo.
  if (!isValidIpArray(ipArr)) {
    return { error: "Direccion IP invalida." };
  }
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return { error: "Prefijo invalido." };
  }

  // Genera mascara a partir del prefijo.
  const maskArr = prefixToMask(prefix);
  if (!maskArr) {
    return { error: "Prefijo invalido." };
  }

  // Convierte IP y mascara a enteros para operaciones bitwise.
  // Se usa unsigned (>>> 0) para evitar negativos en JavaScript.
  const maskInt = ipToInt(maskArr);
  const ipInt = ipToInt(ipArr);

  // Calcula direccion de red con AND (unsigned).
  const networkInt = (ipInt & maskInt) >>> 0;

  // Calcula broadcast con OR contra la mascara invertida.
  // ~maskInt invierte bits, luego >>> 0 mantiene unsigned.
  const broadcastInt = (networkInt | (~maskInt)) >>> 0;

  // Total de direcciones en el bloque CIDR (incluye red y broadcast).
  const totalAddresses = Math.pow(2, 32 - prefix);

  // En /31 y /32 no hay hosts utilizables (modelo clasico).
  const usableHosts = Math.max(totalAddresses - 2, 0);

  // Solo hay rango de hosts cuando hay mas de 2 direcciones.
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

/*
 * Algoritmo FLSM (subredes fijas):
 * - borrowedBits = ceil(log2(desiredSubnets)).
 * - newPrefix = currentPrefix + borrowedBits.
 * - increment = 2^(32 - newPrefix).
 * - subred i = baseNetwork + i * increment.
 *
 * Nota:
 * - Si desiredSubnets no es potencia de 2, se calcula el prefijo minimo
 *   que permite esa cantidad, y se generan solo las solicitadas.
 * - El resto del espacio queda disponible para futuras subredes.
 */
/**
 * Genera subredes FLSM a partir de una red base y cantidad deseada.
 *
 * @param {number[]} ipArr - IP base (se normaliza a su network).
 * @param {number} currentPrefix - Prefijo actual de la red base.
 * @param {number} desiredSubnets - Cantidad de subredes solicitadas (>= 0).
 * @returns {object} { subnets, newPrefix, totalSubnetsGenerated, borrowedBits } o { error }.
 * Flujo:
 * - Valida entradas y calcula bits prestados por redondeo.
 * - Calcula nuevo prefijo segun la cantidad solicitada.
 * - Normaliza IP base a su direccion de red.
 * - Itera y calcula cada subred con computeCidr.
 * Efectos secundarios: ninguno.
 */
export function computeSubnets(ipArr, currentPrefix, desiredSubnets) {
  // Validacion de parametros de entrada.
  if (!isValidIpArray(ipArr)) {
    return { error: "Direccion IP invalida para subredes." };
  }
  if (!Number.isInteger(currentPrefix) || currentPrefix < 0 || currentPrefix > 32) {
    return { error: "Prefijo invalido para subredes." };
  }
  if (!Number.isSafeInteger(desiredSubnets) || desiredSubnets < 0) {
    return { error: "Cantidad de subredes invalida." };
  }

  // borrowedBits representa cuantos bits se toman del host para subredes.
  // Se usa ceil para soportar cantidades no potencia de 2.
  const borrowedBits = desiredSubnets === 0
    ? 0
    : Math.ceil(Math.log2(desiredSubnets));

  const newPrefix = currentPrefix + borrowedBits;

  // El nuevo prefijo no puede exceder /32.
  if (newPrefix > 32) {
    return {
      error: "No es posible generar esa cantidad de subredes con el prefijo actual.",
    };
  }

  const totalSubnets = desiredSubnets;

  // Limita el render para evitar bloqueos visuales en la UI.
  if (totalSubnets > MAX_SUBNET_RESULTS) {
    return {
      error: `Demasiadas subredes para mostrar (maximo ${MAX_SUBNET_RESULTS}).`,
    };
  }

  const subnets = [];
  const ipInt = ipToInt(ipArr);

  // Normaliza la IP base a la direccion de red del prefijo actual.
  const maskArr = prefixToMask(currentPrefix);
  if (!maskArr) {
    return { error: "Prefijo invalido para subredes." };
  }
  const maskInt = ipToInt(maskArr);
  const baseNetworkInt = (ipInt & maskInt) >>> 0;

  // Incremento por subred: 2^(32 - nuevoPrefijo).
  // Se usa Math.pow para evitar overflow de operadores bitwise en JS.
  const increment = Math.pow(2, 32 - newPrefix);

  for (let i = 0; i < totalSubnets; i++) {
    // Calcula el inicio de cada subred sumando el incremento.
    const currentSubnetInt = (baseNetworkInt + (i * increment)) >>> 0;
    const currentSubnetIp = intToIp(currentSubnetInt);

    // Reutiliza la logica CIDR para cada subred calculada.
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
    borrowedBits,
  };
}
