/**
 * Pruebas unitarias basicas para utilidades, CIDR y VLSM.
 *
 * Este modulo es deterministico y no tiene efectos secundarios.
 * Se usa como verificacion rapida desde la UI (sin framework externo).
 */
import {
  formatIp,
  ipToInt,
  intToIp,
  prefixToMask,
  maskToPrefix,
  parseMask,
  isNetworkAddress,
} from "./ip-utils.js";
import { computeCidr, computeSubnets } from "./cidr.js";
import { computeVlsm } from "./vlsm.js";

/**
 * Compara valores estrictamente y produce un resultado de prueba.
 *
 * @param {string} name - Nombre descriptivo de la prueba.
 * @param {*} actual - Valor obtenido.
 * @param {*} expected - Valor esperado.
 * @returns {{ name: string, pass: boolean, actual: *, expected: * }}
 * Flujo: evalua igualdad estricta y empaqueta el resultado.
 * Efectos secundarios: ninguno.
 */
function assertEqual(name, actual, expected) {
  const pass = actual === expected;
  return { name, pass, actual, expected };
}

/**
 * Ejecuta el set de pruebas unitarias y devuelve un resumen.
 * No recibe parametros.
 *
 * @returns {{ passed: number, failed: number, results: Array }}
 * Flujo:
 * - Ejecuta pruebas por categorias (utilidades, CIDR, FLSM, VLSM).
 * - Agrega resultados a un arreglo.
 * - Calcula totales de aprobadas y fallidas.
 * Efectos secundarios: ninguno.
 */
