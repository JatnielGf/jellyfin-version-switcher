# jellyfin-version-switcher

A lightweight Jellyfin Web version switcher for quickly switching between available media sources.

## Current Version

**v1.2.8 — Stable**

## Installation

### 1. Install JavaScript Injector

JavaScript Injector is **not included by default** with Jellyfin. It is a separate community plugin that must be installed first. urlJavaScript Injector repositoryhttps://github.com/n00bcodr/Jellyfin-JavaScript-Injector

For Jellyfin 10.11:

1. Open **Dashboard → Plugins → Catalog → ⚙️**.
2. Click **➕** to add a plugin repository.
3. Give it a name such as `JavaScript Injector Repo`.
4. Add this repository URL:

   `https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.11/manifest.json`

5. Click **Save**.
6. Return to **Catalog**, search for **JavaScript Injector**, and install it.
7. Restart the Jellyfin server.

The JavaScript Injector project provides version-specific repository manifests for Jellyfin 10.11 and other supported versions. citeturn1search0turn1search4

### 2. Add Version Switcher

1. Open **Dashboard → Plugins → JavaScript Injector**.
2. Click **Add Script**.
3. Give the script a name, for example `Jellyfin Version Switcher`.
4. Copy the complete source from [`src/version-switcher.js`](src/version-switcher.js).
5. Paste it into the JavaScript code field.
6. Enable the script and save.
7. Reload Jellyfin Web. A hard refresh (`Ctrl+Shift+R`) may be required.

### Docker note

For Jellyfin 10.11 Docker installations, JavaScript Injector recommends having the **File Transformation** plugin installed to avoid permission and injection issues. citeturn1search0

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
- Windows Desktop, Android, Fire TV, LG webOS, and Wholphin are currently not supported.
- A small delay may occasionally occur while retrieving Media Sources.
- Some cinematic resolutions may currently be classified incorrectly.

## Version History

See [`CHANGELOG.md`](CHANGELOG.md) for the project history.

Older stable versions will be preserved through Git history and GitHub Releases.

## Credits

Developed by [JatnielGf](https://github.com/JatnielGf), with development assistance from ChatGPT (GPT-5.6 Luna).

**Author:** JatnielGf  
**Development assistance:** ChatGPT (GPT-5.6 Luna)
