import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testsDir, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const demoSource = fs.readFileSync(path.join(root, "demo.js"), "utf8");
const resultState = JSON.stringify({
  screen: "result",
  step: 9,
  answers: {
    age: "10-14", cue: "gaze", sharedMoment: "pause", time: "5-10",
    attraction: "voice", repetition: "hide", adapt: "pause", friction: "choice",
    tomorrow: "calm", expectation: "activity"
  },
  fired: {},
  profile: "OBS"
});

class FakeElement {
  constructor(attributes = {}) {
    this.attributes = { ...attributes };
    this.listeners = {};
    this.hidden = true;
    this.style = {};
    this.dataset = {};
    Object.keys(attributes).forEach((key) => {
      if (key.startsWith("data-")) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(attributes[key]);
    });
    this.children = [];
    this.textContent = "";
    this.innerHTML = "";
  }
  get href() { return this.attributes.href ?? ""; }
  set href(value) { this.attributes.href = String(value); }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  focus() {}
  querySelector(selector) {
    if (selector === "[data-consent]") return this.firstConsent || null;
    return null;
  }
  closest(selector) {
    if (selector === "[data-consent]" && this.attributes["data-consent"]) return this;
    if (selector === "[data-open-consent]" && this.attributes["data-open-consent"]) return this;
    if (selector === "[data-action]" && this.attributes["data-action"]) return this;
    return null;
  }
}

function createQuizRuntime({
  search = "",
  consent = null,
  measurementEnabled = false,
  pixelId = "2085840802138189",
  session = new Map(),
  environment = "staging"
} = {}) {
  const local = new Map();
  const consentVersion = "test-v1";
  if (consent) local.set(`pequenos-ritmos-measurement-${environment}-${consentVersion}`, consent);
  if (!session.has("pequenos-ritmos-conoce-v2")) session.set("pequenos-ritmos-conoce-v2", resultState);

  const elements = new Map();
  const ids = [
    "screen-intro", "screen-quiz", "screen-transition", "screen-result", "screen-nf",
    "intro-title", "result-title", "result-echo", "result-summary", "result-recommendation",
    "result-badges", "activity-title", "activity-context", "checkout-link", "result-demo-link",
    "demo-link", "consent"
  ];
  ids.forEach((id) => elements.set(id, new FakeElement()));
  elements.get("checkout-link").setAttribute("href", "https://pay.hotmart.com/V107386794P?checkoutMode=10");
  elements.get("result-demo-link").setAttribute("href", "demo.html");
  elements.get("demo-link").setAttribute("href", "demo.html");

  const allow = new FakeElement({ "data-consent": "allow" });
  const deny = new FakeElement({ "data-consent": "deny" });
  const preferences = new FakeElement({ "data-open-consent": "1" });
  elements.get("consent").firstConsent = deny;
  const scripts = [];
  const documentListeners = {};

  const document = {
    readyState: "complete",
    cookie: "",
    images: [],
    head: { appendChild(node) { scripts.push(node); if (node.id) elements.set(node.id, node); } },
    documentElement: { appendChild() {} },
    createElement() { return new FakeElement(); },
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      if (selector === "[data-open-consent]") return [preferences];
      return [];
    },
    addEventListener(name, handler) { documentListeners[name] = handler; }
  };

  const CustomEvent = class CustomEvent {
    constructor(name, options) { this.type = name; this.detail = options.detail; }
  };
  const window = {
    PEQUENOS_RITMOS_CONFIG: { environment, measurementEnabled, metaPixelId: pixelId, consentVersion, checkoutHost: "pay.hotmart.com" },
    location: { href: `https://quiz.example.test/${search}`, search },
    URL, URLSearchParams, CustomEvent,
    localStorage: { getItem(key) { return local.get(key) ?? null; }, setItem(key, value) { local.set(key, value); } },
    sessionStorage: { getItem(key) { return session.get(key) ?? null; }, setItem(key, value) { session.set(key, value); }, removeItem(key) { session.delete(key); } },
    dispatchEvent() {}, scrollTo() {}, setTimeout(fn) { fn(); },
    matchMedia() { return { matches: true }; },
    console
  };

  vm.runInNewContext(appSource, { window, document, URL, URLSearchParams, CustomEvent, console }, { filename: "quiz-app.js" });
  return { window, document, documentListeners, elements, allow, deny, preferences, scripts, session, local };
}

function fbqCalls(runtime) {
  return (runtime.window.fbq?.queue || []).map((entry) => Array.from(entry));
}

