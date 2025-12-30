import { formatIp, ipToInt, intToIp, prefixToMask, maskToPrefix } from "./ip-utils.js";
import { computeCidr } from "./cidr.js";
import { computeVlsm } from "./vlsm.js";

function assertEqual(name, actual, expected) {
  const pass = actual === expected;
  return { name, pass, actual, expected };
}

export function runTests() {
  const results = [];

  const mask24 = prefixToMask(24);
  results.push(assertEqual("Mascara /24", formatIp(mask24), "255.255.255.0"));
  results.push(assertEqual("Prefijo 255.255.255.0", maskToPrefix(mask24), 24));

  const intValue = ipToInt([10, 0, 0, 1]);
  results.push(assertEqual("IP a entero", intValue, 167772161));
  results.push(assertEqual("Entero a IP", formatIp(intToIp(167772161)), "10.0.0.1"));

  const cidr = computeCidr([192, 168, 10, 0], 24);
  results.push(assertEqual("CIDR network", formatIp(cidr.network), "192.168.10.0"));
  results.push(assertEqual("CIDR broadcast", formatIp(cidr.broadcast), "192.168.10.255"));
  results.push(assertEqual("CIDR host min", formatIp(cidr.firstHost), "192.168.10.1"));
  results.push(assertEqual("CIDR host max", formatIp(cidr.lastHost), "192.168.10.254"));

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

  if (!vlsm.error) {
    results.push(assertEqual("VLSM subred 1", formatIp(vlsm.allocations[0].network), "192.168.0.0"));
    results.push(assertEqual("VLSM subred 1 prefijo", vlsm.allocations[0].prefix, 25));
    results.push(assertEqual("VLSM subred 2", formatIp(vlsm.allocations[1].network), "192.168.0.128"));
    results.push(assertEqual("VLSM subred 3", formatIp(vlsm.allocations[2].network), "192.168.0.192"));
    results.push(assertEqual("VLSM subred 4", formatIp(vlsm.allocations[3].network), "192.168.0.224"));
  } else {
    results.push({ name: "VLSM error", pass: false, actual: vlsm.error, expected: "sin error" });
  }

  const passed = results.filter((item) => item.pass).length;
  const failed = results.length - passed;

  return { passed, failed, results };
}
