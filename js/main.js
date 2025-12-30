import {
  initCidrCalculator,
  initDefaults,
  initTestRunner,
  initVlsmCalculator,
} from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDefaults();

  // Conditional initialization based on page content
  if (document.getElementById("cidr-form")) {
    initCidrCalculator();
  }

  if (document.getElementById("vlsm-form")) {
    initVlsmCalculator();
  }

  if (document.getElementById("run-tests")) {
    initTestRunner();
  }
});