{
  const runtime = createQuizRuntime({
    search: "?utm_source=meta&utm_campaign=pr-mx-quiz&utm_content=q01&sck=mx-q01&mcid=1201&masid=1202&maid=1203&fbclid=click-test&email=nope%40example.com&child_age=12&quiz_profile=OBS"
  });
  const checkout = new URL(runtime.elements.get("checkout-link").getAttribute("href"));
  assert.equal(checkout.searchParams.get("utm_source"), "meta");
  assert.equal(checkout.searchParams.get("utm_campaign"), "pr-mx-quiz");
  assert.equal(checkout.searchParams.get("sck"), "mx-q01");
  assert.equal(checkout.searchParams.get("mcid"), "1201");
  assert.equal(checkout.searchParams.get("masid"), "1202");
  assert.equal(checkout.searchParams.get("maid"), "1203");
  assert.equal(checkout.searchParams.get("checkoutMode"), "10");
  assert.equal(checkout.searchParams.has("off"), false);
  assert.equal(checkout.searchParams.has("hotfeature"), false);
  assert.equal(checkout.searchParams.has("fbclid"), false, "fbclid exige consentimento");
  assert.equal(checkout.searchParams.has("email"), false);
  assert.equal(checkout.searchParams.has("child_age"), false);
  assert.equal(checkout.searchParams.has("quiz_profile"), false);
  assert.equal(runtime.scripts.length, 0);
  assert.equal(runtime.elements.get("consent").hidden, true);
}

{
  const runtime = createQuizRuntime({ search: "?fbclid=click-test", measurementEnabled: true });
  assert.equal(runtime.elements.get("consent").hidden, false);
  assert.equal(runtime.scripts.length, 0, "Pixel não carrega antes da escolha");
  runtime.documentListeners.click({ target: runtime.allow, preventDefault() {} });
  assert.equal(runtime.scripts.length, 1);
  assert.equal(runtime.scripts[0].src, "https://connect.facebook.net/en_US/fbevents.js");
  assert.equal(new URL(runtime.elements.get("checkout-link").getAttribute("href")).searchParams.get("fbclid"), "click-test");
  runtime.elements.get("checkout-link").listeners.click();
  const calls = fbqCalls(runtime);
  assert(calls.some((call) => call[0] === "init" && call[1] === "2085840802138189"));
  assert(calls.some((call) => call[0] === "track" && call[1] === "ViewContent"));
  assert(calls.some((call) => call[0] === "trackCustom" && call[1] === "CheckoutClick"));
  assert(!calls.some((call) => call.includes("Purchase")));
}

{
  const runtime = createQuizRuntime({ measurementEnabled: true });
  runtime.documentListeners.click({ target: runtime.deny, preventDefault() {} });
  runtime.elements.get("checkout-link").listeners.click();
  assert.equal(runtime.scripts.length, 0);
  assert.equal(runtime.window.dataLayer, undefined);
}

function runDemo({ consent = false } = {}) {
  const checkout = new FakeElement({ href: "https://pay.hotmart.com/V107386794P?checkoutMode=10&sck=qz-conoce-demo" });
  const consentVersion = "test-v1";
  const local = new Map();
  if (consent) local.set(`pequenos-ritmos-measurement-staging-${consentVersion}`, "allow");
  const session = new Map([["pequenos-ritmos-demo-entry", "result"]]);
  const window = {
    PEQUENOS_RITMOS_CONFIG: { environment: "staging", consentVersion },
    location: { search: "?utm_source=meta&mcid=1&masid=2&maid=3&fbclid=click-test&email=nope" },
    URL, URLSearchParams,
    localStorage: { getItem(key) { return local.get(key) ?? null; } },
    sessionStorage: { getItem(key) { return session.get(key) ?? null; } }
  };
  const document = { getElementById(id) { return id === "demo-checkout" ? checkout : null; } };
  vm.runInNewContext(demoSource, { window, document, URL, URLSearchParams }, { filename: "demo.js" });
  return new URL(checkout.getAttribute("href"));
}

{
  const noConsent = runDemo();
  assert.equal(noConsent.searchParams.get("mcid"), "1");
  assert.equal(noConsent.searchParams.get("masid"), "2");
  assert.equal(noConsent.searchParams.get("maid"), "3");
  assert.equal(noConsent.searchParams.has("fbclid"), false);
  assert.equal(noConsent.searchParams.has("email"), false);
  assert.equal(runDemo({ consent: true }).searchParams.get("fbclid"), "click-test");
}

for (const file of ["index.html", "demo.html", "privacidad.html", "reembolsos.html", "terminos.html"]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert.match(html, /index,follow/i, `${file} precisa permitir indexação em produção`);
}
const publicConfig = fs.readFileSync(path.join(root, "site-config.js"), "utf8");
assert.match(publicConfig, /environment:\s*"production"/);
assert.match(publicConfig, /Rua João Wyclif, 420, CEP 86050-450/);
assert.doesNotMatch(publicConfig, /legalAddress:\s*"\[DIRECCIÓN LEGAL\]"/);
assert.match(fs.readFileSync(path.join(root, "index.html"), "utf8"), /href="terminos\.html"/);

console.log("OK: quiz preserva atribuição agregada, condiciona fbclid/Pixel ao consentimento e nunca emite Purchase.");
