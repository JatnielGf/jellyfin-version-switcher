# Version Switcher

A Jellyfin Web version switcher for quickly switching between available media sources, with Custom Names, server-side configuration, and LG webOS support.

## Current Version

**v1.5.0 — Stable**

Version 1.5.0 supports **Jellyfin 10.11.x and Jellyfin 12.x** through ABI-specific plugin builds distributed from a single plugin repository.

## Compatibility

| Jellyfin version | Version Switcher | JavaScript Injector |
|---|---|---|
| **12.x** | ✅ v1.5.0 | JavaScript Injector **v4.0.0.0+** |
| **10.11.x** | ✅ v1.5.0 | JavaScript Injector **v4.0.0.0+** |

## Installation

### 1. Install JavaScript Injector

JavaScript Injector is a separate community plugin and must be installed first.

Official project: https://github.com/n00bcodr/Jellyfin-JavaScript-Injector

Use the JavaScript Injector repository manifest that matches your Jellyfin version:

**Jellyfin 10.11.x**
`https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.11/manifest.json`

**Jellyfin 12.x**
`https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/12/manifest.json`

Install JavaScript Injector v4.0.0.0 or newer, then restart Jellyfin if requested.

### 2. Install Version Switcher

Version Switcher now has its own Jellyfin plugin repository. You only need to add **one repository URL**, regardless of whether you use Jellyfin 10.11 or Jellyfin 12.

1. Open **Dashboard → Plugins → Repositories**.
2. Add a repository named `Version Switcher`.
3. Add this URL:

   `https://raw.githubusercontent.com/JatnielGf/jellyfin-version-switcher/main/manifest.json`

4. Save the repository.
5. Return to the plugin catalog and install **Version Switcher**.
6. Restart Jellyfin if prompted.

The repository contains both ABI-specific builds. Jellyfin selects the compatible build automatically.

After installing Version Switcher and JavaScript Injector, **no manual JavaScript copy/paste is required**. The plugin automatically registers the Version Switcher script with JavaScript Injector.

### Docker note

For Docker installations, JavaScript Injector recommends having the **File Transformation** plugin installed to avoid permission and injection issues.

## Features

- Switch between available media versions directly from the Jellyfin player.
- Custom version names derived automatically from filenames.
- Example: `Movie - Director's Cut.mkv` can appear as **Director's Cut — 1080p**. The resolution is detected automatically; it does not need to be included in the filename.
- Enable or disable Custom Names globally or for a specific movie or series.
- Per-media settings override the global Custom Names setting.
- Server-side Custom Names configuration with administrator-controlled editing permissions.
- Preserves playback position when switching versions.
- Preserves selected audio and subtitle tracks when possible.
- Preserves forced/default subtitle state.
- Shows resolution and bitrate for each version.
- Improved MediaSource detection across library and active playback sources.
- Optional Debug Logging for troubleshooting.
- LG webOS support, including remote navigation and focus handling.
- English and Spanish UI.
- Compatible with Jellyfin 10.11.x and Jellyfin 12.x.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the project history.

Older stable versions are preserved through Git history and GitHub Releases.

## Releases

The installable plugin packages are published as ABI-specific assets in the GitHub Releases page:

https://github.com/JatnielGf/jellyfin-version-switcher/releases

## Credits & Acknowledgements

Developed by [JatnielGf](https://github.com/JatnielGf), with development assistance from ChatGPT (GPT-5.6 Luna).

Thanks to [@n00bcodr](https://github.com/n00bcodr) for creating and maintaining the [Jellyfin JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector), which makes it possible to inject custom JavaScript into Jellyfin Web and serves as an important dependency for this project.

**Author:** JatnielGf  
**Development assistance:** ChatGPT (GPT-5.6 Luna)  
**JavaScript Injector:** [@n00bcodr](https://github.com/n00bcodr)
