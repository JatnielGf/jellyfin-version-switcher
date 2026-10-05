(() => {
  "use strict";
  var _a;
  const VERSION = "1.5.0";
  const BUTTON_ID = "version-switcher-native-button";
  const MENU_ID = "version-switcher-native-menu";
  const language = (document.documentElement.lang || navigator.language || "en").toLowerCase();
  const isSpanish = language.startsWith("es");
  const TV_USER_AGENT_PATTERNS = [
    /Web0S/i
  ];
  function isTvClient() {
    return TV_USER_AGENT_PATTERNS.some(
      (pattern) => pattern.test(
        navigator.userAgent || ""
      )
    );
  }
  function replaceChildrenCompat(element, ...nodes) {
    element.textContent = "";
    for (const node of nodes) {
      element.appendChild(node);
    }
  }
  let DEBUG_TV_OVERLAY = false;
  let debugOverlayEl = null;
  let debugLogLines = [];
  function debugOverlayLog(line) {
    if (!DEBUG_TV_OVERLAY) {
      return;
    }
    debugLogLines.push(line);
    if (debugLogLines.length > 20) {
      debugLogLines.shift();
    }
    renderDebugOverlay();
  }
  function formatDebugArgs(args) {
    return args.map((arg) => {
      try {
        if (arg instanceof Error) {
          return arg.message || String(arg);
        }
        if (typeof arg === "object" && arg !== null) {
          return JSON.stringify(arg);
        }
        return String(arg);
      } catch {
        return "[unserializable]";
      }
    }).join(" ").slice(0, 160);
  }
  function renderDebugOverlay() {
    if (!DEBUG_TV_OVERLAY) {
      return;
    }
    if (!debugOverlayEl || !debugOverlayEl.isConnected) {
      debugOverlayEl = document.createElement("div");
      Object.assign(
        debugOverlayEl.style,
        {
          position: "fixed",
          top: "8px",
          left: "8px",
          zIndex: "2147483647",
          maxWidth: "92vw",
          background: "rgba(0,0,0,.85)",
          color: "#0f0",
          font: "12px monospace",
          padding: "8px",
          whiteSpace: "pre-wrap",
          pointerEvents: "none"
        }
      );
      document.body.appendChild(
        debugOverlayEl
      );
    }
    debugOverlayEl.textContent = "[VS DEBUG]\n" + debugLogLines.join("\n");
  }
  function addActivationHandlers(element, onActivate) {
    let lastActivation = 0;
    function activateOnce(event) {
      const now = Date.now();
      if (now - lastActivation < 300) {
        return;
      }
      lastActivation = now;
      onActivate(event);
    }
    element.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        activateOnce(event);
      }
    );
    element.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail === 0) {
          activateOnce(event);
        }
      },
      true
    );
    element.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" && event.key !== " " && event.keyCode !== 13 && event.keyCode !== 32) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        activateOnce(event);
      }
    );
  }
  const TEXT = isSpanish ? {
    version: "Versi\xF3n",
    unknown: "Desconocida",
    loading: "Cargando...",
    noSources: "No se encontraron fuentes.",
    completed: "Cambio completado.",
    noPlaybackManager: "No se pudo localizar el PlaybackManager interno.",
    settings: "Ajustes",
    back: "Volver",
    customNames: "Nombres personalizados",
    applyToThisMediaOnly: "Aplicar solo a este contenido"
  } : {
    version: "Version",
    unknown: "Unknown",
    loading: "Loading...",
    noSources: "No sources found.",
    completed: "Switch completed.",
    noPlaybackManager: "Could not locate the internal PlaybackManager.",
    settings: "Settings",
    back: "Back",
    customNames: "Custom Names",
    applyToThisMediaOnly: "Apply to this media only"
  };
  let switchInProgress = false;
  let menuOpening = false;
  let menuOperation = 0;
  let menuCleanup = null;
  let activeControls = null;
  let activeVideo = null;
  let activeItemId = null;
  let lastUrl = location.href;
  let domObserver = null;
  let controlsObserver = null;
  let monitorTimer = null;
  let cachedPlaybackManager = null;
  let playbackManagerScanAttempts = 0;
  const MAX_PLAYBACK_MANAGER_SCAN_ATTEMPTS = 10;
  const CHUNK_GLOBAL_CANDIDATES = [
    "webpackChunkjellyfin_web",
    "webpackChunk_jellyfin_web",
    "webpackChunkjellyfin-web",
    "webpackChunk"
  ];
  const CONTROLS_SELECTORS = [
    ".videoOsdBottom .buttons",
    ".osdControls .buttons",
    "[class*='videoOsd'] [class*='buttons']",
    "[class*='Osd'][class*='bottom'] [class*='buttons']",
    "[class*='osd'][class*='bottom'] [class*='buttons']"
  ];
  const SETTINGS_BUTTON_SELECTORS = [
    ".btnVideoOsdSettings",
    "[class*='btnVideoOsdSettings']",
    "button[title*='Settings' i]",
    "button[aria-label*='Settings' i]",
    "button[title*='Ajustes' i]",
    "button[aria-label*='Ajustes' i]"
  ];
  try {
    (_a = window.__versionSwitcherCleanup) == null ? void 0 : _a.call(window);
  } catch {
  }
  function cleanup() {
    try {
      domObserver == null ? void 0 : domObserver.disconnect();
    } catch {
    }
    try {
      controlsObserver == null ? void 0 : controlsObserver.disconnect();
    } catch {
    }
    if (monitorTimer) {
      clearInterval(monitorTimer);
      monitorTimer = null;
    }
    menuOperation++;
    menuOpening = false;
    closeMenu();
  }
  window.__versionSwitcherCleanup = cleanup;
  function log(...args) {
    console.log("[Version Switcher]", ...args);
    debugOverlayLog("LOG " + formatDebugArgs(args));
  }
  function warn(...args) {
    console.warn("[Version Switcher]", ...args);
    debugOverlayLog("WARN " + formatDebugArgs(args));
  }
  function error(...args) {
    console.error("[Version Switcher]", ...args);
    debugOverlayLog("ERR " + formatDebugArgs(args));
  }
  window.addEventListener("error", (event) => {
    debugOverlayLog(
      "WINDOW-ERR " + formatDebugArgs([
        event.message,
        event.filename + ":" + event.lineno
      ])
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    debugOverlayLog(
      "UNHANDLED-REJECTION " + formatDebugArgs([event.reason])
    );
  });
  function looksLikePlaybackManager(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }
    const requiredMethods = [
      "currentItem",
      "currentMediaSource",
      "getPlaybackMediaSources",
      "getCurrentPlayer",
      "play"
    ];
    return requiredMethods.every(
      (method) => typeof candidate[method] === "function"
    );
  }
  function scanModuleForPlaybackManager(mod) {
    if (!mod) {
      return null;
    }
    const candidates = [
      mod,
      mod.default
    ];
    try {
      for (const value of Object.values(mod)) {
        candidates.push(value);
      }
    } catch {
    }
    for (const candidate of candidates) {
      if (looksLikePlaybackManager(candidate)) {
        return candidate;
      }
    }
    return null;
  }
  function getPlaybackManager() {
    if (cachedPlaybackManager) {
      return cachedPlaybackManager;
    }
    if (playbackManagerScanAttempts >= MAX_PLAYBACK_MANAGER_SCAN_ATTEMPTS) {
      return null;
    }
    playbackManagerScanAttempts++;
    let found = null;
    let skippedModules = 0;
    const scanRequire = (require) => {
      try {
        if (!(require == null ? void 0 : require.m)) {
          return;
        }
        const moduleIds = Object.keys(require.m);
        for (const id of moduleIds) {
          if (found) {
            return;
          }
          let mod;
          try {
            mod = require(id);
          } catch {
            continue;
          }
          let match;
          try {
            match = scanModuleForPlaybackManager(mod);
          } catch {
            skippedModules++;
            continue;
          }
          if (match) {
            found = match;
            return;
          }
        }
        if (skippedModules > 0) {
          debugOverlayLog(
            "getPlaybackManager: skipped " + skippedModules + " module(s) that threw (cross-origin?) while scanning " + moduleIds.length + " total"
          );
        }
      } catch (e) {
        warn(
          "Error escaneando m\xF3dulos de webpack:",
          e
        );
      }
    };
    try {
      for (const globalName of CHUNK_GLOBAL_CANDIDATES) {
        if (found) {
          break;
        }
        const chunkArray = window[globalName];
        if (!chunkArray || typeof chunkArray.push !== "function") {
          continue;
        }
        try {
          chunkArray.push([
            [/* @__PURE__ */ Symbol()],
            {},
            scanRequire
          ]);
        } catch (e) {
          warn(
            `No se pudo usar la variable global "${globalName}":`,
            e
          );
        }
      }
    } catch (e) {
      error(
        "Error obteniendo PlaybackManager:",
        e
      );
      return null;
    }
    if (found) {
      cachedPlaybackManager = found;
      log("PlaybackManager localizado y cacheado.");
    } else {
      warn(TEXT.noPlaybackManager);
      if (playbackManagerScanAttempts >= MAX_PLAYBACK_MANAGER_SCAN_ATTEMPTS) {
        warn(
          "getPlaybackManager: se alcanz\xF3 el m\xE1ximo de " + MAX_PLAYBACK_MANAGER_SCAN_ATTEMPTS + " intentos, dejando de reintentar hasta el pr\xF3ximo cambio de URL."
        );
      }
    }
    return found;
  }
  function getCurrentStreamIndexes(pm, player) {
    var _a2, _b;
    try {
      if (!pm || !player) {
        return {
          audioStreamIndex: null,
          subtitleStreamIndex: null
        };
      }
      if (typeof pm.getPlayerState === "function") {
        const playerState = pm.getPlayerState(
          player
        );
        const playState = playerState == null ? void 0 : playerState.PlayState;
        return {
          audioStreamIndex: (_a2 = playState == null ? void 0 : playState.AudioStreamIndex) != null ? _a2 : null,
          subtitleStreamIndex: (_b = playState == null ? void 0 : playState.SubtitleStreamIndex) != null ? _b : null
        };
      }
    } catch (e) {
      log(
        "Error obteniendo \xEDndices actuales:",
        e
      );
    }
    return {
      audioStreamIndex: null,
      subtitleStreamIndex: null
    };
  }
  function getCurrentPlayback() {
    const pm = getPlaybackManager();
    if (!pm) {
      return {
        pm: null,
        player: null,
        item: null,
        source: null
      };
    }
    try {
      const player = pm.getCurrentPlayer();
      if (!player) {
        return {
          pm,
          player: null,
          item: null,
          source: null
        };
      }
      return {
        pm,
        player,
        item: pm.currentItem(player),
        source: pm.currentMediaSource(player)
      };
    } catch {
      return {
        pm,
        player: null,
        item: null,
        source: null
      };
    }
  }
  function getVideo() {
    return document.querySelector("video");
  }
  async function getLibraryMediaSources(item) {
    var _a2;
    try {
      const api = window.ApiClient;
      const userId = (_a2 = api == null ? void 0 : api.getCurrentUserId) == null ? void 0 : _a2.call(api);
      if (!api || !userId || !(item == null ? void 0 : item.Id)) {
        return [];
      }
      const full = await api.getItem(
        userId,
        item.Id
      );
      return ((full == null ? void 0 : full.MediaSources) || []).filter(
        (source) => source == null ? void 0 : source.Id
      );
    } catch (e) {
      warn(
        "No se pudieron leer las versiones de la biblioteca:",
        e
      );
      return [];
    }
  }
  function countMediaStreams(source) {
    var _a2;
    return ((_a2 = source == null ? void 0 : source.MediaStreams) == null ? void 0 : _a2.length) || 0;
  }
  function mergeMediaSources(fromLibrary, fromPlayback) {
    const merged = [];
    const seen = /* @__PURE__ */ new Set();
    const playbackById = new Map(
      fromPlayback.filter((source) => source == null ? void 0 : source.Id).map((source) => [source.Id, source])
    );
    for (const source of [
      ...fromLibrary,
      ...fromPlayback
    ]) {
      if (!(source == null ? void 0 : source.Id) || seen.has(source.Id)) {
        continue;
      }
      seen.add(source.Id);
      const playbackVersion = playbackById.get(source.Id);
      const richest = playbackVersion && countMediaStreams(playbackVersion) >= countMediaStreams(source) ? playbackVersion : source;
      merged.push(richest);
    }
    return merged;
  }
  async function getVersionSources(pm, item, positionTicks) {
    const [fromLibrary, fromPlayback] = await Promise.all([
      getLibraryMediaSources(item),
      pm.getPlaybackMediaSources(
        item,
        {
          startPositionTicks: positionTicks
        }
      ).catch((e) => {
        warn(
          "getPlaybackMediaSources fall\xF3:",
          e
        );
        return [];
      })
    ]);
    const merged = mergeMediaSources(
      fromLibrary,
      fromPlayback || []
    );
    log(
      "Versiones combinadas \u2014 biblioteca:",
      fromLibrary.length,
      "| playback:",
      (fromPlayback || []).length,
      "| total:",
      merged.length
    );
    return merged;
  }
  function isVisible(element) {
    if (!element || !element.isConnected) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  function queryAllSelectors(selectors) {
    const results = [];
    for (const selector of selectors) {
      try {
        results.push(
          ...Array.from(
            document.querySelectorAll(selector)
          )
        );
      } catch (e) {
        warn(
          `Selector inv\xE1lido "${selector}":`,
          e
        );
      }
    }
    return Array.from(new Set(results));
  }
  function getActiveControls() {
    const candidates = queryAllSelectors(CONTROLS_SELECTORS);
    if (!candidates.length) {
      return null;
    }
    const valid = candidates.filter(
      (controls) => controls.isConnected && isVisible(controls) && findSettingsButton(controls)
    );
    if (!valid.length) {
      return null;
    }
    const visibleOsds = valid.filter((controls) => {
      const osd = controls.closest(
        "[class*='videoOsd'], [class*='Osd'], .videoOsdBottom"
      ) || controls.parentElement;
      return osd && isVisible(osd);
    });
    if (visibleOsds.length) {
      return visibleOsds[0];
    }
    return valid[0];
  }
  function findSettingsButton(controls) {
    for (const selector of SETTINGS_BUTTON_SELECTORS) {
      try {
        const button = controls.querySelector(selector);
        if (button) {
          return button;
        }
      } catch {
      }
    }
    return null;
  }
  function getResolution(source) {
    var _a2;
    const videoStream = (_a2 = source == null ? void 0 : source.MediaStreams) == null ? void 0 : _a2.find(
      (stream) => stream.Type === "Video"
    );
    const width = videoStream == null ? void 0 : videoStream.Width;
    const height = videoStream == null ? void 0 : videoStream.Height;
    if (width && height) {
      if (width >= 3e3) {
        return "4K";
      }
      if (width >= 1800) {
        return "1080p";
      }
      if (width >= 1100) {
        return "720p";
      }
      return `${height}p`;
    }
    const trimmedName = (source == null ? void 0 : source.Name) && source.Name.trim();
    if (trimmedName) {
      return trimmedName;
    }
    return TEXT.unknown;
  }
  const VIDEO_EXTENSION_REGEX = /\.(mkv|mp4|m4v|avi|mov|wmv|m2ts|ts|webm|flv|iso)$/i;
  const RESOLUTION_TOKEN_REGEX = /^(4k|2160p|1080p|720p|480p|360p|240p|uhd|fhd|qhd|hd|sd|\d{3,4}p)$/i;
  function getSourceFilename(source) {
    const raw = (source == null ? void 0 : source.Path) || (source == null ? void 0 : source.Name) || null;
    if (!raw) {
      return null;
    }
    const base = raw.split(/[\\/]/).pop() || raw;
    return base.replace(
      VIDEO_EXTENSION_REGEX,
      ""
    );
  }
  function getCustomVersionName(source) {
    const filename = getSourceFilename(source);
    if (!filename) {
      return null;
    }
    const segments = filename.split(/\s-\s/);
    if (segments.length < 2) {
      return null;
    }
    const candidate = segments[segments.length - 1].trim();
    if (!candidate) {
      return null;
    }
    if (RESOLUTION_TOKEN_REGEX.test(
      candidate
    )) {
      return null;
    }
    return candidate;
  }
  function isRedundantLabel(source, resolution) {
    const filename = getSourceFilename(source);
    return Boolean(filename) && resolution === filename;
  }
  const CUSTOM_NAMES_STORAGE_KEY = "version-switcher-custom-names";
  const CUSTOM_NAMES_ENDPOINT_PATH = "VersionSwitcherSync/CustomNames";
  let customNamesConfigCache = {
    global: true,
    overrides: {},
    canEdit: false,
    debugOverlay: false
  };
  function parseCustomNamesConfigString(raw) {
    var _a2, _b, _c, _d;
    if (raw === "true" || raw === "false") {
      return {
        global: raw !== "false",
        overrides: {},
        canEdit: false,
        debugOverlay: false
      };
    }
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const globalValue = (_a2 = parsed == null ? void 0 : parsed.global) != null ? _a2 : parsed == null ? void 0 : parsed.Global;
    const overridesValue = (_b = parsed == null ? void 0 : parsed.overrides) != null ? _b : parsed == null ? void 0 : parsed.Overrides;
    const canEditValue = (_c = parsed == null ? void 0 : parsed.canEdit) != null ? _c : parsed == null ? void 0 : parsed.CanEdit;
    const debugOverlayValue = (_d = parsed == null ? void 0 : parsed.debugOverlay) != null ? _d : parsed == null ? void 0 : parsed.DebugOverlay;
    return {
      global: globalValue !== false,
      overrides: overridesValue && typeof overridesValue === "object" && overridesValue || {},
      canEdit: canEditValue === true,
      debugOverlay: debugOverlayValue === true
    };
  }
  function readCustomNamesConfigFromLocalStorage() {
    try {
      const raw = localStorage.getItem(
        CUSTOM_NAMES_STORAGE_KEY
      );
      if (raw === null) {
        return {
          global: true,
          overrides: {},
          canEdit: false,
          debugOverlay: false
        };
      }
      const parsed = parseCustomNamesConfigString(
        raw
      );
      return {
        ...parsed,
        canEdit: false
      };
    } catch (e) {
      warn(
        "No se pudo leer el respaldo local de Custom Names:",
        e
      );
      return {
        global: true,
        overrides: {},
        canEdit: false,
        debugOverlay: false
      };
    }
  }
  function mirrorCustomNamesConfigToLocalStorage(config) {
    try {
      localStorage.setItem(
        CUSTOM_NAMES_STORAGE_KEY,
        JSON.stringify(config)
      );
    } catch (e) {
      warn(
        "No se pudo actualizar el respaldo local de Custom Names:",
        e
      );
    }
  }
  function getCustomNamesEndpointContext() {
    const api = window.ApiClient;
    if (!api || typeof api.ajax !== "function" || typeof api.getUrl !== "function") {
      return null;
    }
    return {
      api,
      url: api.getUrl(
        CUSTOM_NAMES_ENDPOINT_PATH
      )
    };
  }
  async function fetchCustomNamesConfigFromServer() {
    try {
      const ctx = getCustomNamesEndpointContext();
      if (!ctx) {
        return null;
      }
      const body = await ctx.api.ajax(
        {
          type: "GET",
          url: ctx.url,
          dataType: "json"
        }
      );
      return parseCustomNamesConfigString(
        body
      );
    } catch (e) {
      warn(
        "No se pudo leer Custom Names desde el plugin VersionSwitcherSync:",
        e
      );
      return null;
    }
  }
  async function writeCustomNamesConfigToServer(config) {
    const ctx = getCustomNamesEndpointContext();
    if (!ctx) {
      throw new Error(
        "ApiClient no disponible para sincronizar Custom Names con el servidor."
      );
    }
    await ctx.api.ajax({
      type: "POST",
      url: ctx.url,
      data: JSON.stringify(config),
      contentType: "application/json"
    });
  }
  async function refreshCustomNamesConfigCache() {
    const fromServer = await fetchCustomNamesConfigFromServer();
    if (fromServer) {
      customNamesConfigCache = fromServer;
      mirrorCustomNamesConfigToLocalStorage(
        fromServer
      );
      return;
    }
    customNamesConfigCache = readCustomNamesConfigFromLocalStorage();
  }
  async function refreshDebugOverlaySetting() {
    try {
      const apiReady = await waitForApiClient();
      if (!apiReady) {
        return;
      }
      const fromServer = await fetchCustomNamesConfigFromServerWithRetries();
      if (fromServer) {
        customNamesConfigCache = fromServer;
        mirrorCustomNamesConfigToLocalStorage(
          fromServer
        );
        DEBUG_TV_OVERLAY = fromServer.debugOverlay === true;
        return;
      }
      customNamesConfigCache = readCustomNamesConfigFromLocalStorage();
      DEBUG_TV_OVERLAY = customNamesConfigCache.debugOverlay === true;
    } catch {
    }
  }
  async function fetchCustomNamesConfigFromServerWithRetries() {
    const delaysMs = [
      300,
      600,
      1e3,
      1500,
      2e3
    ];
    for (const delay of delaysMs) {
      const result = await fetchCustomNamesConfigFromServer();
      if (result) {
        return result;
      }
      await new Promise(
        (resolve) => setTimeout(resolve, delay)
      );
    }
    return fetchCustomNamesConfigFromServer();
  }
  function waitForApiClient() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      const check = () => {
        if (getCustomNamesEndpointContext()) {
          resolve(true);
          return;
        }
        attempts++;
        if (attempts >= maxAttempts) {
          resolve(false);
          return;
        }
        setTimeout(check, 200);
      };
      check();
    });
  }
  function getCustomNamesMediaId(item) {
    return (item == null ? void 0 : item.SeriesId) || (item == null ? void 0 : item.Id) || null;
  }
  function hasCustomNamesOverride(item) {
    const mediaId = getCustomNamesMediaId(item);
    if (!mediaId) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(
      customNamesConfigCache.overrides,
      mediaId
    );
  }
  function getCustomNamesEnabledForItem(item) {
    const mediaId = getCustomNamesMediaId(item);
    if (mediaId && Object.prototype.hasOwnProperty.call(
      customNamesConfigCache.overrides,
      mediaId
    )) {
      return customNamesConfigCache.overrides[mediaId];
    }
    return customNamesConfigCache.global;
  }
  function applyCustomNamesChangeLocally(item, enabled, applyToThisMediaOnly) {
    if (applyToThisMediaOnly) {
      const mediaId = getCustomNamesMediaId(
        item
      );
      if (mediaId) {
        customNamesConfigCache.overrides[mediaId] = enabled;
      }
    } else {
      customNamesConfigCache.global = enabled;
    }
    mirrorCustomNamesConfigToLocalStorage(
      customNamesConfigCache
    );
  }
  function syncCustomNamesConfigToServer() {
    const snapshot = {
      global: customNamesConfigCache.global,
      overrides: {
        ...customNamesConfigCache.overrides
      }
    };
    writeCustomNamesConfigToServer(
      snapshot
    ).catch((e) => {
      warn(
        "No se pudo sincronizar Custom Names con el servidor de Jellyfin (el cambio qued\xF3 aplicado solo en este dispositivo):",
        e
      );
    });
  }
  function getVersionLabel(source, resolution, customNamesEnabled) {
    if (!customNamesEnabled) {
      return resolution;
    }
    const customName = getCustomVersionName(source);
    if (!customName || isRedundantLabel(
      source,
      resolution
    )) {
      return resolution;
    }
    return `${customName} \u2014 ${resolution}`;
  }
  function escapeHtml(text) {
    return String(text).replace(
      /[&<>"']/g,
      (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[ch]
    );
  }
  function getStreamLanguage(stream) {
    return (stream == null ? void 0 : stream.Language) || (stream == null ? void 0 : stream.DisplayLanguage) || (stream == null ? void 0 : stream.LanguageCode) || null;
  }
  function findMatchingAudio(source, language2) {
    if (!language2 || !(source == null ? void 0 : source.MediaStreams)) {
      return null;
    }
    return source.MediaStreams.find(
      (stream) => {
        var _a2;
        return stream.Type === "Audio" && ((_a2 = getStreamLanguage(stream)) == null ? void 0 : _a2.toLowerCase()) === language2.toLowerCase();
      }
    ) || null;
  }
  function isSubtitleForced(stream) {
    if (!stream) {
      return false;
    }
    if (stream.IsForced) {
      return true;
    }
    const text = [
      stream.Title,
      stream.DisplayTitle
    ].filter(Boolean).join(" ").toLowerCase();
    return text.includes("forzad") || text.includes("forced");
  }
  function findMatchingSubtitle(source, currentSubtitle) {
    if (!currentSubtitle || !(source == null ? void 0 : source.MediaStreams)) {
      return null;
    }
    const language2 = getStreamLanguage(
      currentSubtitle
    );
    if (!language2) {
      return null;
    }
    const subtitles = source.MediaStreams.filter(
      (stream) => {
        var _a2;
        return stream.Type === "Subtitle" && !stream.IsExternal && ((_a2 = getStreamLanguage(stream)) == null ? void 0 : _a2.toLowerCase()) === language2.toLowerCase();
      }
    );
    if (!subtitles.length) {
      return null;
    }
    const currentForced = isSubtitleForced(
      currentSubtitle
    );
    const exactMatch = subtitles.find(
      (stream) => isSubtitleForced(
        stream
      ) === currentForced && Boolean(stream.IsDefault) === Boolean(currentSubtitle.IsDefault)
    );
    if (exactMatch) {
      return exactMatch;
    }
    const sameForcedState = subtitles.find(
      (stream) => isSubtitleForced(
        stream
      ) === currentForced
    );
    return sameForcedState || subtitles[0];
  }
  function closeMenu() {
    menuOperation++;
    menuOpening = false;
    if (menuCleanup) {
      try {
        menuCleanup();
      } catch {
      }
      menuCleanup = null;
    }
    const menu = document.getElementById(
      MENU_ID
    );
    if (menu) {
      menu.remove();
    }
  }
  function setButtonLocked(locked) {
    const button = document.getElementById(
      BUTTON_ID
    );
    if (!button) {
      return;
    }
    button.disabled = locked;
    button.style.pointerEvents = locked ? "none" : "";
    button.style.opacity = locked ? "0.5" : "";
  }
  function removeButtonsFromOtherControls(active) {
    const buttons = Array.from(
      document.querySelectorAll(
        `#${BUTTON_ID}`
      )
    );
    for (const button of buttons) {
      if (button.parentElement !== active) {
        button.remove();
      }
    }
  }
  function createButton(controls) {
    var _a2;
    if (!controls) {
      return false;
    }
    const settingsButton = findSettingsButton(controls);
    const existing = controls.querySelector(
      `#${BUTTON_ID}`
    );
    if (existing) {
      return true;
    }
    const button = document.createElement(
      "button"
    );
    button.id = BUTTON_ID;
    button.type = "button";
    const inheritedClasses = settingsButton ? settingsButton.className.split(/\s+/).filter(
      (cls) => cls && !/settings/i.test(cls)
    ) : [];
    button.className = [
      "btnVersionSwitcher",
      "autoSize",
      "paper-icon-button-light",
      ...inheritedClasses
    ].join(" ");
    debugOverlayLog(
      "neighbor.class=" + (settingsButton ? settingsButton.className : "NULL")
    );
    debugOverlayLog(
      "our.class=" + button.className
    );
    [
      "focus",
      "blur",
      "keydown",
      "keyup",
      "click",
      "pointerdown"
    ].forEach((type) => {
      button.addEventListener(
        type,
        (event) => {
          debugOverlayLog(
            type + " key=" + event.key + " code=" + event.keyCode + " detail=" + event.detail
          );
        },
        true
      );
    });
    requestAnimationFrame(() => {
      const rect = button.getBoundingClientRect();
      debugOverlayLog(
        "our.size=" + Math.round(
          rect.width
        ) + "x" + Math.round(
          rect.height
        )
      );
    });
    button.tabIndex = 0;
    button.setAttribute(
      "title",
      TEXT.version
    );
    button.setAttribute(
      "aria-label",
      TEXT.version
    );
    const nativeIcon = (_a2 = settingsButton == null ? void 0 : settingsButton.querySelector(
      ".material-icons"
    )) != null ? _a2 : null;
    const nativeIconSize = nativeIcon ? parseFloat(
      getComputedStyle(nativeIcon).fontSize
    ) : NaN;
    const iconSize = Number.isFinite(nativeIconSize) && nativeIconSize > 0 ? nativeIconSize : 24;
    debugOverlayLog(
      "native.iconFontSize=" + (nativeIcon ? nativeIconSize + "px" : "NO-NATIVE-ICON-FOUND") + " -> using " + iconSize + "px"
    );
    button.innerHTML = '<svg viewBox="0 0 24 24" width="' + iconSize + '" height="' + iconSize + '" fill="currentColor" aria-hidden="true" focusable="false"><path d="M4 6H2v14a2 2 0 0 2 2h14v-2H4V6z"/><path d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-8 12V6l6 4-6 4z"/></svg>';
    addActivationHandlers(
      button,
      () => toggleVersionMenu()
    );
    if (settingsButton) {
      controls.insertBefore(
        button,
        settingsButton
      );
    } else {
      controls.appendChild(button);
    }
    return true;
  }
  function ensureButton() {
    const controls = getActiveControls();
    if (!controls) {
      return false;
    }
    removeButtonsFromOtherControls(
      controls
    );
    if (controls !== activeControls) {
      activeControls = controls;
      observeControls(controls);
    }
    const button = controls.querySelector(
      `#${BUTTON_ID}`
    );
    if (!button) {
      return createButton(
        controls
      );
    }
    return true;
  }
  function observeControls(controls) {
    try {
      controlsObserver == null ? void 0 : controlsObserver.disconnect();
    } catch {
    }
    controlsObserver = new MutationObserver(() => {
      if (!switchInProgress) {
        ensureButton();
      }
    });
    controlsObserver.observe(
      controls,
      {
        childList: true,
        subtree: true
      }
    );
  }
  function toggleVersionMenu() {
    debugOverlayLog(
      "toggleVersionMenu() called, switchInProgress=" + switchInProgress + " menuOpening=" + menuOpening
    );
    if (switchInProgress) {
      return;
    }
    if (document.getElementById(
      MENU_ID
    )) {
      closeMenu();
      return;
    }
    if (menuOpening) {
      closeMenu();
      return;
    }
    openVersionMenu();
  }
  function createLoadingMenu() {
    const menu = document.createElement(
      "div"
    );
    menu.id = MENU_ID;
    Object.assign(
      menu.style,
      {
        position: "fixed",
        zIndex: "999999",
        minWidth: "190px",
        maxWidth: "280px",
        padding: "6px 6px 32px 6px",
        borderRadius: "6px",
        background: "rgba(25,25,25,.96)",
        boxShadow: "0 4px 18px rgba(0,0,0,.45)",
        backdropFilter: "blur(8px)"
      }
    );
    const row = document.createElement(
      "div"
    );
    row.textContent = TEXT.loading;
    Object.assign(
      row.style,
      {
        minHeight: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 12px",
        color: "rgba(255,255,255,.75)",
        fontSize: "14px"
      }
    );
    menu.appendChild(row);
    return menu;
  }
  function replaceMenuContent(menu, sources, currentSource, item) {
    menu._vsSources = sources;
    menu._vsCurrentSource = currentSource;
    menu._vsItem = item;
    const customNamesEnabled = getCustomNamesEnabledForItem(
      item
    );
    const content = createMenuContent(
      sources,
      currentSource,
      customNamesEnabled
    );
    const gearRow = createSettingsGearRow(menu);
    const canEdit = customNamesConfigCache.canEdit === true;
    menu.style.padding = canEdit ? "6px 6px 32px 6px" : "6px";
    replaceChildrenCompat(
      menu,
      ...content,
      ...canEdit ? [gearRow] : []
    );
    if (isTvClient()) {
      const rowToFocus = content.find(
        (row) => row.dataset && row.dataset.vsCurrent === "true"
      ) || content[0];
      if (rowToFocus) {
        requestAnimationFrame(() => {
          rowToFocus.focus();
        });
      }
    }
  }
  function createMenuContent(sources, currentSource, customNamesEnabled) {
    return sources.map(
      (source) => {
        const row = document.createElement(
          "button"
        );
        row.type = "button";
        const isCurrent = (currentSource == null ? void 0 : currentSource.Id) === source.Id;
        row.dataset.vsCurrent = isCurrent ? "true" : "false";
        const resolution = getResolution(
          source
        );
        const bitrate = source.Bitrate ? `${Math.round(
          source.Bitrate / 1e6
        )} Mbps` : "";
        const label = getVersionLabel(
          source,
          resolution,
          customNamesEnabled
        );
        row.innerHTML = `
                    <span style="
                        width:22px;
                        display:inline-block;
                        text-align:center;
                    ">
                        ${isCurrent ? "\u2713" : ""}
                    </span>

                    <span style="
                        flex:1;
                        text-align:left;
                    ">
                        ${escapeHtml(label)}
                    </span>

                    ${bitrate ? `<span style="
                                opacity:.65;
                                font-size:12px;
                                margin-left:8px;
                            ">
                                ${bitrate}
                            </span>` : ""}
                `;
        Object.assign(
          row.style,
          {
            display: "flex",
            alignItems: "center",
            width: "100%",
            minHeight: "36px",
            padding: "0 8px",
            border: "0",
            borderRadius: "4px",
            background: isCurrent ? "rgba(255,255,255,.10)" : "transparent",
            color: "#fff",
            cursor: "pointer",
            fontSize: "14px",
            textAlign: "left"
          }
        );
        row.addEventListener(
          "mouseenter",
          () => {
            row.style.background = "rgba(255,255,255,.12)";
          }
        );
        row.addEventListener(
          "mouseleave",
          () => {
            row.style.background = isCurrent ? "rgba(255,255,255,.10)" : "transparent";
          }
        );
        row.addEventListener(
          "focus",
          () => {
            row.style.background = "rgba(255,255,255,.12)";
            row.style.boxShadow = "inset 0 0 0 2px rgba(255,255,255,.6)";
          }
        );
        row.addEventListener(
          "blur",
          () => {
            row.style.background = isCurrent ? "rgba(255,255,255,.10)" : "transparent";
            row.style.boxShadow = "";
          }
        );
        row.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (switchInProgress) {
              return;
            }
            if (isCurrent) {
              closeMenu();
              return;
            }
            switchVersion(
              source.Id
            );
          }
        );
        return row;
      }
    );
  }
  function createSettingsGearRow(menu) {
    const gear = document.createElement("button");
    gear.type = "button";
    gear.setAttribute(
      "title",
      TEXT.settings
    );
    gear.setAttribute(
      "aria-label",
      TEXT.settings
    );
    Object.assign(
      gear.style,
      {
        position: "absolute",
        right: "10px",
        bottom: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        border: "0",
        borderRadius: "50%",
        background: "transparent",
        color: "rgba(255,255,255,.6)",
        cursor: "pointer"
      }
    );
    gear.innerHTML = '<span class="material-icons" style="font-size:16px;" aria-hidden="true">settings</span>';
    gear.addEventListener(
      "mouseenter",
      () => {
        gear.style.background = "rgba(255,255,255,.1)";
        gear.style.color = "#fff";
      }
    );
    gear.addEventListener(
      "mouseleave",
      () => {
        gear.style.background = "transparent";
        gear.style.color = "rgba(255,255,255,.6)";
      }
    );
    gear.addEventListener(
      "focus",
      () => {
        gear.style.background = "rgba(255,255,255,.1)";
        gear.style.color = "#fff";
        gear.style.boxShadow = "0 0 0 2px rgba(255,255,255,.6)";
      }
    );
    gear.addEventListener(
      "blur",
      () => {
        gear.style.background = "transparent";
        gear.style.color = "rgba(255,255,255,.6)";
        gear.style.boxShadow = "";
      }
    );
    gear.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (switchInProgress) {
          return;
        }
        await showSettingsView(
          menu
        );
      }
    );
    return gear;
  }
  function createToggleSwitch(enabled) {
    const track = document.createElement("div");
    Object.assign(
      track.style,
      {
        position: "relative",
        width: "34px",
        height: "18px",
        borderRadius: "9px",
        background: enabled ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.25)",
        transition: "background .2s",
        flexShrink: "0"
      }
    );
    const knob = document.createElement("div");
    Object.assign(
      knob.style,
      {
        position: "absolute",
        top: "2px",
        left: enabled ? "18px" : "2px",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: enabled ? "#000" : "#fff",
        transition: "left .2s"
      }
    );
    track.appendChild(knob);
    return track;
  }
  function createSettingsContent(menu) {
    const pending = menu._vsPendingCustomNames;
    const header = document.createElement("div");
    Object.assign(
      header.style,
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 8px 10px 8px"
      }
    );
    const title = document.createElement("span");
    title.textContent = TEXT.settings;
    Object.assign(
      title.style,
      {
        color: "#fff",
        fontWeight: "700",
        fontSize: "14px"
      }
    );
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.setAttribute(
      "title",
      TEXT.back
    );
    backButton.setAttribute(
      "aria-label",
      TEXT.back
    );
    Object.assign(
      backButton.style,
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        border: "0",
        borderRadius: "50%",
        background: "transparent",
        color: "#fff",
        cursor: "pointer"
      }
    );
    backButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
    backButton.addEventListener(
      "mouseenter",
      () => {
        backButton.style.background = "rgba(255,255,255,.1)";
      }
    );
    backButton.addEventListener(
      "mouseleave",
      () => {
        backButton.style.background = "transparent";
      }
    );
    backButton.addEventListener(
      "focus",
      () => {
        backButton.style.background = "rgba(255,255,255,.1)";
        backButton.style.boxShadow = "0 0 0 2px rgba(255,255,255,.6)";
      }
    );
    backButton.addEventListener(
      "blur",
      () => {
        backButton.style.background = "transparent";
        backButton.style.boxShadow = "";
      }
    );
    backButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        confirmSettingsAndReturn(
          menu
        );
      }
    );
    header.appendChild(title);
    header.appendChild(backButton);
    const toggleRow = document.createElement("button");
    toggleRow.type = "button";
    Object.assign(
      toggleRow.style,
      {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        minHeight: "36px",
        padding: "0 8px",
        border: "0",
        borderRadius: "4px",
        background: "transparent",
        color: "#fff",
        cursor: "pointer",
        fontSize: "14px",
        textAlign: "left"
      }
    );
    const label = document.createElement("span");
    label.textContent = TEXT.customNames;
    Object.assign(
      label.style,
      {
        flex: "1",
        textAlign: "left",
        whiteSpace: "normal",
        paddingRight: "8px"
      }
    );
    const switchWrapper = document.createElement("span");
    Object.assign(
      switchWrapper.style,
      {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexShrink: "0"
      }
    );
    const renderToggleState = () => {
      replaceChildrenCompat(
        switchWrapper
      );
      const stateText = document.createElement(
        "span"
      );
      stateText.textContent = pending.enabled ? "ON" : "OFF";
      Object.assign(
        stateText.style,
        {
          fontSize: "12px",
          opacity: ".7"
        }
      );
      switchWrapper.appendChild(
        stateText
      );
      switchWrapper.appendChild(
        createToggleSwitch(
          pending.enabled
        )
      );
    };
    renderToggleState();
    toggleRow.appendChild(label);
    toggleRow.appendChild(switchWrapper);
    toggleRow.addEventListener(
      "mouseenter",
      () => {
        toggleRow.style.background = "rgba(255,255,255,.08)";
      }
    );
    toggleRow.addEventListener(
      "mouseleave",
      () => {
        toggleRow.style.background = "transparent";
      }
    );
    toggleRow.addEventListener(
      "focus",
      () => {
        toggleRow.style.background = "rgba(255,255,255,.08)";
        toggleRow.style.boxShadow = "inset 0 0 0 2px rgba(255,255,255,.6)";
      }
    );
    toggleRow.addEventListener(
      "blur",
      () => {
        toggleRow.style.background = "transparent";
        toggleRow.style.boxShadow = "";
      }
    );
    toggleRow.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        pending.enabled = !pending.enabled;
        renderToggleState();
      }
    );
    const checkboxRow = document.createElement("button");
    checkboxRow.type = "button";
    Object.assign(
      checkboxRow.style,
      {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        minHeight: "36px",
        padding: "0 8px",
        border: "0",
        borderRadius: "4px",
        background: "transparent",
        color: "#fff",
        cursor: "pointer",
        fontSize: "13px",
        textAlign: "left"
      }
    );
    const checkboxGlyph = document.createElement("span");
    Object.assign(
      checkboxGlyph.style,
      {
        fontSize: "16px",
        width: "18px",
        textAlign: "center",
        flexShrink: "0"
      }
    );
    const checkboxLabel = document.createElement("span");
    checkboxLabel.textContent = TEXT.applyToThisMediaOnly;
    Object.assign(
      checkboxLabel.style,
      {
        opacity: ".85"
      }
    );
    const renderCheckboxState = () => {
      checkboxGlyph.textContent = pending.applyToThisMediaOnly ? "\u2611" : "\u2610";
    };
    renderCheckboxState();
    checkboxRow.appendChild(
      checkboxGlyph
    );
    checkboxRow.appendChild(
      checkboxLabel
    );
    checkboxRow.addEventListener(
      "mouseenter",
      () => {
        checkboxRow.style.background = "rgba(255,255,255,.08)";
      }
    );
    checkboxRow.addEventListener(
      "mouseleave",
      () => {
        checkboxRow.style.background = "transparent";
      }
    );
    checkboxRow.addEventListener(
      "focus",
      () => {
        checkboxRow.style.background = "rgba(255,255,255,.08)";
        checkboxRow.style.boxShadow = "inset 0 0 0 2px rgba(255,255,255,.6)";
      }
    );
    checkboxRow.addEventListener(
      "blur",
      () => {
        checkboxRow.style.background = "transparent";
        checkboxRow.style.boxShadow = "";
      }
    );
    checkboxRow.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        pending.applyToThisMediaOnly = !pending.applyToThisMediaOnly;
        renderCheckboxState();
      }
    );
    return [
      header,
      toggleRow,
      checkboxRow
    ];
  }
  function confirmSettingsAndReturn(menu) {
    const pending = menu._vsPendingCustomNames;
    if (pending) {
      applyCustomNamesChangeLocally(
        menu._vsItem,
        pending.enabled,
        pending.applyToThisMediaOnly
      );
      log(
        "Custom Names:",
        pending.enabled ? "ON" : "OFF",
        pending.applyToThisMediaOnly ? "(esta media)" : "(global)"
      );
    }
    menu._vsPendingCustomNames = null;
    showVersionListView(menu);
    if (pending) {
      syncCustomNamesConfigToServer();
    }
  }
  async function showSettingsView(menu) {
    await refreshCustomNamesConfigCache();
    menu._vsPendingCustomNames = {
      enabled: getCustomNamesEnabledForItem(
        menu._vsItem
      ),
      applyToThisMediaOnly: hasCustomNamesOverride(
        menu._vsItem
      )
    };
    replaceChildrenCompat(
      menu,
      ...createSettingsContent(menu)
    );
    const button = document.getElementById(
      BUTTON_ID
    );
    if (button) {
      positionMenu(menu, button);
    }
    if (isTvClient()) {
      const toggleRow = menu.querySelectorAll(
        "button"
      )[1];
      if (toggleRow) {
        requestAnimationFrame(() => {
          toggleRow.focus();
        });
      }
    }
  }
  function showVersionListView(menu) {
    if (!menu._vsSources) {
      return;
    }
    replaceMenuContent(
      menu,
      menu._vsSources,
      menu._vsCurrentSource,
      menu._vsItem
    );
    const button = document.getElementById(
      BUTTON_ID
    );
    if (button) {
      positionMenu(menu, button);
    }
  }
  function positionMenu(menu, button) {
    const rect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top - menuRect.height - 8;
    if (top < 8) {
      top = rect.bottom + 8;
    }
    if (left + menuRect.width > window.innerWidth - 8) {
      left = window.innerWidth - menuRect.width - 8;
    }
    if (left < 8) {
      left = 8;
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
  function installMenuListeners(menu) {
    const onArrowNav = (event) => {
      if (!isTvClient()) {
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const active = document.activeElement;
      if (!active || !menu.contains(active)) {
        return;
      }
      const focusable = Array.from(
        menu.querySelectorAll(
          "button"
        )
      );
      const currentIndex = focusable.indexOf(active);
      if (currentIndex === -1) {
        return;
      }
      const nextIndex = event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0 || nextIndex >= focusable.length) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      focusable[nextIndex].focus();
    };
    const onPointerDown = (event) => {
      if (menu.contains(
        event.target
      )) {
        return;
      }
      if (event.target.closest(
        `#${BUTTON_ID}`
      )) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeMenu();
    };
    const isCloseMenuKey = (event) => event.key === "Escape" || event.key === "Backspace" || event.key === "GoBack" || event.key === "BrowserBack" || event.keyCode === 461;
    const onKeyDown = (event) => {
      if (!isCloseMenuKey(event)) {
        return;
      }
      if (!document.getElementById(
        MENU_ID
      )) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (menu._vsPendingCustomNames) {
        confirmSettingsAndReturn(
          menu
        );
      } else {
        closeMenu();
      }
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && document.getElementById(
        MENU_ID
      )) {
        closeMenu();
      }
    };
    const onResize = () => {
      const button = document.getElementById(
        BUTTON_ID
      );
      const currentMenu = document.getElementById(
        MENU_ID
      );
      if (button && currentMenu) {
        positionMenu(
          currentMenu,
          button
        );
      }
    };
    document.addEventListener(
      "pointerdown",
      onPointerDown,
      true
    );
    document.addEventListener(
      "keydown",
      onKeyDown,
      true
    );
    document.addEventListener(
      "keydown",
      onArrowNav,
      true
    );
    document.addEventListener(
      "fullscreenchange",
      onFullscreenChange
    );
    window.addEventListener(
      "resize",
      onResize
    );
    menuCleanup = () => {
      document.removeEventListener(
        "pointerdown",
        onPointerDown,
        true
      );
      document.removeEventListener(
        "keydown",
        onKeyDown,
        true
      );
      document.removeEventListener(
        "keydown",
        onArrowNav,
        true
      );
      document.removeEventListener(
        "fullscreenchange",
        onFullscreenChange
      );
      window.removeEventListener(
        "resize",
        onResize
      );
    };
  }
  async function openVersionMenu() {
    if (menuOpening || switchInProgress) {
      return;
    }
    menuOpening = true;
    const operation = ++menuOperation;
    try {
      log("openVersionMenu: start");
      const video = getVideo();
      if (!video) {
        warn("openVersionMenu: no <video> found, aborting");
        menuOpening = false;
        return;
      }
      const playback = getCurrentPlayback();
      if (!playback.pm || !playback.item) {
        warn(
          "openVersionMenu: pm=" + !!playback.pm + " item=" + !!playback.item + ", aborting"
        );
        menuOpening = false;
        return;
      }
      const {
        pm,
        item,
        source: currentSource
      } = playback;
      const positionTicks = Math.floor(
        video.currentTime * 1e7
      );
      const menu = createLoadingMenu();
      document.body.appendChild(
        menu
      );
      const button = document.getElementById(
        BUTTON_ID
      );
      if (button) {
        positionMenu(
          menu,
          button
        );
      }
      installMenuListeners(
        menu
      );
      log(
        "Men\xFA mostrado inmediatamente."
      );
      const [sources] = await Promise.all([
        getVersionSources(
          pm,
          item,
          positionTicks
        ),
        refreshCustomNamesConfigCache()
      ]);
      if (operation !== menuOperation || switchInProgress) {
        return;
      }
      if (!(sources == null ? void 0 : sources.length)) {
        warn(
          TEXT.noSources
        );
        menu.textContent = TEXT.noSources;
        return;
      }
      replaceMenuContent(
        menu,
        sources,
        currentSource,
        item
      );
      if (operation !== menuOperation) {
        return;
      }
      positionMenu(
        menu,
        button
      );
      menuOpening = false;
      log(
        "Fuentes cargadas:",
        sources.length
      );
    } catch (e) {
      if (operation === menuOperation) {
        error(
          "Error obteniendo fuentes:",
          e
        );
        const menu = document.getElementById(
          MENU_ID
        );
        if (menu) {
          menu.textContent = TEXT.noSources;
        }
        menuOpening = false;
      }
    }
  }
  async function switchVersion(sourceId) {
    if (switchInProgress) {
      return;
    }
    switchInProgress = true;
    setButtonLocked(true);
    try {
      const video = getVideo();
      const playback = getCurrentPlayback();
      if (!video || !playback.pm || !playback.player || !playback.item) {
        return;
      }
      const {
        pm,
        player,
        item
      } = playback;
      const position = Math.floor(
        video.currentTime * 1e7
      );
      const currentSource = pm.currentMediaSource(
        player
      );
      const currentIndexes = getCurrentStreamIndexes(
        pm,
        player
      );
      log(
        "\xCDndices actuales:",
        currentIndexes
      );
      const sources = await getVersionSources(
        pm,
        item,
        position
      );
      const targetSource = sources == null ? void 0 : sources.find(
        (source) => source.Id === sourceId
      );
      if (!targetSource) {
        warn(
          TEXT.noSources
        );
        return;
      }
      let audioStreamIndex = null;
      let subtitleStreamIndex = null;
      if (currentIndexes.subtitleStreamIndex === -1) {
        subtitleStreamIndex = -1;
        log(
          "Subt\xEDtulos apagados: se preservar\xE1 el estado OFF."
        );
      }
      if (currentIndexes.audioStreamIndex !== null && (currentSource == null ? void 0 : currentSource.MediaStreams)) {
        const currentAudio = currentSource.MediaStreams.find(
          (stream) => stream.Type === "Audio" && stream.Index === currentIndexes.audioStreamIndex
        );
        const currentAudioLanguage = getStreamLanguage(
          currentAudio
        );
        const targetAudio = findMatchingAudio(
          targetSource,
          currentAudioLanguage
        );
        if (targetAudio) {
          audioStreamIndex = targetAudio.Index;
          log(
            "Audio preservado:",
            currentAudioLanguage,
            "->",
            targetAudio.Index
          );
        }
      }
      if (currentIndexes.subtitleStreamIndex !== null && currentIndexes.subtitleStreamIndex >= 0 && (currentSource == null ? void 0 : currentSource.MediaStreams)) {
        const currentSubtitle = currentSource.MediaStreams.find(
          (stream) => stream.Type === "Subtitle" && stream.Index === currentIndexes.subtitleStreamIndex
        );
        const currentSubtitleLanguage = getStreamLanguage(
          currentSubtitle
        );
        const targetSubtitle = findMatchingSubtitle(
          targetSource,
          currentSubtitle
        );
        if (targetSubtitle) {
          subtitleStreamIndex = targetSubtitle.Index;
          log(
            "Subt\xEDtulo preservado:",
            currentSubtitleLanguage,
            "->",
            targetSubtitle.Index
          );
        }
      }
      closeMenu();
      await pm.play({
        items: [item],
        startPositionTicks: position,
        mediaSourceId: sourceId,
        ...audioStreamIndex !== null ? {
          audioStreamIndex
        } : {},
        ...subtitleStreamIndex !== null ? {
          subtitleStreamIndex
        } : {}
      });
      await waitForSourceChange(
        pm,
        player,
        sourceId
      );
      log(
        TEXT.completed
      );
    } catch (e) {
      error(
        "Error cambiando versi\xF3n:",
        e
      );
    } finally {
      switchInProgress = false;
      setButtonLocked(false);
    }
  }
  async function waitForSourceChange(pm, player, targetSourceId, timeout = 1e4) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const source = pm.currentMediaSource(
          player
        );
        if ((source == null ? void 0 : source.Id) === targetSourceId) {
          return true;
        }
      } catch {
      }
      await new Promise(
        (resolve) => setTimeout(
          resolve,
          250
        )
      );
    }
    return false;
  }
  function monitor() {
    var _a2;
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      log(
        "URL cambi\xF3."
      );
      activeControls = null;
      activeVideo = null;
      activeItemId = null;
      playbackManagerScanAttempts = 0;
      setTimeout(
        ensureButton,
        50
      );
    }
    const video = getVideo();
    if (video !== activeVideo) {
      activeVideo = video;
      activeControls = null;
      activeItemId = null;
    }
    const playback = getCurrentPlayback();
    const itemId = ((_a2 = playback.item) == null ? void 0 : _a2.Id) || null;
    if (itemId !== activeItemId) {
      activeItemId = itemId;
      activeControls = null;
    }
    if (!switchInProgress) {
      ensureButton();
    }
  }
  function startObserver() {
    try {
      domObserver == null ? void 0 : domObserver.disconnect();
    } catch {
    }
    domObserver = new MutationObserver(() => {
      if (!switchInProgress) {
        ensureButton();
      }
    });
    domObserver.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }
  function initialize() {
    log(
      `Inicializando v${VERSION}...`
    );
    refreshDebugOverlaySetting();
    startObserver();
    ensureButton();
    if (monitorTimer) {
      clearInterval(
        monitorTimer
      );
    }
    monitorTimer = setInterval(
      monitor,
      500
    );
    const retries = [
      50,
      150,
      300,
      500,
      800,
      1200,
      1800,
      2500,
      3500,
      5e3,
      7e3,
      1e4
    ];
    for (const delay of retries) {
      setTimeout(
        ensureButton,
        delay
      );
    }
  }
  initialize();
})();