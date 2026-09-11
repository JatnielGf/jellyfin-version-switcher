# jellyfin-version-switcher

A lightweight Jellyfin Web version switcher for quickly switching between available media sources.

## Current Version

**v1.4.0 — Stable**

> **Jellyfin 12 supported!** Version 1.4.0 is compatible with both **Jellyfin 12** and **Jellyfin 10.11**, using the same script.

## Compatibility

| Jellyfin version | Version Switcher | JavaScript Injector |
|---|---|---|
| **12.x** | ✅ v1.4.0+ | JavaScript Injector **v4.0.0.0+** |
| **10.11.x** | ✅ v1.4.0+ | JavaScript Injector **v4.0.0.0+** |

The JavaScript Injector project provides different plugin repository manifests depending on the Jellyfin version. Make sure you add the manifest that matches your Jellyfin installation.

## Installation

### 1. Install JavaScript Injector

JavaScript Injector is **not included by default** with Jellyfin. It is a separate community plugin that must be installed first.

Official plugin project: [Jellyfin JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

> **Important:** JavaScript Injector v4.0.0.0 added Jellyfin 12 support. Jellyfin 10.11 and Jellyfin 12 use different plugin repository manifests.

#### For Jellyfin 10.11.x

1. Open **Dashboard → Plugins → Catalog → ⚙️**.
2. Click **➕** to add a plugin repository.
3. Give it a name such as `JavaScript Injector Repo`.
4. Add this repository URL:

   `https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.11/manifest.json`

5. Click **Save**.
6. Return to **Catalog**, search for **JavaScript Injector**, and install it.
7. Restart the Jellyfin server.

#### For Jellyfin 12.x

1. Open **Dashboard → Plugins → Catalog → ⚙️**.
2. Click **➕** to add a plugin repository.
3. Give it a name such as `JavaScript Injector Repo`.
4. Add this repository URL:

   `https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/12/manifest.json`

5. Click **Save**.
6. Return to **Catalog**, search for **JavaScript Injector**, and install it.
7. Restart the Jellyfin server.

JavaScript Injector v4.0.0.0 is the version that adds Jellyfin 12 support. The project also provides the 10.11-specific manifest for Jellyfin 10.11 installations.

### 2. Import Version Switcher

The recommended installation method is to import the latest stable **`.json`** configuration exported by JavaScript Injector.

1. Open **Dashboard → Plugins → JavaScript Injector**.
2. Use the **Import** option.
3. Download the latest stable Version Switcher `.json` file from the project's [GitHub Releases](https://github.com/JatnielGf/jellyfin-version-switcher/releases).
4. Import the `.json` file into JavaScript Injector.
5. Enable the imported **Jellyfin Version Switcher** script if necessary.
6. Reload Jellyfin Web.
7. If the script or button does not appear, perform a hard refresh with **Ctrl+Shift+R**.

This `.json` import is the recommended installation method. You do **not** need to manually copy and paste the JavaScript source code.

### Manual installation

The JavaScript source is still available in [`src/version-switcher.js`](src/version-switcher.js) for development, inspection, and manual installation if needed.

### Docker note

For Docker installations, JavaScript Injector recommends having the **File Transformation** plugin installed to avoid permission and injection issues.

## Features

- Switch between available 4K and 1080p versions directly from the Jellyfin player.
- Keeps your current playback position when switching.
- Preserves the selected audio and subtitle tracks when possible.
- Preserves subtitles being turned off.
- Keeps forced subtitles matched correctly across versions.
- Shows resolution and bitrate for each version.
- Fast menu with English and Spanish UI.
- Automatically closes the menu when exiting fullscreen.
- Compatible with both **Jellyfin 10.11.x and Jellyfin 12.x**.

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
