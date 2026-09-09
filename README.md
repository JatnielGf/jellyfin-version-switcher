# jellyfin-version-switcher

A lightweight Jellyfin Web version switcher for quickly switching between available media sources.

## Current Version

**v1.3.0 — Stable**

## Installation

### 1. Install JavaScript Injector

JavaScript Injector is **not included by default** with Jellyfin. It is a separate community plugin that must be installed first.

Official plugin repository: [Jellyfin JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

For Jellyfin 10.11:

1. Open **Dashboard → Plugins → Catalog → ⚙️**.
2. Click **➕** to add a plugin repository.
3. Give it a name such as `JavaScript Injector Repo`.
4. Add this repository URL:

   `https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.11/manifest.json`

5. Click **Save**.
6. Return to **Catalog**, search for **JavaScript Injector**, and install it.
7. Restart the Jellyfin server.

The JavaScript Injector project provides version-specific repository manifests for Jellyfin 10.11 and other supported versions.

### 2. Import Version Switcher

The recommended installation method is now to import the latest stable **`.json`** configuration exported by JavaScript Injector.

1. Open **Dashboard → Plugins → JavaScript Injector**.
2. Use the **Import** option.
3. Download the latest stable Version Switcher `.json` file from the project's [GitHub Releases](https://github.com/JatnielGf/jellyfin-version-switcher/releases).
4. Import the `.json` file into JavaScript Injector.
5. Enable the imported **Jellyfin Version Switcher** script if necessary.
6. Reload Jellyfin Web. A hard refresh (`Ctrl+Shift+R`) may be required.

This `.json` import is the recommended installation method. You do **not** need to manually copy and paste the JavaScript source code.

### Manual installation

The JavaScript source is still available in [`src/version-switcher.js`](src/version-switcher.js) for development, inspection, and manual installation if needed.

### Docker note

For Jellyfin 10.11 Docker installations, JavaScript Injector recommends having the **File Transformation** plugin installed to avoid permission and injection issues.

## Features

- Native-looking Version Switcher button in the Jellyfin video player.
- Switches between available Media Sources without leaving playback.
- Preserves the current playback position.
- Preserves the currently selected audio track when an equivalent track is available.
- Preserves the currently selected subtitle track when an equivalent track is available.
- Preserves subtitles being turned off.
- Detects forced subtitles using both Jellyfin metadata and common track naming conventions.
- Shows resolution and bitrate for each available source.
- Correctly classifies common cinematic 4K and 1080p resolutions based on video width.
- Detects the currently playing source.
- English and Spanish UI support.
- Instant menu opening with sources loaded asynchronously.
- ESC and outside-click menu closing.
- Automatically closes the menu when fullscreen is exited.
- Protection against rapid repeated clicks.
- Recovers when Jellyfin rebuilds its video controls.
- Designed for Jellyfin Web and tested with the iOS Jellyfin client.

## Known Limitations

- Windows Desktop, Android, Fire TV, LG webOS, and Wholphin are currently not supported.
- Jellyfin Web internals used by the switcher may change in future Jellyfin releases and could require updates to the script.

## Version History

See [`CHANGELOG.md`](CHANGELOG.md) for the project history.

Older stable versions will be preserved through Git history and GitHub Releases.

## Credits & Acknowledgements

Developed by [JatnielGf](https://github.com/JatnielGf), with development assistance from ChatGPT (GPT-5.6 Luna).

Thanks to [@n00bcodr](https://github.com/n00bcodr) for creating and maintaining the [Jellyfin JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector), which makes it possible to inject custom JavaScript into Jellyfin Web and serves as an important dependency for this project.

**Author:** JatnielGf  
**Development assistance:** ChatGPT (GPT-5.6 Luna)  
**JavaScript Injector:** [@n00bcodr](https://github.com/n00bcodr)
