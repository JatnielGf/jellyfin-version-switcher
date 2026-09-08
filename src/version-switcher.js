(() => {
    "use strict";

    const VERSION = "1.2.8";

    const BUTTON_ID = "version-switcher-native-button";
    const MENU_ID = "version-switcher-native-menu";

    const language =
        (
            document.documentElement.lang ||
            navigator.language ||
            "en"
        ).toLowerCase();

    const isSpanish =
        language.startsWith("es");

    const TEXT = isSpanish
        ? {
            version: "Versión",
            unknown: "Desconocida",
            noSources: "No se encontraron fuentes.",
            changing: "Cambiando...",
            completed: "Cambio completado."
        }
        : {
            version: "Version",
            unknown: "Unknown",
            noSources: "No sources found.",
            changing: "Changing...",
            completed: "Switch completed."
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

    try {
        window.__versionSwitcherCleanup?.();
    } catch {}

    function cleanup() {
        try {
            domObserver?.disconnect();
        } catch {}

        try {
            controlsObserver?.disconnect();
        } catch {}

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
    }

    function warn(...args) {
        console.warn("[Version Switcher]", ...args);
    }

    function error(...args) {
        console.error("[Version Switcher]", ...args);
    }

    function describe(element) {
        if (!element) {
            return "NULL";
        }

        const id = element.id
            ? `#${element.id}`
            : "";

        const cls =
            typeof element.className === "string"
                ? `.${element.className
                    .trim()
                    .replace(/\s+/g, ".")}`
                : "";

        return `${element.tagName}${id}${cls}`;
    }

    log(`V${VERSION} iniciando.`);
    log("URL:", location.href);
    log("Idioma:", isSpanish ? "Español" : "English");

    function getPlaybackManager() {
        try {
            let found = null;

            window.webpackChunk?.push([
                [Symbol()],
                {},
                require => {
                    try {
                        if (require.m && require.m[39738]) {
                            const mod = require(39738);

                            if (
                                mod?.f?.getPlaybackMediaSources
                            ) {
                                found = mod.f;
                            }
                        }
                    } catch {}
                }
            ]);

            return found;
        } catch (e) {
            error(
                "Error obteniendo PlaybackManager:",
                e
            );

            return null;
        }
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
            const player =
                pm.getCurrentPlayer();

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

    function isVisible(element) {
        if (!element || !element.isConnected) {
            return false;
        }

        const style =
            window.getComputedStyle(element);

        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0"
        ) {
            return false;
        }

        const rect =
            element.getBoundingClientRect();

        return (
            rect.width > 0 &&
            rect.height > 0
        );
    }

    function getActiveControls() {
        const candidates =
            Array.from(
                document.querySelectorAll(
                    ".videoOsdBottom .buttons"
                )
            );

        if (!candidates.length) {
            return null;
        }

        const valid = candidates.filter(
            controls =>
                controls.isConnected &&
                isVisible(controls) &&
                controls.querySelector(
                    ".btnVideoOsdSettings"
                )
        );

        if (!valid.length) {
            return null;
        }

        const visibleOsds =
            valid.filter(controls => {
                const osd =
                    controls.closest(
                        ".videoOsdBottom"
                    );

                return osd && isVisible(osd);
            });

        if (visibleOsds.length) {
            return visibleOsds[0];
        }

        return valid[0];
    }

    function getResolution(source) {
        const videoStream =
            source?.MediaStreams?.find(
                stream =>
                    stream.Type === "Video"
            );

        const height =
            videoStream?.Height;

        if (!height) {
            return TEXT.unknown;
        }

        if (height >= 2160) {
            return "4K";
        }

        if (height >= 1080) {
            return "1080p";
        }

        if (height >= 720) {
            return "720p";
        }

        return `${height}p`;
    }

    function getAudioStream(source) {
        return source?.MediaStreams?.find(
            stream =>
                stream.Type === "Audio"
        ) || null;
    }

    function getSubtitleStream(source) {
        return source?.MediaStreams?.find(
            stream =>
                stream.Type === "Subtitle" &&
                !stream.IsExternal
        ) || null;
    }

    function getStreamLanguage(stream) {
        return (
            stream?.Language ||
            stream?.DisplayLanguage ||
            stream?.LanguageCode ||
            null
        );
    }

    function findMatchingAudio(
        source,
        language
    ) {
        if (
            !language ||
            !source?.MediaStreams
        ) {
            return null;
        }

        return source.MediaStreams.find(
            stream =>
                stream.Type === "Audio" &&
                getStreamLanguage(stream)
                    ?.toLowerCase() ===
                    language.toLowerCase()
        ) || null;
    }

    function findMatchingSubtitle(
        source,
        language
    ) {
        if (
            !language ||
            !source?.MediaStreams
        ) {
            return null;
        }

        return source.MediaStreams.find(
            stream =>
                stream.Type === "Subtitle" &&
                !stream.IsExternal &&
                getStreamLanguage(stream)
                    ?.toLowerCase() ===
                    language.toLowerCase()
        ) || null;
    }

    function closeMenu() {
        menuOperation++;

        menuOpening = false;

        if (menuCleanup) {
            try {
                menuCleanup();
            } catch {}

            menuCleanup = null;
        }

        const menu =
            document.getElementById(
                MENU_ID
            );

        if (menu) {
            menu.remove();
        }
    }

    function setButtonLocked(locked) {
        const button =
            document.getElementById(
                BUTTON_ID
            );

        if (!button) {
            return;
        }

        button.disabled = locked;
        button.style.pointerEvents =
            locked ? "none" : "";
        button.style.opacity =
            locked ? "0.5" : "";
    }

    function removeButtonsFromOtherControls(
        active
    ) {
        const buttons =
            Array.from(
                document.querySelectorAll(
                    `#${BUTTON_ID}`
                )
            );

        for (const button of buttons) {
            if (
                button.parentElement !== active
            ) {
                button.remove();
            }
        }
    }

    function createButton(
        controls
    ) {
        if (!controls) {
            return false;
        }

        const settingsButton =
            controls.querySelector(
                ".btnVideoOsdSettings"
            );

        if (!settingsButton) {
            return false;
        }

        const existing =
            controls.querySelector(
                `#${BUTTON_ID}`
            );

        if (existing) {
            return true;
        }

        const button =
            document.createElement(
                "button"
            );

        button.id = BUTTON_ID;
        button.type = "button";

        button.className =
            "btnVersionSwitcher autoSize paper-icon-button-light";

        button.setAttribute(
            "title",
            TEXT.version
        );

        button.setAttribute(
            "aria-label",
            TEXT.version
        );

        button.innerHTML = `
            <span
                class="material-icons"
                aria-hidden="true"
            >
                video_library
            </span>
        `;

        button.addEventListener(
            "pointerdown",
            event => {
                event.preventDefault();
                event.stopPropagation();

                toggleVersionMenu();
            }
        );

        button.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            },
            true
        );

        controls.insertBefore(
            button,
            settingsButton
        );

        return true;
    }

    function ensureButton() {
        const controls =
            getActiveControls();

        if (!controls) {
            return false;
        }

        removeButtonsFromOtherControls(
            controls
        );

        if (
            controls !== activeControls
        ) {
            activeControls =
                controls;

            log(
                "OSD ACTIVO:",
                describe(controls)
            );

            observeControls(controls);
        }

        const button =
            controls.querySelector(
                `#${BUTTON_ID}`
            );

        if (!button) {
            return createButton(
                controls
            );
        }

        return true;
    }

    function observeControls(
        controls
    ) {
        try {
            controlsObserver?.disconnect();
        } catch {}

        controlsObserver =
            new MutationObserver(() => {
                if (
                    !switchInProgress
                ) {
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

    async function toggleVersionMenu() {
        if (switchInProgress) {
            return;
        }

        if (
            document.getElementById(
                MENU_ID
            )
        ) {
            closeMenu();
            return;
        }

        if (menuOpening) {
            closeMenu();
            return;
        }

        await openVersionMenu();
    }

    async function openVersionMenu() {
        if (
            menuOpening ||
            switchInProgress
        ) {
            return;
        }

        menuOpening = true;

        const operation =
            ++menuOperation;

        try {
            const video =
                getVideo();

            if (!video) {
                return;
            }

            const playback =
                getCurrentPlayback();

            if (
                !playback.pm ||
                !playback.item
            ) {
                return;
            }

            const {
                pm,
                item,
                source: currentSource
            } = playback;

            const positionTicks =
                Math.floor(
                    video.currentTime *
                    10000000
                );

            const sources =
                await pm.getPlaybackMediaSources(
                    item,
                    {
                        startPositionTicks:
                            positionTicks
                    }
                );

            if (
                operation !== menuOperation ||
                switchInProgress
            ) {
                return;
            }

            if (!sources?.length) {
                warn(
                    TEXT.noSources
                );
                return;
            }

            const menu =
                createMenu(
                    sources,
                    currentSource
                );

            if (
                operation !== menuOperation
            ) {
                return;
            }

            document.body.appendChild(
                menu
            );

            const button =
                document.getElementById(
                    BUTTON_ID
                );

            if (
                operation !== menuOperation
            ) {
                menu.remove();
                return;
            }

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
                "Menú abierto.",
                sources.length,
                "fuentes."
            );
        } catch (e) {
            if (
                operation === menuOperation
            ) {
                error(
                    "Error abriendo menú:",
                    e
                );
            }
        } finally {
            if (
                operation === menuOperation
            ) {
                menuOpening = false;
            }
        }
    }

    function createMenu(
        sources,
        currentSource
    ) {
        const menu =
            document.createElement(
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
                padding: "6px",
                borderRadius: "6px",
                background:
                    "rgba(25,25,25,.96)",
                boxShadow:
                    "0 4px 18px rgba(0,0,0,.45)",
                backdropFilter:
                    "blur(8px)"
            }
        );

        sources.forEach(
            source => {
                const row =
                    document.createElement(
                        "button"
                    );

                row.type = "button";

                const isCurrent =
                    currentSource?.Id ===
                    source.Id;

                const resolution =
                    getResolution(
                        source
                    );

                const bitrate =
                    source.Bitrate
                        ? `${Math.round(
                            source.Bitrate /
                            1000000
                        )} Mbps`
                        : "";

                row.innerHTML = `
                    <span style="
                        width:22px;
                        display:inline-block;
                        text-align:center;
                    ">
                        ${
                            isCurrent
                                ? "✓"
                                : ""
                        }
                    </span>

                    <span style="
                        flex:1;
                        text-align:left;
                    ">
                        ${resolution}
                    </span>

                    ${
                        bitrate
                            ? `<span style="
                                opacity:.65;
                                font-size:12px;
                                margin-left:8px;
                            ">
                                ${bitrate}
                            </span>`
                            : ""
                    }
                `;

                Object.assign(
                    row.style,
                    {
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        minHeight: "36px",
                        padding: "6px 8px",
                        border: "0",
                        borderRadius: "4px",
                        background:
                            "transparent",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "14px",
                        textAlign: "left"
                    }
                );

                row.addEventListener(
                    "mouseenter",
                    () => {
                        if (
                            !switchInProgress
                        ) {
                            row.style.background =
                                "rgba(255,255,255,.10)";
                        }
                    }
                );

                row.addEventListener(
                    "mouseleave",
                    () => {
                        row.style.background =
                            "transparent";
                    }
                );

                row.addEventListener(
                    "click",
                    async event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                            switchInProgress
                        ) {
                            return;
                        }

                        if (isCurrent) {
                            closeMenu();
                            return;
                        }

                        await switchVersion(
                            source
                        );
                    }
                );

                menu.appendChild(row);
            }
        );

        return menu;
    }

    function positionMenu(
        menu,
        button
    ) {
        const rect =
            button.getBoundingClientRect();

        const menuWidth =
            menu.offsetWidth;

        const menuHeight =
            menu.offsetHeight;

        let left =
            rect.right -
            menuWidth;

        let top =
            rect.top -
            menuHeight -
            8;

        if (left < 8) {
            left = 8;
        }

        if (top < 8) {
            top =
                rect.bottom + 8;
        }

        if (
            left + menuWidth >
            window.innerWidth - 8
        ) {
            left =
                window.innerWidth -
                menuWidth -
                8;
        }

        if (
            top + menuHeight >
            window.innerHeight - 8
        ) {
            top =
                window.innerHeight -
                menuHeight -
                8;
        }

        menu.style.left =
            `${left}px`;

        menu.style.top =
            `${top}px`;
    }

    function installMenuListeners(
        menu
    ) {
        const onPointerDown =
            event => {
                if (
                    !menu.contains(
                        event.target
                    ) &&
                    event.target.id !==
                        BUTTON_ID
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    closeMenu();
                }
            };

        const onClick =
            event => {
                if (
                    !menu.contains(
                        event.target
                    ) &&
                    event.target.id !==
                        BUTTON_ID
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    closeMenu();
                }
            };

        const onKeyDown =
            event => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    closeMenu();
                }
            };

        document.addEventListener(
            "pointerdown",
            onPointerDown,
            true
        );

        document.addEventListener(
            "click",
            onClick,
            true
        );

        document.addEventListener(
            "keydown",
            onKeyDown,
            true
        );

        const onResize =
            () => {
                const button =
                    document.getElementById(
                        BUTTON_ID
                    );

                if (
                    menu.isConnected &&
                    button
                ) {
                    positionMenu(
                        menu,
                        button
                    );
                }
            };

        window.addEventListener(
            "resize",
            onResize
        );

        menuCleanup =
            () => {
                document.removeEventListener(
                    "pointerdown",
                    onPointerDown,
                    true
                );

                document.removeEventListener(
                    "click",
                    onClick,
                    true
                );

                document.removeEventListener(
                    "keydown",
                    onKeyDown,
                    true
                );

                window.removeEventListener(
                    "resize",
                    onResize
                );
            };
    }

    async function switchVersion(
        targetSource
    ) {
        const playback =
            getCurrentPlayback();

        if (
            !playback.pm ||
            !playback.item ||
            !targetSource
        ) {
            return;
        }

        const {
            pm,
            item,
            source: currentSource
        } = playback;

        const video =
            getVideo();

        if (!video) {
            return;
        }

        switchInProgress = true;
        setButtonLocked(true);

        const positionTicks =
            Math.floor(
                video.currentTime *
                10000000
            );

        const currentAudio =
            getAudioStream(
                currentSource
            );

        const currentSubtitle =
            getSubtitleStream(
                currentSource
            );

        const audioLanguage =
            getStreamLanguage(
                currentAudio
            );

        const subtitleLanguage =
            getStreamLanguage(
                currentSubtitle
            );

        const targetAudio =
            findMatchingAudio(
                targetSource,
                audioLanguage
            );

        const targetSubtitle =
            findMatchingSubtitle(
                targetSource,
                subtitleLanguage
            );

        log(
            "Cambiando a:",
            getResolution(
                targetSource
            )
        );

        log(
            "Posición:",
            video.currentTime.toFixed(2),
            "s"
        );

        if (audioLanguage) {
            log(
                "Audio:",
                audioLanguage,
                "compatible:",
                !!targetAudio
            );
        }

        if (subtitleLanguage) {
            log(
                "Subtítulo:",
                subtitleLanguage,
                "compatible:",
                !!targetSubtitle
            );
        }

        closeMenu();

        try {
            await pm.play({
                items: [item],
                startPositionTicks:
                    positionTicks,
                mediaSourceId:
                    targetSource.Id
            });

            await waitForSourceChange(
                pm,
                targetSource.Id,
                10000
            );

            log(
                TEXT.completed
            );
        } catch (e) {
            error(
                "Error cambiando de versión:",
                e
            );
        } finally {
            switchInProgress = false;
            setButtonLocked(false);
        }
    }

    async function waitForSourceChange(
        pm,
        targetSourceId,
        timeout
    ) {
        const start =
            Date.now();

        while (
            Date.now() - start <
            timeout
        ) {
            try {
                const player =
                    pm.getCurrentPlayer();

                if (player) {
                    const source =
                        pm.currentMediaSource(
                            player
                        );

                    if (
                        source?.Id ===
                        targetSourceId
                    ) {
                        return true;
                    }
                }
            } catch {}

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        250
                    )
            );
        }

        throw new Error(
            "Timeout esperando cambio de fuente."
        );
    }

    function monitor() {
        const url =
            location.href;

        if (url !== lastUrl) {
            log(
                "Navegación:",
                lastUrl,
                "→",
                url
            );

            lastUrl = url;

            activeControls = null;
            activeVideo = null;
            activeItemId = null;
        }

        const video =
            getVideo();

        if (video !== activeVideo) {
            activeVideo = video;

            if (video) {
                log(
                    "Nuevo elemento <video>."
                );
            }
        }

        const playback =
            getCurrentPlayback();

        const itemId =
            playback.item?.Id ||
            null;

        if (
            itemId !== activeItemId
        ) {
            activeItemId =
                itemId;

            if (itemId) {
                log(
                    "Nueva reproducción:",
                    itemId,
                    "|",
                    getResolution(
                        playback.source
                    )
                );
            }
        }

        ensureButton();
    }

    function startObserver() {
        if (domObserver) {
            return;
        }

        domObserver =
            new MutationObserver(
                () => {
                    if (
                        !switchInProgress
                    ) {
                        ensureButton();
                    }
                }
            );

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
            "Inicializando V1.2.8."
        );

        startObserver();

        ensureButton();

        monitorTimer =
            setInterval(
                monitor,
                500
            );

        log(
            "Monitor activo."
        );
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );
    } else {
        initialize();
    }

})();
