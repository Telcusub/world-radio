# World Radio

Stream live radio stations from around the world, straight from your browser.

Open the app: https://telcusub.github.io/world-radio/

- Search by name, country, language or genre
- Islamic tab: Sunni Quran, Islamic talk and nasheed stations, A to Z, with Star all (open directly with #islamic)
- Reconnects by itself if a stream drops, and moves to the next station if one is off air
- Favorites and recently played stations are saved on your device
- Station directory from [Radio Browser](https://www.radio-browser.info), a free community database

## Security and privacy

- No accounts, no tracking, no ads. Favorites and settings stay in your own browser.
- A Content Security Policy lets the page run only its own code from this site, and blocks forms, frames and plug-ins.
- The HLS playback add-on ([hls.js](https://github.com/video-dev/hls.js) 1.7.4, Apache-2.0) and the Archivo font (SIL OFL 1.1) are served from this repository, not from outside sites. The add-on is loaded with an integrity check, so a changed file is refused.
- No referrer is sent to stations or the directory.
- Outside services the app talks to: [Radio Browser](https://www.radio-browser.info) for the station list, and each station's own server for its audio and logo.
