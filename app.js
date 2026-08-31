(function () {
  "use strict";

  var CONFIG = window.PEQUENOS_RITMOS_CONFIG || {};
  var CHECKOUT_BASE = "https://pay.hotmart.com/V107386794P?checkoutMode=10";
  var STORAGE_KEY = "pequenos-ritmos-conoce-v2";
  var DEMO_ENTRY_KEY = "pequenos-ritmos-demo-entry";
  var CONSENT_STORAGE_KEY = "pequenos-ritmos-measurement-"
    + (CONFIG.environment || "staging") + "-" + (CONFIG.consentVersion || "v1");
  var ATTRIBUTION_STORAGE_KEY = "pequenos-ritmos-attribution-"
    + (CONFIG.environment || "staging") + "-v1";
  var META_PIXEL_SCRIPT_ID = "pequenos-ritmos-quiz-meta-pixel";
  var MAX_ATTR_LENGTH = 512;
  var EXTERNAL_EVENT_NAMES = ["ViewContent", "QuizStart", "QuizMidpoint", "QuizComplete", "QuizCompleteNF", "CheckoutClick"];
  var ALLOWED_ATTRIBUTION_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
    "creative_id", "meta_campaign_id", "meta_adset_id", "meta_ad_id",
    "mcid", "masid", "maid", "fbclid", "cid", "sck"
  ];
  var consentPreviewMode = consentPreviewRequested();
  var measurementConsent = consentPreviewMode ? null : loadConsent();
  var pixelInitialized = false;
  var viewContentSent = false;

  var QUESTIONS = [
    { id: "age", kicker: "ETAPA ORIENTATIVA", title: "¿Qué edad orientativa quieres considerar?", microcopy: "Solo sirve para elegir el ejemplo. No evalúa habilidades.", options: [["6-9", "6–9 meses"], ["10-14", "10–14 meses"], ["15-18", "15–18 meses"], ["19-24", "19–24 meses"], ["na", "Prefiero no indicarlo"]] },
    { id: "cue", kicker: "UNA SEÑAL", title: "Cuando algo le interesa, ¿qué notas primero?", microcopy: "Elige lo que aparece con más frecuencia, sin buscar una respuesta perfecta.", options: [["gaze", "La mirada"], ["gesture", "Un sonido o gesto"], ["touch", "Se acerca o lo toca"], ["body", "Mueve todo el cuerpo"], ["varies", "Cambia según el día"]] },
    { id: "sharedMoment", kicker: "EL MOMENTO", title: "¿Cuándo suele aparecer el momento más fácil para compartir?", microcopy: "", options: [["wake", "Al despertar"], ["pause", "En una pausa"], ["routine", "Durante una rutina"], ["bedtime", "Antes de dormir"], ["varies", "Depende del día"]] },
    { id: "time", kicker: "TIEMPO REAL", title: "¿Cuánto suele durar un momento cómodo para ambos?", microcopy: "", options: [["3-5", "3–5 minutos"], ["5-10", "5–10 minutos"], ["10-15", "10–15 minutos"], ["variable", "Sin tiempo fijo"]] },
    { id: "attraction", kicker: "LO QUE ATRAE", title: "¿Qué suele llamar más su atención en casa?", microcopy: "", options: [["voice", "Mi voz y mi cara"], ["soft", "Un pañuelo o un libro"], ["objects", "Objetos grandes"], ["movement", "Música y movimiento"], ["varies", "Depende del día"]] },
    { id: "repetition", kicker: "REPETIR", title: "¿Qué tipo de repetición suele disfrutar más?", microcopy: "", options: [["song", "La misma canción"], ["hide", "Aparecer y esconder"], ["inout", "Poner y sacar"], ["move", "Moverse juntos"], ["none", "Aún no hay un favorito"]] },
    { id: "adapt", kicker: "CUANDO CAMBIA", title: "Cuando su interés cambia, ¿qué haces normalmente?", microcopy: "Aquí no hay una respuesta correcta.", options: [["simplify", "Hago la idea más simple"], ["change", "Cambio la propuesta"], ["pause", "Hacemos una pausa"], ["follow", "Sigo su iniciativa"], ["later", "Volvemos otro día"]] },
    { id: "friction", kicker: "PARA EMPEZAR", title: "¿Qué suele dificultar que empiecen?", microcopy: "Elige la que más se parece a un día común.", options: [["choice", "No sé qué elegir"], ["time", "Hay poco tiempo"], ["materials", "Preparar materiales"], ["overload", "Demasiadas opciones"], ["none", "Casi nada nos frena"]] },
    { id: "tomorrow", kicker: "PARA MAÑANA", title: "¿Qué te gustaría tener listo para mañana?", microcopy: "", options: [["calm", "Un juego tranquilo"], ["routine", "Una rutina para repetir"], ["explore", "Una propuesta para explorar"], ["flexible", "Una idea rápida y flexible"]] },
    { id: "expectation", kicker: "TU RESULTADO", title: "¿Qué quieres que te entregue este resultado?", microcopy: "", options: [["start", "Una forma simple de empezar"], ["activity", "Una actividad para mañana"], ["repeat", "Ideas para repetir"], ["clinical", "Saber si va bien para su edad"]] }
  ];

  var PROFILES = {
    OBS: { title: "Señales y Miradas", summary: "Las señales pequeñas —una mirada, un gesto o una pausa— pueden ayudarte a decidir cuándo continuar, repetir o terminar.", recommendation: "Empieza con una propuesta tranquila, haz una pausa después de cada acción y observa qué invita a repetir.", badges: ["Mirar", "Pausar", "Responder"] },
    RIT: { title: "Rutinas que Conectan", summary: "Las canciones, transiciones y pequeñas rutinas crean momentos familiares que pueden repetirse sin presión.", recommendation: "Elige un momento cotidiano y repite la misma propuesta de forma sencilla.", badges: ["Rutina", "Repetición", "Calma"] },
    EXP: { title: "Exploración Compartida", summary: "Las preferencias aparecen mientras toca, mueve, pone, saca y vuelve a intentar con acompañamiento cercano.", recommendation: "Prepara uno o dos objetos grandes y seguros, muestra una acción y deja espacio para su iniciativa.", badges: ["Explorar", "Repetir", "Acompañar"] },
    FLX: { title: "Ritmo Flexible", summary: "Ya reconoces algo importante: no todos los días piden lo mismo. Una idea útil debe caber en el tiempo y la energía de hoy.", recommendation: "Empieza con 3–5 minutos, poco o ningún material y permiso para parar.", badges: ["3–5 min", "Poca preparación", "Sin presión"] }
  };

  var ACTIVITIES = {
    "6-9": { OBS: "Día 01 · Hola con las manos", RIT: "Día 07 · Palmas con pausa", EXP: "Día 09 · Rodar y esperar", FLX: "Día 04 · Paseo narrado" },
    "10-14": { OBS: "Día 03 · ¿Dónde está el pañuelo?", RIT: "Día 20 · Rincón de lectura", EXP: "Día 10 · Cajas: adentro y afuera", FLX: "Día 07 · Palmas con pausa" },
    "15-18": { OBS: "Día 15 · Fotos que cuentan", RIT: "Día 22 · Guardar con canción", EXP: "Día 17 · Túnel de caja", FLX: "Día 19 · Baila y descansa" },
    "19-24": { OBS: "Día 29 · Elijo entre dos", RIT: "Día 27 · Cesta de la rutina", EXP: "Día 28 · ¿Qué cambió?", FLX: "Día 04 · Paseo narrado" },
    na: { OBS: "Día 03 · ¿Dónde está el pañuelo?", RIT: "Día 07 · Palmas con pausa", EXP: "Día 09 · Rodar y esperar", FLX: "Día 04 · Paseo narrado" }
  };

  var state = normalizeState(loadState());

  function normalizeState(input) {
    var clean = {
      screen: "intro",
      step: 0,
      answers: {},
      fired: {},
      measurement: null
    };
    if (!input || typeof input !== "object") return clean;
    if (["intro", "quiz", "transition", "result", "nf"].indexOf(input.screen) !== -1) clean.screen = input.screen;
    if (Number.isInteger(input.step) && input.step >= 0 && input.step < QUESTIONS.length) clean.step = input.step;
    if (input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)) clean.answers = input.answers;
    if (input.fired && typeof input.fired === "object" && !Array.isArray(input.fired)) clean.fired = input.fired;
    if (input.measurement === true || input.measurement === false) clean.measurement = input.measurement;
    if (input.profile && PROFILES[input.profile]) clean.profile = input.profile;
    if (input.profile === "NF") clean.profile = "NF";
    return clean;
  }

  var locked = false;

  var screens = {
    intro: document.getElementById("screen-intro"),
    quiz: document.getElementById("screen-quiz"),
    transition: document.getElementById("screen-transition"),
    result: document.getElementById("screen-result"),
    nf: document.getElementById("screen-nf")
  };

  function loadState() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Fallback: state continues in memory. */
    }
  }

  function clearState() {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (error) { /* noop */ }
  }

  function showScreen(name, focusId) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
    state.screen = name;
    saveState();
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    if (focusId) {
      window.setTimeout(function () {
        var target = document.getElementById(focusId);
        if (target) {
          try { target.focus({ preventScroll: true }); }
          catch (error) { target.focus(); }
        }
      }, reducedMotion() ? 0 : 40);
    }
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function introHeadline() {
    return "Descubre cuánto conoces a tu hijo";
  }

  function renderQuestion() {
    var question = QUESTIONS[state.step];
    if (!question) return finishQuiz();

    document.getElementById("progress-label").textContent = "Pregunta " + (state.step + 1) + " de " + QUESTIONS.length;
    document.getElementById("progress-bar").style.width = (((state.step + 1) / QUESTIONS.length) * 100) + "%";
    document.getElementById("question-kicker").textContent = question.kicker;
    document.getElementById("question-title").textContent = question.title;
    document.getElementById("question-microcopy").textContent = question.microcopy || "";
    document.getElementById("question-live").textContent = "Pregunta " + (state.step + 1) + " de " + QUESTIONS.length + ". " + question.title;
    document.querySelector("[data-action='back']").style.visibility = state.step === 0 ? "hidden" : "visible";

    var options = document.getElementById("options");
    options.innerHTML = "";
    question.options.forEach(function (option, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "option";
      button.setAttribute("role", "radio");
      button.dataset.value = option[0];
      button.setAttribute("aria-checked", state.answers[question.id] === option[0] ? "true" : "false");
      button.tabIndex = state.answers[question.id] === option[0] || (!state.answers[question.id] && index === 0) ? 0 : -1;
      button.innerHTML = '<span class="option-marker" aria-hidden="true"></span><span class="option-label"></span>';
      button.querySelector(".option-label").textContent = option[1];
      button.addEventListener("click", function () { chooseOption(question, option[0], button); });
      button.addEventListener("keydown", function (event) { moveRadioFocus(event, button); });
      options.appendChild(button);
    });

    showScreen("quiz", "question-title");
  }

  function moveRadioFocus(event, current) {
    if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].indexOf(event.key) === -1) return;
    event.preventDefault();
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".option"));
    var currentIndex = nodes.indexOf(current);
    var direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    var next = nodes[(currentIndex + direction + nodes.length) % nodes.length];
    nodes.forEach(function (node) { node.tabIndex = -1; });
    next.tabIndex = 0;
    next.focus();
  }

  function chooseOption(question, value, button) {
    if (locked) return;
    locked = true;
    state.answers[question.id] = value;
    saveState();
    Array.prototype.forEach.call(document.querySelectorAll(".option"), function (node) {
      node.setAttribute("aria-checked", node === button ? "true" : "false");
      node.setAttribute("aria-disabled", "true");
    });

    if (state.step === 0) fireOnce("QuizStart", true);

    var delay = reducedMotion() ? 0 : 450;
    window.setTimeout(function () {
      if (state.step === 4) {
        state.step = 5;
        saveState();
        showScreen("transition", "transition-title");
        fireOnce("QuizMidpoint", true);
        locked = false;
        return;
      }
      if (state.step >= QUESTIONS.length - 1) {
        locked = false;
        finishQuiz();
        return;
      }
      state.step += 1;
      saveState();
      locked = false;
      renderQuestion();
    }, delay);
  }

  function goBack() {
    if (locked || state.step <= 0) return;
    state.step -= 1;
    saveState();
    renderQuestion();
  }

  function computeProfile() {
    if (state.answers.expectation === "clinical") return "NF";

    var scores = { OBS: 0, RIT: 0, EXP: 0, FLX: 0 };
    var cue = state.answers.cue;
    var sharedMoment = state.answers.sharedMoment;
    var friction = state.answers.friction;
    var time = state.answers.time;
    var attraction = state.answers.attraction;
    var repetition = state.answers.repetition;
    var adapt = state.answers.adapt;
    var tomorrow = state.answers.tomorrow;

    if (cue === "gaze" || cue === "gesture") scores.OBS += 2;
    if (cue === "touch" || cue === "body") scores.EXP += 2;
    if (cue === "varies") scores.FLX += 2;
    if (sharedMoment === "wake") scores.RIT += 1;
    if (sharedMoment === "pause") scores.OBS += 1;
    if (sharedMoment === "routine" || sharedMoment === "bedtime") scores.RIT += 2;
    if (sharedMoment === "varies") scores.FLX += 2;
    if (time === "3-5") { scores.FLX += 1; scores.OBS += 1; }
    if (time === "variable") scores.FLX += 2;
    if (time === "5-10") { scores.OBS += 1; scores.RIT += 1; }
    if (time === "10-15") scores.EXP += 2;
    if (attraction === "voice") scores.OBS += 2;
    if (attraction === "soft") { scores.OBS += 1; scores.RIT += 1; }
    if (attraction === "objects" || attraction === "movement") scores.EXP += 2;
    if (attraction === "varies") scores.FLX += 2;
    if (repetition === "song") scores.RIT += 2;
    if (repetition === "hide") { scores.OBS += 1; scores.RIT += 1; }
    if (repetition === "inout" || repetition === "move") scores.EXP += 2;
    if (repetition === "none") scores.FLX += 2;
    if (adapt === "simplify") scores.OBS += 1;
    if (adapt === "change") scores.FLX += 2;
    if (adapt === "pause") { scores.OBS += 1; scores.RIT += 1; }
    if (adapt === "follow") scores.EXP += 2;
    if (adapt === "later") { scores.FLX += 1; scores.RIT += 1; }
    if (friction === "choice") scores.RIT += 2;
    if (friction === "time") scores.FLX += 2;
    if (friction === "materials") { scores.FLX += 1; scores.OBS += 1; }
    if (friction === "overload") { scores.RIT += 1; scores.OBS += 1; }
    if (friction === "none") { scores.EXP += 1; scores.OBS += 1; }
    if (tomorrow === "calm") scores.OBS += 3;
    if (tomorrow === "routine") scores.RIT += 3;
    if (tomorrow === "explore") scores.EXP += 3;
    if (tomorrow === "flexible") scores.FLX += 3;

    var max = Math.max(scores.OBS, scores.RIT, scores.EXP, scores.FLX);
    var leaders = Object.keys(scores).filter(function (key) { return scores[key] === max; });
    if (leaders.length === 1) return leaders[0];
    var tomorrowProfile = { calm: "OBS", routine: "RIT", explore: "EXP", flexible: "FLX" }[tomorrow];
    if (tomorrowProfile && leaders.indexOf(tomorrowProfile) !== -1) return tomorrowProfile;
    if (leaders.indexOf("FLX") !== -1 && (time === "variable" || ["time", "materials"].indexOf(friction) !== -1)) return "FLX";
    if (leaders.indexOf("RIT") !== -1 && (sharedMoment === "routine" || sharedMoment === "bedtime" || repetition === "song" || friction === "choice")) return "RIT";
    if (leaders.indexOf("EXP") !== -1 && (attraction === "objects" || attraction === "movement" || repetition === "inout" || repetition === "move")) return "EXP";
    return leaders[0];
  }

  function finishQuiz() {
    var profile = computeProfile();
    state.profile = profile;
    saveState();
    if (profile === "NF") {
      fireOnce("QuizCompleteNF", true);
      document.getElementById("demo-link").href = buildLandingDemoUrl();
      return showScreen("nf", "nf-title");
    }
    fireOnce("QuizComplete", true);
    renderResult(profile);
  }

  function renderResult(profile) {
    var data = PROFILES[profile];
    var age = state.answers.age || "na";
    var activity = (ACTIVITIES[age] || ACTIVITIES.na)[profile];
    document.getElementById("result-title").textContent = "Tu mapa de juego: " + data.title;
    document.getElementById("result-echo").textContent = observationsEcho();
    document.getElementById("result-summary").textContent = data.summary;
    document.getElementById("result-recommendation").textContent = data.recommendation;
    document.getElementById("activity-title").textContent = activity;
    document.getElementById("activity-context").textContent = personalizedContext();

    var badges = document.getElementById("result-badges");
    badges.innerHTML = "";
    data.badges.forEach(function (label) {
      var span = document.createElement("span");
      span.className = "badge";
      span.textContent = label;
      badges.appendChild(span);
    });

    var checkout = document.getElementById("checkout-link");
    checkout.href = buildCheckoutUrl();
    document.getElementById("result-demo-link").href = buildLandingDemoUrl();
    showScreen("result", "result-title");
  }

  function observationsEcho() {
    var cues = {
      gaze: "la mirada",
      gesture: "un sonido o un gesto",
      touch: "que se acerca o toca",
      body: "que mueve todo el cuerpo",
      varies: "que cambia según el día"
    };
    var attractions = {
      voice: "tu voz y tu cara",
      soft: "un pañuelo o un libro",
      objects: "los objetos grandes",
      movement: "la música y el movimiento",
      varies: "cosas distintas según el día"
    };
    var repetitions = {
      song: "la misma canción",
      hide: "aparecer y esconder",
      inout: "poner y sacar",
      move: "moverse juntos",
      none: "probar sin un favorito fijo"
    };
    var cue = cues[state.answers.cue] || "una señal pequeña";
    var attraction = attractions[state.answers.attraction] || "una propuesta sencilla";
    var repetition = repetitions[state.answers.repetition] || "repetir a su manera";
    return "Dijiste que primero notas " + cue + ", que suele atraerle " + attraction + " y que disfruta " + repetition + ". Esas pistas guiaron este mapa.";
  }

  function personalizedContext() {
    var moments = {
      wake: "después de despertar",
      pause: "una pausa",
      routine: "una rutina cotidiana",
      bedtime: "antes de dormir",
      varies: "el momento que funcione ese día"
    };
    var times = {
      "3-5": "3–5 minutos disponibles",
      "5-10": "5–10 minutos disponibles",
      "10-15": "10–15 minutos disponibles",
      variable: "el tiempo que tengan"
    };
    var goals = {
      calm: "un juego tranquilo",
      routine: "una rutina para repetir",
      explore: "una propuesta para explorar",
      flexible: "una idea rápida y flexible"
    };
    var moment = moments[state.answers.sharedMoment] || "el momento que elegiste";
    var duration = times[state.answers.time] || "el tiempo disponible";
    var goal = goals[state.answers.tomorrow] || "una idea para mañana";
    return "Elegida para " + moment + ", con " + duration + ", y pensando en " + goal + ". No es una calificación: es una forma de ordenar las pistas que ya observas.";
  }

  function safeCampaignValue(value, max) {
    return String(value || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, max || MAX_ATTR_LENGTH);
  }

  function safeSck(value) {
    return String(value || "")
      .replace(/[_.\s]+/g, "-")
      .replace(/[^A-Za-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  function loadConsent() {
    try {
      var value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (value === "allow") return true;
      if (value === "deny") return false;
    } catch (error) { /* El quiz funciona aunque el almacenamiento falle. */ }
    return null;
  }

  function saveConsent(allowed) {
    if (consentPreviewMode) return;
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, allowed ? "allow" : "deny"); }
    catch (error) { /* La preferencia dura solo esta visita. */ }
  }

  function isValidPixelId(value) {
    return /^\d{5,32}$/.test(String(value || "").trim());
  }

  function measurementConfigured() {
    return CONFIG.measurementEnabled === true && isValidPixelId(CONFIG.metaPixelId);
  }

  function consentPreviewRequested() {
    if (CONFIG.environment === "production" || typeof window.URLSearchParams !== "function") return false;
    try { return new window.URLSearchParams(window.location.search || "").get("consent_preview") === "1"; }
    catch (error) { return false; }
  }

  function readAttribution() {
    var stored = readStoredAttribution();
    var current = {};
    try {
      var params = new URLSearchParams(window.location.search);
      ALLOWED_ATTRIBUTION_KEYS.forEach(function (key) {
        var raw = params.get(key);
        if (!raw) return;
        if (key === "sck") current[key] = safeSck(raw);
        else current[key] = safeCampaignValue(raw, key === "fbclid" ? MAX_ATTR_LENGTH : 160);
      });
    } catch (error) { /* noop */ }
    var out = Object.keys(current).length ? current : stored;
    persistAttribution(out);
    return out;
  }

  function readStoredAttribution() {
    try {
      var raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      var stored = raw ? JSON.parse(raw) : {};
      var safe = {};
      Object.keys(stored).forEach(function (key) {
        if (ALLOWED_ATTRIBUTION_KEYS.indexOf(key) === -1) return;
        if (key === "fbclid" && measurementConsent !== true) return;
        var value = key === "sck"
          ? safeSck(stored[key])
          : safeCampaignValue(stored[key], key === "fbclid" ? MAX_ATTR_LENGTH : 160);
        if (value) safe[key] = value;
      });
      return safe;
    } catch (error) { return {}; }
  }

  function persistAttribution(source) {
    var safe = {};
    Object.keys(source || {}).forEach(function (key) {
      if (ALLOWED_ATTRIBUTION_KEYS.indexOf(key) === -1) return;
      if (key === "fbclid" && measurementConsent !== true) return;
      safe[key] = source[key];
    });
    try { window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(safe)); }
    catch (error) { /* La atribución continúa en memoria. */ }
  }

  var attribution = readAttribution();

  function conceptCode(attribution) {
    var raw = attribution.utm_content || attribution.cid || attribution.creative_id || "org";
    var match = String(raw).toLowerCase().match(/c\d{2}/);
    return match ? match[0] : "unk";
  }

  function buildCheckoutUrl() {
    var url = new URL(CHECKOUT_BASE);
    url.searchParams.delete("off");
    url.searchParams.delete("hotfeature");
    url.searchParams.delete("fbclid");
    Object.keys(attribution).forEach(function (key) {
      if (key === "fbclid" && measurementConsent !== true) return;
      url.searchParams.set(key, attribution[key]);
    });
    url.searchParams.set("sck", safeSck(attribution.sck) || safeSck("qz-conoce-" + conceptCode(attribution)));
    return url.toString();
  }

  function buildLandingDemoUrl() {
    var url = new URL("demo.html", window.location.href);
    Object.keys(attribution).forEach(function (key) {
      if (key === "fbclid" && measurementConsent !== true) return;
      url.searchParams.set(key, attribution[key]);
    });
    return url.toString();
  }

  function setDemoEntry(value) {
    try { window.sessionStorage.setItem(DEMO_ENTRY_KEY, value); } catch (error) { /* noop */ }
  }

  function externalTrackingAllowed() {
    return measurementConsent === true && measurementConfigured();
  }

  function installMetaPixel() {
    if (!externalTrackingAllowed()) return false;
    if (pixelInitialized) {
      if (typeof window.fbq === "function") window.fbq("consent", "grant");
      return true;
    }

    if (typeof window.fbq !== "function") {
      var fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
    }

    if (!document.getElementById(META_PIXEL_SCRIPT_ID)) {
      var script = document.createElement("script");
      script.id = META_PIXEL_SCRIPT_ID;
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      (document.head || document.documentElement).appendChild(script);
    }
    window.fbq("consent", "grant");
    window.fbq("init", String(CONFIG.metaPixelId).trim());
    pixelInitialized = true;
    return true;
  }

  function track(name, custom) {
    if (EXTERNAL_EVENT_NAMES.indexOf(name) === -1) return;
    try { window.dispatchEvent(new CustomEvent("pequenosritmos:track", { detail: { event: name } })); } catch (error) { /* noop */ }
    if (!installMetaPixel()) return;
    if (name === "ViewContent" && viewContentSent) return;
    if (name === "ViewContent") viewContentSent = true;

    var payload = {
      event: name,
      content_ids: ["V107386794P"],
      content_type: "product",
      content_name: "Agenda de Juegos y Rutinas - Esencial (6-24 meses)",
      value: 7,
      currency: "USD"
    };
    Object.keys(attribution).forEach(function (key) {
      if (key === "fbclid" && measurementConsent !== true) return;
      payload[key] = attribution[key];
    });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (typeof window.fbq === "function") {
      var metaPayload = { content_ids: payload.content_ids, content_type: payload.content_type, content_name: payload.content_name, value: payload.value, currency: payload.currency };
      if (name === "ViewContent" && !custom) window.fbq("track", name, metaPayload);
      else window.fbq("trackCustom", name, metaPayload);
    }
  }

  function fireOnce(name, custom) {
    if (state.fired[name]) return;
    state.fired[name] = true;
    saveState();
    track(name, custom);
  }

  function restart() {
    var measurement = state.measurement;
    var fired = state.fired;
    clearState();
    state = { screen: "intro", step: 0, answers: {}, fired: fired, measurement: measurement };
    document.getElementById("intro-title").textContent = introHeadline();
    showScreen("intro", "intro-title");
  }

  function handleConsent(allowed) {
    measurementConsent = allowed;
    state.measurement = allowed;
    saveConsent(allowed);
    persistAttribution(attribution);
    saveState();
    document.getElementById("consent").hidden = true;
    refreshAttributionLinks();
    if (allowed) track("ViewContent", false);
    else revokeMetaConsent();
  }

  function revokeMetaConsent() {
    if (typeof window.fbq === "function") window.fbq("consent", "revoke");
    try {
      document.cookie = "_fbp=; Max-Age=0; Path=/; SameSite=Lax";
      document.cookie = "_fbc=; Max-Age=0; Path=/; SameSite=Lax";
    } catch (error) { /* noop */ }
  }

  function openConsent() {
    var consent = document.getElementById("consent");
    if (!consent) return;
    consent.hidden = false;
    var first = consent.querySelector("[data-consent]");
    if (first && typeof first.focus === "function") first.focus();
  }

  function bindConsent() {
    var canChoose = measurementConfigured() || consentPreviewMode;
    var consent = document.getElementById("consent");
    Array.prototype.forEach.call(document.querySelectorAll("[data-open-consent]"), function (control) {
      control.hidden = !canChoose;
    });
    if (!consent || !canChoose) {
      if (consent) consent.hidden = true;
      return;
    }
    consent.hidden = measurementConsent !== null;
  }

  function refreshAttributionLinks() {
    var checkout = document.getElementById("checkout-link");
    var resultDemo = document.getElementById("result-demo-link");
    var nfDemo = document.getElementById("demo-link");
    if (checkout && state.screen === "result") checkout.href = buildCheckoutUrl();
    if (resultDemo) resultDemo.href = buildLandingDemoUrl();
    if (nfDemo) nfDemo.href = buildLandingDemoUrl();
  }

  document.addEventListener("click", function (event) {
    var action = event.target.closest("[data-action]");
    if (action) {
      event.preventDefault();
      if (action.dataset.action === "start") {
        state.step = 0;
        saveState();
        return renderQuestion();
      }
      if (action.dataset.action === "back") return goBack();
      if (action.dataset.action === "continue") return renderQuestion();
      if (action.dataset.action === "restart") return restart();
    }

    var consent = event.target.closest("[data-consent]");
    if (consent) handleConsent(consent.dataset.consent === "allow");

    var consentPreferences = event.target.closest("[data-open-consent]");
    if (consentPreferences) openConsent();
  });

  document.getElementById("checkout-link").addEventListener("click", function () {
    track("CheckoutClick", true);
  });
  document.getElementById("result-demo-link").addEventListener("click", function () { setDemoEntry("result"); });
  document.getElementById("demo-link").addEventListener("click", function () { setDemoEntry("nf"); });

  function init() {
    document.getElementById("intro-title").textContent = introHeadline();
    bindConsent();
    installImageFallbacks();
    if (externalTrackingAllowed()) track("ViewContent", false);

    if (state.screen === "quiz" && Number.isInteger(state.step) && state.step >= 0 && state.step < QUESTIONS.length) return renderQuestion();
    if (state.screen === "transition" && state.step === 5) return showScreen("transition", "transition-title");
    if (state.screen === "result" && state.profile && PROFILES[state.profile]) return renderResult(state.profile);
    if (state.screen === "nf") {
      document.getElementById("demo-link").href = buildLandingDemoUrl();
      return showScreen("nf", "nf-title");
    }
    showScreen("intro", "intro-title");
  }

  function installImageFallbacks() {
    Array.prototype.forEach.call(document.images, function (img) {
      img.addEventListener("error", function () {
        img.hidden = true;
        if (img.parentElement) img.parentElement.classList.add("image-fallback");
      }, { once: true });
    });
  }

  init();
})();
