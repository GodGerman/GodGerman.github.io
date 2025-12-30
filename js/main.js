import {
  initCidrCalculator,
  initDefaults,
  initRevealAnimations,
  initTestRunner,
  initVlsmCalculator,
} from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initDefaults();
  initCidrCalculator();
  initVlsmCalculator();
  initTestRunner();
  initRevealAnimations();
});
