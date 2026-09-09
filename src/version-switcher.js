(() => {
    "use strict";

    const VERSION = "1.3.0";

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
            loading: "Cargando...",
            noSources: "No se encontraron fuentes.",
            completed: "Cambio completado."
        }
        : {
            version: "Version",
            unknown: "Unknown",
            loading: "Loading...",
            noSources: "No sources found.",
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

    function getCurrentStreamIndexes(
        pm,
        player
    ) {
        try {
            if (
                !pm ||
                !player
            ) {
                return {
                    audioStreamIndex: null,
                    subtitleStreamIndex: null
                };
            }

            if (
                typeof pm.getPlayerState ===
                "function"
            ) {
                const playerState =
                    pm.getPlayerState(
                        player
                    );

                const playState =
                    playerState?.PlayState;

                return {
                    audioStreamIndex:
                        playState?.AudioStreamIndex ??
                        null,

                    subtitleStreamIndex:
                        playState?.SubtitleStreamIndex ??
                        null
                };
            }
        } catch (e) {
            log(
                "Error obteniendo índices actuales:",
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

        const width =
            videoStream?.Width;

        const height =
            videoStream?.Height;

        if (!width || !height) {
            return TEXT.unknown;
        }

        if (width >= 3000) {
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

    function isSubtitleForced(
        stream
    ) {
        if (!stream) {
            return false;
        }

        if (stream.IsForced) {
            return true;
        }

        const text = [
            stream.Title,
            stream.DisplayTitle
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return (
            text.includes("forzad") ||
            text.includes("forced")
        );
    }

    function findMatchingSubtitle(
        source,
        currentSubtitle
    ) {
        if (
            !currentSubtitle ||
            !source?.MediaStreams
        ) {
            return null;
        }

        const language =
            getStreamLanguage(
                currentSubtitle
            );

        if (!language) {
            return null;
        }

        const subtitles =
            source.MediaStreams.filter(
                stream =>
                    stream.Type === "Subtitle" &&
                    !stream.IsExternal &&
                    getStreamLanguage(stream)
                        ?.toLowerCase() ===
                        language.toLowerCase()
            );

        if (!subtitles.length) {
            return null;
        }

        const currentForced =
            isSubtitleForced(
                currentSubtitle
            );

        const exactMatch =
            subtitles.find(
                stream =>
                    isSubtitleForced(
                        stream
                    ) === currentForced &&
                    Boolean(stream.IsDefault) ===
                    Boolean(currentSubtitle.IsDefault)
            );

        if (exactMatch) {
            return exactMatch;
        }

        const sameForcedState =
            subtitles.find(
                stream =>
                    isSubtitleForced(
                        stream
                    ) === currentForced
            );

        return (
            sameForcedState ||
            subtitles[0]
        );
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

    function toggleVersionMenu() {
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

        openVersionMenu();
    }

    function createLoadingMenu() {
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

        const row =
            document.createElement(
                "div"
            );

        row.textContent =
            TEXT.loading;

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

    function replaceMenuContent(
        menu,
        sources,
        currentSource
    ) {
        const content =
            createMenuContent(
                sources,
                currentSource
            );

        menu.replaceChildren(
            ...content
        );
    }

    function createMenuContent(
        sources,
        currentSource
    ) {
        return sources.map(
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
                        padding: "0 8px",
                        border: "0",
                        borderRadius: "4px",
                        background:
                            isCurrent
                                ? "rgba(255,255,255,.10)"
                                : "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "14px",
                        textAlign: "left"
                    }
                );

                row.addEventListener(
                    "mouseenter",
                    () => {
                        row.style.background =
                            "rgba(255,255,255,.12)";
                    }
                );

                row.addEventListener(
                    "mouseleave",
                    () => {
                        row.style.background =
                            isCurrent
                                ? "rgba(255,255,255,.10)"
                                : "transparent";
                    }
                );

                row.addEventListener(
                    "click",
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (
                            switchInProgress
                        ) {
                            return;
                        }

                        if (
                            isCurrent
                        ) {
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

    function positionMenu(
        menu,
        button
    ) {
        const rect =
            button.getBoundingClientRect();

        const menuRect =
            menu.getBoundingClientRect();

        let left =
            rect.left;

        let top =
            rect.top -
            menuRect.height -
            8;

        if (
            top < 8
        ) {
            top =
                rect.bottom +
                8;
        }

        if (
            left +
            menuRect.width >
            window.innerWidth -
            8
        ) {
            left =
                window.innerWidth -
                menuRect.width -
                8;
        }

        if (left < 8) {
            left = 8;
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
                    menu.contains(
                        event.target
                    )
                ) {
                    return;
                }

                if (
                    event.target.closest(
                        `#${BUTTON_ID}`
                    )
                ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                closeMenu();
            };

        const onKeyDown =
            event => {
                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                if (
                    !document.getElementById(
                        MENU_ID
                    )
                ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                closeMenu();
            };

        const onFullscreenChange =
            () => {
                if (
                    !document.fullscreenElement &&
                    document.getElementById(
                        MENU_ID
                    )
                ) {
                    closeMenu();
                }
            };

        const onResize =
            () => {
                const button =
                    document.getElementById(
                        BUTTON_ID
                    );

                const currentMenu =
                    document.getElementById(
                        MENU_ID
                    );

                if (
                    button &&
                    currentMenu
                ) {
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
            "fullscreenchange",
            onFullscreenChange
        );

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
                    "keydown",
                    onKeyDown,
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
                menuOpening = false;
                return;
            }

            const playback =
                getCurrentPlayback();

            if (
                !playback.pm ||
                !playback.item
            ) {
                menuOpening = false;
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

            const menu =
                createLoadingMenu();

            document.body.appendChild(
                menu
            );

            const button =
                document.getElementById(
                    BUTTON_ID
                );

            if (
                button
            ) {
                positionMenu(
                    menu,
                    button
                );
            }

            installMenuListeners(
                menu
            );

            log(
                "Menú mostrado inmediatamente."
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
                operation !==
                    menuOperation ||
                switchInProgress
            ) {
                return;
            }

            if (
                !sources?.length
            ) {
                warn(
                    TEXT.noSources
                );

                menu.textContent =
                    TEXT.noSources;

                return;
            }

            replaceMenuContent(
                menu,
                sources,
                currentSource
            );

            if (
                operation !==
                menuOperation
            ) {
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
            if (
                operation ===
                menuOperation
            ) {
                error(
                    "Error obteniendo fuentes:",
                    e
                );

                const menu =
                    document.getElementById(
                        MENU_ID
                    );

                if (menu) {
                    menu.textContent =
                        TEXT.noSources;
                }

                menuOpening = false;
            }
        }
    }

    async function switchVersion(
        sourceId
    ) {
        if (
            switchInProgress
        ) {
            return;
        }

        switchInProgress = true;
        setButtonLocked(true);

        try {
            const video =
                getVideo();

            const playback =
                getCurrentPlayback();

            if (
                !video ||
                !playback.pm ||
                !playback.player ||
                !playback.item
            ) {
                return;
            }

            const {
                pm,
                player,
                item
            } = playback;

            const position =
                Math.floor(
                    video.currentTime *
                    10000000
                );

            const currentSource =
                pm.currentMediaSource(
                    player
                );

            const currentIndexes =
                getCurrentStreamIndexes(
                    pm,
                    player
                );

            log(
                "Índices actuales:",
                currentIndexes
            );

            const sources =
                await pm.getPlaybackMediaSources(
                    item,
                    {
                        startPositionTicks:
                            position
                    }
                );

            const targetSource =
                sources?.find(
                    source =>
                        source.Id ===
                        sourceId
                );

            if (!targetSource) {
                warn(
                    TEXT.noSources
                );
                return;
            }

            let audioStreamIndex =
                null;

            let subtitleStreamIndex =
                null;

            /*
             * Preserve subtitle OFF state.
             *
             * Jellyfin uses -1 when subtitles
             * are currently disabled.
             */
            if (
                currentIndexes.subtitleStreamIndex ===
                -1
            ) {
                subtitleStreamIndex = -1;

                log(
                    "Subtítulos apagados: se preservará el estado OFF."
                );
            }

            if (
                currentIndexes.audioStreamIndex !==
                    null &&
                currentSource?.MediaStreams
            ) {
                const currentAudio =
                    currentSource.MediaStreams.find(
                        stream =>
                            stream.Type === "Audio" &&
                            stream.Index ===
                                currentIndexes.audioStreamIndex
                    );

                const currentAudioLanguage =
                    getStreamLanguage(
                        currentAudio
                    );

                const targetAudio =
                    findMatchingAudio(
                        targetSource,
                        currentAudioLanguage
                    );

                if (targetAudio) {
                    audioStreamIndex =
                        targetAudio.Index;

                    log(
                        "Audio preservado:",
                        currentAudioLanguage,
                        "->",
                        targetAudio.Index
                    );
                }
            }

            if (
                currentIndexes.subtitleStreamIndex !==
                    null &&
                currentIndexes.subtitleStreamIndex >= 0 &&
                currentSource?.MediaStreams
            ) {
                const currentSubtitle =
                    currentSource.MediaStreams.find(
                        stream =>
                            stream.Type === "Subtitle" &&
                            stream.Index ===
                                currentIndexes.subtitleStreamIndex
                    );

                const currentSubtitleLanguage =
                    getStreamLanguage(
                        currentSubtitle
                    );

                const targetSubtitle =
                    findMatchingSubtitle(
                        targetSource,
                        currentSubtitle
                    );

                if (targetSubtitle) {
                    subtitleStreamIndex =
                        targetSubtitle.Index;

                    log(
                        "Subtítulo preservado:",
                        currentSubtitleLanguage,
                        "->",
                        targetSubtitle.Index
                    );
                }
            }

            closeMenu();

            await pm.play({
                items: [item],
                startPositionTicks:
                    position,
                mediaSourceId:
                    sourceId,

                ...(audioStreamIndex !== null
                    ? {
                        audioStreamIndex:
                            audioStreamIndex
                    }
                    : {}),

                ...(subtitleStreamIndex !== null
                    ? {
                        subtitleStreamIndex:
                            subtitleStreamIndex
                    }
                    : {})
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
                "Error cambiando versión:",
                e
            );

        } finally {
            switchInProgress = false;
            setButtonLocked(false);
        }
    }

    async function waitForSourceChange(
        pm,
        player,
        targetSourceId,
        timeout = 10000
    ) {
        const start =
            Date.now();

        while (
            Date.now() -
            start <
            timeout
        ) {
            try {
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
            } catch {}

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        250
                    )
            );
        }

        return false;
    }

    function monitor() {
        const url =
            location.href;

        if (
            url !==
            lastUrl
        ) {
            lastUrl =
                url;

            log(
                "URL cambió."
            );

            activeControls =
                null;

            activeVideo =
                null;

            activeItemId =
                null;

            setTimeout(
                ensureButton,
                50
            );
        }

        const video =
            getVideo();

        if (
            video !==
            activeVideo
        ) {
            activeVideo =
                video;

            activeControls =
                null;

            activeItemId =
                null;
        }

        const playback =
            getCurrentPlayback();

        const itemId =
            playback.item?.Id ||
            null;

        if (
            itemId !==
            activeItemId
        ) {
            activeItemId =
                itemId;

            activeControls =
                null;
        }

        if (
            !switchInProgress
        ) {
            ensureButton();
        }
    }

    function startObserver() {
        try {
            domObserver?.disconnect();
        } catch {}

        domObserver =
            new MutationObserver(() => {
                if (
                    !switchInProgress
                ) {
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
        startObserver();

        ensureButton();

        if (
            monitorTimer
        ) {
            clearInterval(
                monitorTimer
            );
        }

        monitorTimer =
            setInterval(
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
            5000,
            7000,
            10000
        ];

        for (
            const delay of retries
        ) {
            setTimeout(
                ensureButton,
                delay
            );
        }
    }

    initialize();
})();
