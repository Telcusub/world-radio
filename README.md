# World Radio

Stream live radio stations from around the world, straight from your browser.

Open the app: https://telcusub.github.io/world-radio/

- Search by name, country, language or genre
- Islamic tab: Sunni Quran, Islamic talk and nasheed stations, A to Z, with Star all (open directly with #islamic)
- The Islamic list is built daily by `.github/workflows/islamic.yml` (`tools/build_islamic.py`): every Sunni Islamic station in the Radio Browser directory plus mp3quran.net Quran radios, sorted into Quran, Lectures & dawah, Nasheed, Mosque live and Islamic talk. Report: `data/report/summary.json`
- Hand-picked stations live in `islamic-extra.json` and always show in the Islamic list; `aka` adds other spellings for search
- "Add to Islamic list" under the dial adds or removes the playing station on your own device
- Reconnects by itself if a stream drops, and moves to the next station if one is off air
- Resumes by itself when you come back after another app (video, call, voice note) took over the sound; phones don't let web pages restart sound while you are in another app
- Retro 1960s transistor-radio design, light and dark; fonts Archivo and Righteous (SIL OFL) are served from this repository
- Favorites and recently played stations are saved on your device
- Station directory from [Radio Browser](https://www.radio-browser.info), a free community database

## Security and privacy

- No accounts, no tracking, no ads. Favorites and settings stay in your own browser.
- A Content Security Policy lets the page run only its own code from this site, and blocks forms, frames and plug-ins.
- The HLS playback add-on ([hls.js](https://github.com/video-dev/hls.js) 1.7.4, Apache-2.0) and the Archivo font (SIL OFL 1.1) are served from this repository, not from outside sites. The add-on is loaded with an integrity check, so a changed file is refused.
- No referrer is sent to stations or the directory.
- Outside services the app talks to: [Radio Browser](https://www.radio-browser.info) for the station list, and each station's own server for its audio and logo.
