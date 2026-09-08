# jellyfin-version-switcher

A lightweight Jellyfin Web version switcher for quickly switching between available media sources.

## Current Version

**v1.2.8 — Stable**

## Installation

1. Install and enable the **JS Injector** plugin in Jellyfin.
2. Open the JS Injector settings.
3. Create a new JavaScript injection.
4. Copy the complete source from [`src/version-switcher.js`](src/version-switcher.js).
5. Paste it into JS Injector and save.
6. Reload Jellyfin Web. A hard refresh (`Ctrl+Shift+R`) may be required.

## Features

- Native-looking Version Switcher button in the Jellyfin video player.
- Switches between available Media Sources without leaving playback.
- Preserves the current playback position.
- Shows resolution and bitrate for each available source.
- Detects the currently playing source.
- English and Spanish UI support.
- ESC and outside-click menu closing.
- Protection against rapid repeated clicks.
- Recovers when Jellyfin rebuilds its video controls.
- Designed for Jellyfin Web and tested with the iOS Jellyfin client.

## Known Limitations

- ESC in fullscreen currently exits fullscreen before closing the Version Switcher menu.
- Audio and subtitle matching is detected but not automatically enforced.
- Windows Desktop, Android, and TV compatibility is still being tested.
- A small delay may occasionally occur while retrieving Media Sources.
- Some cinematic resolutions may currently be classified incorrectly.

## Version History

See [`CHANGELOG.md`](CHANGELOG.md) for the project history.

Older stable versions will be preserved through Git history and GitHub Releases.
