# Changelog

## [1.3.0] - Stable

### Added

- Added audio track preservation when switching between versions.
- Added subtitle track preservation when switching between versions.
- Added support for preserving subtitles being turned off.
- Added forced-subtitle detection using Jellyfin metadata and common track naming.
- Added improved resolution detection for 4K and 1080p cinematic files.

### Improvements

- Improved version switching through Jellyfin's internal playback manager.
- Improved menu responsiveness by loading Media Sources asynchronously.
- Improved subtitle matching across versions.
- Added automatic menu cleanup when exiting fullscreen.
- Improved English and Spanish UI support.

### Fixed

- Fixed cinematic resolutions such as 3840x1608 being incorrectly classified by height.
- Fixed forced subtitles being matched incorrectly between different versions.
- Fixed selected audio and subtitle tracks not being preserved when switching versions.
- Fixed subtitles being unintentionally enabled when they were turned off.
- Fixed the menu remaining open after exiting fullscreen.

### Compatibility

- Tested with Jellyfin Web and the Jellyfin iOS client.
- Windows Desktop, Android, Fire TV, LG webOS, and Wholphin are currently not supported.

## [1.2.8] - Stable

### Added

- Added a native Version Switcher button to the Jellyfin video player.
- Added support for switching between available Media Sources.
- Added resolution and bitrate information.
- Added playback position preservation when switching versions.
- Added automatic detection of the currently playing version.
- Added English and Spanish UI text.

### Improvements

- Improved menu opening and closing reliability.
- Added protection against rapid repeated clicks.
- Added menu toggle behavior.
- Added ESC support.
- Added outside-click support without pausing playback.
- Improved recovery when Jellyfin rebuilds the video controls.
- Improved compatibility with Jellyfin SPA navigation.
- Prevented duplicate Version Switcher buttons.
- Simplified the menu interface.

### Fixed

- Fixed the Version Switcher disappearing after page refresh.
- Fixed the button disappearing when entering playback through different navigation paths.
- Fixed stale menus appearing after rapidly opening and closing the menu.
- Fixed duplicate or incorrect menu states.

### Known Limitations

- ESC in fullscreen currently exits fullscreen before closing the Version Switcher menu.
- Audio/subtitle matching is detected but not automatically enforced.
- Windows Desktop, Android, and TV compatibility is still being tested.
- A small delay may occasionally occur while retrieving Media Sources.
- Cinematic resolutions such as 3840x1608 are currently classified by height and may be labeled incorrectly.