export function runTests() {
  const results = [];

  // Pruebas de mascara y parseo.
  const mask24 = prefixToMask(24);
  results.push(assertEqual("Mascara /24", formatIp(mask24), "255.255.255.0"));
  results.push(assertEqual("Prefijo 255.255.255.0", maskToPrefix(mask24), 24));
  results.push(assertEqual("Mascara no contigua", maskToPrefix([255, 0, 255, 0]), null));
  results.push(assertEqual("Mascara longitud invalida", maskToPrefix([255, 255, 255]), null));
  results.push(assertEqual("Parse mascara dotted", parseMask("255.255.255.0"), 24));
  results.push(assertEqual("Parse mascara prefijo", parseMask("/24"), 24));
  results.push(assertEqual("Parse mascara invalida", parseMask("255.0.255.0"), null));

  // Pruebas de conversion IPv4 <-> entero.
  const intValue = ipToInt([10, 0, 0, 1]);
  results.push(assertEqual("IP a entero", intValue, 167772161));
  results.push(assertEqual("Entero a IP", formatIp(intToIp(167772161)), "10.0.0.1"));

  // Pruebas CIDR basicas y casos limite.
  const cidr = computeCidr([192, 168, 10, 0], 24);
  results.push(assertEqual("CIDR network", formatIp(cidr.network), "192.168.10.0"));
  results.push(assertEqual("CIDR broadcast", formatIp(cidr.broadcast), "192.168.10.255"));
  results.push(assertEqual("CIDR host min", formatIp(cidr.firstHost), "192.168.10.1"));
  results.push(assertEqual("CIDR host max", formatIp(cidr.lastHost), "192.168.10.254"));

  const cidrZero = computeCidr([0, 0, 0, 0], 0);
  results.push(assertEqual("CIDR /0 broadcast", formatIp(cidrZero.broadcast), "255.255.255.255"));
  results.push(assertEqual("CIDR /0 total", cidrZero.totalAddresses, 4294967296));

  const cidr31 = computeCidr([192, 168, 0, 0], 31);
  results.push(assertEqual("CIDR /31 hosts", cidr31.usableHosts, 0));
  results.push(assertEqual("CIDR /31 host min", cidr31.firstHost, null));

  const cidrInvalidIp = computeCidr([256, 0, 0, 1], 24);
  results.push(assertEqual("CIDR IP invalida", Boolean(cidrInvalidIp.error), true));

  const cidrInvalidPrefix = computeCidr([10, 0, 0, 1], 33);
  results.push(assertEqual("CIDR prefijo invalido", Boolean(cidrInvalidPrefix.error), true));

  results.push(assertEqual("IP es red /24", isNetworkAddress([192, 168, 1, 0], 24), true));
  results.push(assertEqual("IP no es red /24", isNetworkAddress([192, 168, 1, 10], 24), false));

  // Pruebas de subredes FLSM.
  // Caso grande (smoke test): valida que el calculo no falle.
  const subnets = computeSubnets(cidr.network, 16, 256);

  // Caso pequeno verificable: /24 -> 4 subredes.
  const subnetsSmall = computeSubnets([192, 168, 10, 0], 24, 4);
  results.push(assertEqual("Subnets generated count", subnetsSmall.subnets.length, 4));
  results.push(assertEqual("Subnets new prefix", subnetsSmall.newPrefix, 26));
  results.push(assertEqual("Subnet 1 network", formatIp(subnetsSmall.subnets[0].network), "192.168.10.0"));
  results.push(assertEqual("Subnet 2 network", formatIp(subnetsSmall.subnets[1].network), "192.168.10.64"));
  results.push(assertEqual("Subnet 4 network", formatIp(subnetsSmall.subnets[3].network), "192.168.10.192"));

  // Casos invalidos de subredes.
  const subnetsInvalid = computeSubnets([192, 168, 0, 0], 24, -1);
  results.push(assertEqual("Subnets invalidos", Boolean(subnetsInvalid.error), true));

  // Caso limite: 0 subredes devuelve lista vacia y mantiene prefijo base.
  const subnetsZero = computeSubnets([192, 168, 10, 0], 24, 0);
  results.push(assertEqual("Subnets cero count", subnetsZero.subnets.length, 0));
  results.push(assertEqual("Subnets cero prefix", subnetsZero.newPrefix, 24));

  // Caso no potencia de 2: se calcula el prefijo minimo y se generan N subredes.
  const subnetsNotPower = computeSubnets([192, 168, 10, 0], 24, 3);
  results.push(assertEqual("Subnets no potencia count", subnetsNotPower.subnets.length, 3));
  results.push(assertEqual("Subnets no potencia prefix", subnetsNotPower.newPrefix, 26));
  results.push(assertEqual("Subnets no potencia third", formatIp(subnetsNotPower.subnets[2].network), "192.168.10.128"));

  // Pruebas VLSM: caso nominal y exceso de hosts.
  const vlsm = computeVlsm(
    [192, 168, 0, 0],
    24,
    [
      { name: "A", hosts: 100 },
      { name: "B", hosts: 50 },
      { name: "C", hosts: 25 },
      { name: "D", hosts: 10 },
    ]
  );

  const vlsmTooBig = computeVlsm(
    [10, 0, 0, 0],
    24,
    [
      { name: "X", hosts: 5000000000 },
    ]
  );
  results.push(assertEqual("VLSM hosts excedidos", Boolean(vlsmTooBig.error), true));

  // Valida asignaciones si el calculo fue exitoso.
  if (!vlsm.error) {
    results.push(assertEqual("VLSM subred 1", formatIp(vlsm.allocations[0].network), "192.168.0.0"));
    results.push(assertEqual("VLSM subred 1 prefijo", vlsm.allocations[0].prefix, 25));
    results.push(assertEqual("VLSM subred 2", formatIp(vlsm.allocations[1].network), "192.168.0.128"));
    results.push(assertEqual("VLSM subred 3", formatIp(vlsm.allocations[2].network), "192.168.0.192"));
    results.push(assertEqual("VLSM subred 4", formatIp(vlsm.allocations[3].network), "192.168.0.224"));
  } else {
    results.push({ name: "VLSM error", pass: false, actual: vlsm.error, expected: "sin error" });
  }

  // Resume el conteo final de pruebas aprobadas y fallidas.
  // Callback de filtro: conserva solo resultados aprobados.
  const passed = results.filter((item) => item.pass).length;
  const failed = results.length - passed;

  return { passed, failed, results };
}
