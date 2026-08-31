(function () {
  "use strict";

  var checkout = document.getElementById("demo-checkout");
  if (!checkout) return;
  var config = window.PEQUENOS_RITMOS_CONFIG || {};
  var consentKey = "pequenos-ritmos-measurement-"
    + (config.environment || "staging") + "-" + (config.consentVersion || "v1");
  var attributionKey = "pequenos-ritmos-attribution-"
    + (config.environment || "staging") + "-v1";
  var consentAllowed = false;
  try { consentAllowed = window.localStorage.getItem(consentKey) === "allow"; } catch (error) { /* noop */ }

  var params;
  try { params = new URLSearchParams(window.location.search); } catch (error) { return; }
  var demoEntry = null;
  try { demoEntry = window.sessionStorage.getItem("pequenos-ritmos-demo-entry"); } catch (error) { /* noop */ }
  if (demoEntry !== "result") return;

  var allowed = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "creative_id", "meta_campaign_id", "meta_adset_id", "meta_ad_id", "mcid", "masid", "maid", "fbclid", "cid", "sck"];
  var url = new URL(checkout.href);

  function safeValue(value) {
    return String(value || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 512);
  }

  function safeSck(value) {
    return String(value || "")
      .replace(/[_.\s]+/g, "-")
      .replace(/[^A-Za-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  }

  var stored = {};
  try { stored = JSON.parse(window.sessionStorage.getItem(attributionKey) || "{}"); } catch (error) { stored = {}; }

  allowed.forEach(function (key) {
    var raw = params.get(key);
    if (!raw && Object.prototype.hasOwnProperty.call(stored, key)) raw = stored[key];
    if (!raw) return;
    if (key === "fbclid" && !consentAllowed) return;
    var value;
    if (key === "sck") value = safeSck(raw);
    else if (key === "fbclid" || key === "cid") value = String(raw).slice(0, 512);
    else value = safeValue(raw);
    if (value) url.searchParams.set(key, value);
  });

  if (!consentAllowed) url.searchParams.delete("fbclid");
  url.searchParams.delete("off");
  url.searchParams.delete("hotfeature");
  url.searchParams.set("checkoutMode", "10");
  if (!url.searchParams.get("sck")) url.searchParams.set("sck", "qz-conoce-demo");
  checkout.href = url.toString();
  checkout.hidden = false;
})();
