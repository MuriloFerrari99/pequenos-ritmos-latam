/* Pequeños Ritmos — configuración pública del quiz.
 *
 * No colocar secretos, tokens ni datos de compradores aquí. La producción
 * queda cerrada mientras falten URL, domicilio o revisión legal.
 */
(function () {
  "use strict";

  window.PEQUENOS_RITMOS_CONFIG = Object.freeze({
    environment: "production",
    publicBaseUrl: "https://muriloferrari99.github.io/pequenos-ritmos-latam/",
    legalAddress: "Rua João Wyclif, 420, CEP 86050-450, Londrina - PR, Brasil",
    legalReviewApproved: true,
    measurementEnabled: true,
    metaPixelId: "2085840802138189",
    consentVersion: "2026-08-30",
    checkoutHost: "pay.hotmart.com"
  });

  function hasLegalAddress(value) {
    var address = String(value || "").trim();
    return Boolean(address) && address.indexOf("[") === -1 && address.indexOf("]") === -1;
  }

  function hydratePublicConfig() {
    var config = window.PEQUENOS_RITMOS_CONFIG;
    var address = hasLegalAddress(config.legalAddress) ? config.legalAddress : "[DIRECCIÓN LEGAL]";
    Array.prototype.forEach.call(document.querySelectorAll("[data-legal-address]"), function (node) {
      node.textContent = address;
    });

    if (config.environment !== "production") return;
    var errors = [];
    if (!/^https:\/\//.test(String(config.publicBaseUrl || ""))) errors.push("URL HTTPS");
    if (!hasLegalAddress(config.legalAddress)) errors.push("domicilio legal");
    if (!config.legalReviewApproved) errors.push("revisión legal");
    if (!errors.length) return;

    var warning = document.createElement("div");
    warning.className = "config-gate";
    warning.setAttribute("role", "alert");
    warning.textContent = "Publicación bloqueada: falta completar " + errors.join(", ") + ".";
    document.body.insertBefore(warning, document.body.firstChild);
    Array.prototype.forEach.call(document.querySelectorAll("a[href*='pay.hotmart.com']"), function (link) {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("title", "Checkout bloqueado por configuración incompleta");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hydratePublicConfig);
  else hydratePublicConfig();
})();
