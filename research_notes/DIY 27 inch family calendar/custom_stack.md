# Custom Software Stack for a DIY Family Wall Calendar (Rust + Svelte/SvelteKit + TypeScript on a Linux Touchscreen Kiosk)

Research date: 2026-11-10. About 21 search and fetch calls. Many results were third-party guides or search snippets. Where a primary source could not be fetched, the note says so. Statements under "Inferences" are reasoning or background knowledge from before this research, not verified in this session. They should be checked before they are presented as fact.

## Q1. Tauri v2 vs Chromium kiosk on a Linux ARM64 board (Pi 5 / RK3588 / N100): WebKitGTK performance, DMA-BUF env vars, cage/labwc, autostart, touch

### Takeaway
On Linux, Tauri v2 renders through WebKitGTK. Its own docs list a ladder of env-var workarounds for blank or white windows and Wayland "Error 71" crashes, and each step costs some GPU acceleration. No source found benchmarks Tauri on a Pi 5 or RK3588 under cage. Raspberry Pi's officially documented kiosk path is Chromium launched from the labwc autostart file. The lowest-risk architecture is a Rust (axum) backend serving a SvelteKit static build to Chromium `--kiosk`, with Tauri kept as an option to evaluate.

### Cited Findings
- Tauri's Linux graphics page lists three env-var workarounds, to be tried in order:
  - `__NV_DISABLE_EXPLICIT_SYNC=1` often fixes the Wayland Error 71 crash with no performance cost.
  - `WEBKIT_DISABLE_DMABUF_RENDERER=1` fixes the "AcceleratedSurfaceDMABuf was unable to construct a complete framebuffer" error and Error 71, but disables the faster rendering path.
  - `WEBKIT_DISABLE_COMPOSITING_MODE=1` is a last resort that disables accelerated compositing entirely.
  — [Tauri v2: Linux Graphics Issues](https://v2.tauri.app/develop/debug/linux-graphics/)
- Tauri recommends setting these variables in `main()` with `std::env::set_var`, on Linux only, and "only ship an unconditional override like this if you have verified your app is affected." — [Tauri v2: Linux Graphics Issues](https://v2.tauri.app/develop/debug/linux-graphics/)
- The same page lists other Linux symptoms:
  - WebGL and canvas can fall onto silent slow paths, causing high input latency or low frame rates with no error shown.
  - WebKitGTK masks the WebGL renderer string, so it reports "Apple GPU" on Linux.
  - Tauri recommends a non-WebGL fallback on Linux.
  — [Tauri v2: Linux Graphics Issues](https://v2.tauri.app/develop/debug/linux-graphics/)
- Tauri attributes most of these problems to the WebKitGTK DMABUF renderer requesting buffer formats the NVIDIA driver does not provide. NVIDIA is the most common case. — [Tauri v2: Linux Graphics Issues](https://v2.tauri.app/develop/debug/linux-graphics/)
- A 2023 Debian bug report shows a fully white WebKit (MiniBrowser) window on a Raspberry Pi, with the log line `DRM_IOCTL_MODE_CREATE_DUMB failed: Permission denied`. Setting `WEBKIT_DISABLE_DMABUF_RENDERER=1` fixed it. This was not Tauri, and the report is about three years old. — [Debian bug #1052055 (pkg-webkit-maintainers)](https://lists.alioth.debian.org/pipermail/pkg-webkit-maintainers/2023-September/007034.html)
- A balena forum thread reports Wayland/Sway/WebKit2GTK apps failing on Raspberry Pi 5 under balenaOS, while the same apps run on Raspberry Pi OS. This is a community report. — [balena forum](https://forums.balena.io/t/issue-to-run-wayland-sway-webkit2gtk-applications-on-the-new-raspberry-pi-5-processor/374391)
- A wry/Tauri community discussion says WebKitGTK performance "isn't that great compared to chromium". This is opinion, not a benchmark. — [tauri-apps/wry discussion #1014](https://github-redirect.dependabot.com/tauri-apps/wry/discussions/1014)
- Tauri's wry runtime has an `x11` Cargo feature, enabled by default. Disabling it suits Wayland-only apps and reduces size. — [tauri-runtime-wry v2.7.0 release notes](https://v2.tauri.app/de/release/tauri-runtime-wry/v2.7.0/)
- Cage is a Wayland kiosk compositor that runs a single maximized app, and it exits when the last window closes. Cage 0.2 incorporates the wlroots 0.17 and 0.18 improvements. — [Phoronix: Cage 0.2](https://phoronix.com/news/Cage-0.2-Released); [Cage wiki](https://github.com/Hjdskes/cage/wiki)
- Raspberry Pi has an official kiosk tutorial for Bookworm and later. It launches the browser full-screen by editing the labwc autostart file, and requires a Pi 3 or newer with at least 1 GB of RAM. — [Raspberry Pi: How to use a Raspberry Pi in kiosk mode](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)
- labwc is the default compositor on current Raspberry Pi OS, and Wayfire is the alternative. The legacy LXDE autostart file is ignored under Wayland. — [linuxjunkies Pi kiosk guide](https://linuxjunkies.org/guides/raspberry-pi-kiosk-mode); [Industrial Monitor Direct: fixing kiosk autostart after Bookworm](https://industrialmonitordirect.com/blogs/knowledgebase/fixing-raspberry-pi-kiosk-autostart-after-bookworm-update)
- Common Chromium kiosk flags are `--kiosk --noerrdialogs --disable-infobars`, plus `--ozone-platform=wayland` for native Wayland. The binary is named `chromium` or `chromium-browser` depending on the image. — [Photobooth project: kiosk mode](https://photoboothproject.github.io/faq/kiosk-mode); [linuxjunkies guide](https://linuxjunkies.org/guides/raspberry-pi-kiosk-mode)
- `unclutter` (cursor hiding) does not work on Wayland compositors. — [linuxjunkies guide](https://linuxjunkies.org/guides/raspberry-pi-kiosk-mode)
- Touchscreen-to-output mapping under Cage was reported as hard to set up. — [awesome.ecosyste.ms: touchkio](https://awesome.ecosyste.ms/projects/github.com%2Fleukipp%2Ftouchkio) (search snippet only)

### Inferences
- **Recommended default: Chromium kiosk plus a local axum backend.**
  - This path is officially documented by Raspberry Pi.
  - Chromium has the most mature GPU path on V3D (Pi 5), Mali/Panthor (RK3588) and Intel iGPU (N100).
  - The SvelteKit app can be built with `adapter-static` and served by axum (for example `tower-http`'s `ServeDir`), with a JSON/WebSocket API.
  - The same origin then serves the phone companion PWA over the LAN, so one codebase covers both screens.
  - The Rust process runs as a separate systemd service from the compositor and browser. A browser crash does not kill sync.
- **When Tauri v2 is reasonable:** if IPC (`invoke`) and a single binary are wanted.
  - Launch it under `cage -- /usr/bin/myapp` or labwc autostart.
  - Set the window fullscreen and undecorated in `tauri.conf.json`.
  - Budget time for the WebKitGTK workarounds above, and test animations and photo crossfades on the actual board.
  - Avoid WebGL-heavy UI. Tauri itself warns of silent slow paths.
- **Autostart:** either a systemd user service with `cage`, or labwc's `~/.config/labwc/autostart` with desktop autologin. Both are common patterns. The labwc route is the Pi-documented one.
- **Touch:** both Chromium and WebKitGTK deliver Pointer Events. Disable pinch-zoom and overscroll with CSS (`touch-action`, `overscroll-behavior: none`).

### Gaps
- No measured benchmark was found of WebKitGTK (Tauri) vs Chromium frame rates on Pi 5, RK3588 or N100.
- It was not verified whether `WEBKIT_DISABLE_DMABUF_RENDERER` is still needed on current Raspberry Pi OS (Trixie-era) with the V3D driver.
- The exact autostart lines in the official Raspberry Pi tutorial were not fetched. Only the search summary was seen.
- RK3588 mainline Mesa (Panthor) behaviour with WebKitGTK was not researched.

## Q2. Calendar sync: Google, iCloud/CalDAV, Microsoft Graph, ICS. Rust crates and their status

### Takeaway
- **Google:** OAuth device flow for limited-input devices (calendar scopes are reported as allowed), then incremental sync with `syncToken`, with a full resync on HTTP 410.
- **Microsoft 365 / Outlook.com:** Graph `calendarView/delta` with deltaLinks.
- **iCloud:** CalDAV at caldav.icloud.com with an app-specific password, polled because there is no push for third parties.
- **Crates:** `libdav` (from the pimsync/vdirsyncer author) is the most serious Rust CalDAV client. `minicaldav` is self-described as immature. `rrule` handles RFC 5545 recurrence expansion. `yup-oauth2` provides a `DeviceFlowAuthenticator`.

### Cited Findings
**Google Calendar**
- Google supports OAuth 2.0 for "TVs and limited-input devices". You create a client of that type, and the user enters a code on a second device. Allowed scopes are restricted to a published list. — [Google: OAuth 2.0 for TV and Limited-Input Device Applications](https://developers.google.com/identity/protocols/oauth2/limited-input-device?authuser=6)
- A Home Assistant source comment says device auth is limited to a small set of Google APIs, that calendar is allowed, and that it is "considered less secure than Web Auth". This is third-party, not official. — [Home Assistant google config_flow.py mirror](https://git.sudo.is/home-assistant/core/src/branch/dev/homeassistant/components/google/config_flow.py)
- Google's out-of-band (OOB) OAuth flow is deprecated for all client types, so the old copy-paste code flow is not an option. — [Google: OOB flow migration guide](https://developers.google.cn/identity/protocols/oauth2/resources/oob-migration?hl=en)
- Google advises choosing the narrowest Calendar scope possible. — [Google Calendar API: auth](https://developers.google.com/calendar/api/auth)
- Incremental sync:
  - The `nextSyncToken` arrives only on the last page of results.
  - HTTP 410 Gone means the token is invalid. The client must drop its stored state and run a full sync.
  — [Google Calendar API: Synchronize resources efficiently](https://developers.google.com/workspace/calendar/api/guides/sync?hl=de); [Nylas guide on sync tokens](https://cli.nylas.com/guides/google-calendar-api-sync-tokens)
- Push notifications (`events.watch`) need a public HTTPS webhook. Third-party docs say watch and syncToken interplay works the same way. I did not verify this against Google's watch reference. — [withone.ai Google Calendar docs](https://withone.ai/knowledge/google-calendar/conn_mod_def%3A%3AGJ6Rk8slfpQ%3A%3Avz9OVDCXT4GNbC30JFh3AA)
- `yup-oauth2` implements Device, Installed, Service Account and other flows. The v12.1.1 docs export `DeviceFlowAuthenticator`. It is "mainly used by google-apis-rs". — [docs.rs yup-oauth2 12.1.1](https://docs.rs/yup-oauth2/12.1.1/src/yup_oauth2/lib.rs.html); [yup-oauth2 GitHub](https://redirect.github.com/dermesser/yup-oauth2)

**Microsoft Graph (Outlook.com / M365)**
- `GET /me/calendarView/delta?startdatetime=..&enddatetime=..` with the `Prefer: odata.maxpagesize` header.
  - The window is encoded in the tokens, so follow-up calls reuse `@odata.nextLink` / `@odata.deltaLink` verbatim.
  - `$expand`, `$filter`, `$orderby` and `$search` are not supported.
  - Personal Microsoft accounts are supported with the delegated `Calendars.Read` permission (or `ReadBasic` / `ReadWrite`).
  — [Microsoft Learn: event delta](https://learn.microsoft.com/en-us/graph/api/event-delta); [Microsoft Learn: delta query for events](https://learn.microsoft.com/graph/delta-query-events)
- Community reports describe missing events in some delta syncs. A July 2026 blog post covers undocumented pitfalls; its claims were not verified. — [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/353077/graph-api-doesnt-return-all-events); [nocal.app Graph sync guide (2026)](https://nocal.app/blog/2026/07/microsoft-graph-calendar-sync-guide)

**iCloud / CalDAV**
- Connection settings:
  - Server: `caldav.icloud.com` over HTTPS on port 443.
  - Username: the Apple Account email.
  - Password: an app-specific password generated at appleid.apple.com under Sign-In and Security > App-Specific Passwords.
  - A 401 with known-good credentials usually means the main password was used.
  — [Nylas: iCloud CalDAV settings](https://cli.nylas.com/guides/icloud-caldav-settings); [2Do: sync with iCloud CalDAV](https://www.2doapp.com/docs/macos/sync-with-icloud-caldav)
- Changing the Apple ID password revokes all app-specific passwords. One guide cites a limit of 25. These are vendor docs, not Apple's own pages. — [Hetk iCloud integration](https://hetk-landing.pages.dev/integrations/apple-icloud/)
- iCloud offers no push updates for third-party apps, so clients must poll. — [OneCal: iCloud Calendar API](https://www.onecal.io/blog/how-to-integrate-icloud-calendar-api-into-your-app)

**Rust crates**
- `libdav`:
  - CalDAV and CardDAV client library, developed as part of the vdirsyncer/pimsync projects.
  - ISC license. Latest seen is 0.10.3, with MSRV 1.86.
  - Ships a `davcli` example tool.
  — [docs.rs libdav](https://docs.rs/crate/libdav/latest); [libdav 0.10.2 Cargo.toml](https://docs.rs/crate/libdav/0.10.2/source/Cargo.toml.orig)
- `minicaldav` 0.6.0:
  - A "caldav client and basic ical parser with as little dependencies as possible".
  - Its README warns it is "neither correct nor sufficiently tested" and has been tested against one server.
  — [docs.rs minicaldav README](https://docs.rs/crate/minicaldav/0.6.0/source/README.md)
- `rrule`:
  - Pure-Rust RFC 5545 RRULE implementation.
  - `RRuleSet` combines RRULE, RDATE and EXDATE.
  - Output uses the time zone of `DTSTART`.
  - The default iteration limit is 100,000, and the docs caution about untrusted rules.
  - Versions 0.13.0 and 0.12.0 both appeared as "latest" on different docs.rs pages.
  — [docs.rs rrule](https://docs.rs/rrule); [rrule 0.13.0](https://docs.rs/crate/rrule/0.13.0)
- Pimalaya also publishes `io-webdav` 0.1.0, which is early stage. — [docs.rs io-webdav](https://docs.rs/crate/io-webdav/0.1.0)

### Inferences
- **Suggested architecture:** one `CalendarSource` trait in Rust with implementations for Google (REST plus syncToken), Graph (deltaLink), CalDAV (`libdav`, using sync-collection / ctag+etag where supported) and ICS URL (HTTP GET with ETag/If-Modified-Since).
  - Normalize everything to an internal event model in SQLite.
  - Expand recurrences locally with `rrule` + `chrono-tz` over a rolling window, for example −1 to +12 months.
- **ICS parsing** (both from my background knowledge, not checked against docs.rs this session):
  - `icalendar` crate: builder plus a parser feature.
  - `ical` crate: the ical-rs parser.
- **Generated Google SDK:** `google-calendar3` (google-apis-rs) exists, but the generated SDKs are heavy and historically tied to specific `yup-oauth2` versions. A thin hand-written `reqwest` client over the handful of endpoints used (`calendarList.list`, `events.list` with `syncToken`, `events.insert`) plus the `oauth2` crate's device-code support is often simpler.
- **Push notifications are unsuitable** for a LAN-only kiosk because `events.watch` needs a public HTTPS endpoint. Poll with syncToken every 1–5 minutes instead. Polling is cheap with incremental tokens.
- **Microsoft:** use the device code flow against the `/consumers` or `/common` authority for personal accounts.

### Gaps
- The official Google "allowed scopes for devices" list was not fetched. Whether read-write `calendar.events` is allowed via the device flow (as opposed to read-only) was not confirmed.
- Current `google-calendar3` version and its `yup-oauth2` dependency were not confirmed.
- No sources were collected this session for the current status of the `icalendar`, `ical` or `chrono-tz` crates, or for the `oauth2` crate's device flow.
- Microsoft identity docs for device code with consumer accounts were not fetched.
- Whether Google's 2025–2026 OAuth verification rules affect personal "testing"-mode apps (7-day refresh-token expiry) was not researched. This matters for a self-built kiosk and needs checking.

## Q3. Data storage, local-first sync and the phone companion

### Takeaway
SQLite in the Rust backend is the natural source of truth. The CRDT options are mature: Automerge 3.x reports a memory cut of more than 10x, and the Rust crate line is 0.10/0.11 in 2026; yrs is the Rust port of Yjs. For a single-household system with one always-on hub, though, a simple server-authoritative API is probably sufficient.

### Cited Findings
- Automerge 3.0:
  - Memory use was cut by more than 10x.
  - Same file format as 2.x, and the API is "nearly fully backwards compatible".
  - The old Text API was removed.
  — [Automerge 3.0 blog](https://automerge.org/blog/automerge-3/)
- July 2026: Automerge v3.3.0–3.3.2 shipped, plus `automerge` 0.10.0 on crates.io. August 2026: `autosurgeon` 0.13.0 (derive-based structs) and `samod` 0.13.0 (the Rust automerge-repo, wire-compatible with the JS one) track automerge 0.11.0. — [This Month in Automerge: July '26](https://automerge.org/blog/2026-july/); [August '26](https://automerge.org/blog/2026-august/)
- y-crdt (`yrs`) is the Rust port of Yjs, started by Yjs creator Kevin Jahns. One commenter claimed it is "unsound at its core", but that claim is unsubstantiated. — [LibHunt automerge vs y-crdt](https://www.libhunt.com/compare-automerge-vs-y-crdt)

### Inferences
- **Recommended data layer:**
  - `sqlx` (async, compile-time checked queries, migrations) or `rusqlite` (sync, simpler) on SQLite in WAL mode.
  - Tables: profiles, events, chores and completions, lists and items, meals, and photos metadata.
  - Push changes to the kiosk UI and phones over WebSocket (axum `ws`).
- **Phone companion:**
  - A SvelteKit PWA served by the same axum server on the LAN (or via Tailscale for remote access) is the least effort.
  - Tauri mobile (v2 supports iOS and Android) only pays off if native notifications or offline storage beyond what IndexedDB provides are needed.
- **CRDTs** (Automerge with `samod`, or yrs) earn their keep only if phones must edit offline and merge later. Shopping lists edited in a store with poor signal are the classic case. A pragmatic hybrid: keep shopping lists as Automerge documents and everything else server-authoritative.

### Gaps
- No sources were gathered this session on `sqlx` / `rusqlite` versions or on PWA install and push limits on iOS.
- No sources were gathered on Tauri mobile maturity in 2026. Not verified.

## Q4. Photo frame: Google Photos API restrictions, Picker API, Immich, local folders

### Takeaway
Since 31 March 2025, the Google Photos Library API can no longer read a user's whole library or albums. Only app-created data remains readable. The alternatives are:
- **Picker API:** the user hand-selects items through a session URL or QR code. This suits a one-off import, not a live album.
- **Ambient API:** designed for photo frames, but gated behind the Google Photos Partner Program and two reviews, so it is unrealistic for a hobby build.
- **Immich:** self-hosted, with API keys, and the most practical "live album" source.
- **Local folder:** filled by Syncthing, rclone or similar.

### Cited Findings
- On 31 March 2025, the scopes `photoslibrary.readonly`, `photoslibrary.sharing` and `photoslibrary` were removed.
  - The remaining scopes are `photoslibrary.appendonly`, `photoslibrary.readonly.appcreateddata` and `photoslibrary.edit.appcreateddata`.
  - Calls relying only on the removed scopes return 403 PERMISSION_DENIED.
  - Apps selecting content they did not upload should migrate to the Picker API.
  — [Google Developers Blog: Picker API launch and Library API updates](https://developers.googleblog.com/id/google-photos-picker-api-launch-and-library-api-updates); [Google Photos API updates](https://developers.google.com/photos/support/updates)
- After the change, rclone could only download photos it had uploaded itself. — [rclone forum](https://forum.rclone.org/t/google-photos-no-longer-allowing-rclone-access-to-all-photos-any-workarounds-why-not-add-this-feature-to-gphotosdl/54310)
- Picker API flow:
  1. Get an OAuth token.
  2. Create a session, which returns a `pickerUri`.
  3. Show the `pickerUri` as a link or QR code.
  4. The user picks items in Google Photos.
  5. Poll the session until `mediaItemsSet` is true.
  6. List the picked media items.
  7. Download each item via its `baseUrl`.
  — [Google Photos Picker API: Get started](https://developers.google.com/photos/picker/guides/get-started-picker)
- The Ambient API is for slideshows on smart TVs and photo frames. It uses OAuth for TVs and limited-input devices plus a `state` parameter, and it does not support service accounts. — [About the Google Photos Ambient API](https://developers.google.com/photos/ambient/guides/about?hl=en)
- Ambient API access requires acceptance into the Partner Program, then both an OAuth verification review and a Google Photos API integration review. — [Google Photos Partner Program](https://developers.google.com/photos/partner-program/overview?authuser=3) (search snippet)
- In March 2025, Google pointed frame makers to frame-specific APIs and a partner program. In June 2026, Google Photos support returned for Aura frames, with auto-add album sync. — [9to5Google, Mar 2025](https://9to5google.com/2025/03/05/google-photos-digital-frames/); [9to5Google, Jun 2026](https://9to5google.com/2026/06/04/google-photos-support-has-returned-for-auras-digital-photo-frames/)
- Immich:
  - Kiosk clients authenticate with an Immich URL plus an API key.
  - Third-party clients recommend key permissions `asset.read` and `asset.view` (and/or `search.read`).
  - The old `getRandom` endpoint is deprecated. Clients use `/api/search/metadata` (and random search) instead.
  - `immich-kiosk` (Go) and ImmichFrame are existing frame clients.
  — [immich-kiosk on pkg.go.dev](https://pkg.go.dev/github.com/damongolding/immich-kiosk); [Immich archived docs: getRandom](https://v1.124.2.archive.immich.app/docs/api/get-random); [espframe Immich API key doc](https://jtenniswood.github.io/espframe/api-key.html); [ImmichFrame](https://awesome.ecosyste.ms/projects/github.com%2F3rob3%2FImmichFrame)

### Inferences
- Google Photos is only practical for a hobbyist via the Picker API: a "pick photos for the frame" QR flow on the kiosk, with picked items downloaded and cached locally.
- For a live, auto-updating family album, use Immich (self-hosted, possibly on the same N100) or a Syncthing-synced folder that the Rust backend watches with the `notify` crate.
- The iCloud Shared Album public-web-link approach relies on undocumented endpoints. No reliable source was found, so treat it as fragile.

### Gaps
- How long Picker-selected items and `baseUrl`s stay accessible was not confirmed.
- Whether Ambient API partner acceptance is open to individuals was not confirmed.
- The current Immich random-asset endpoint name in the 2026 API was not confirmed.
- No reliable source was found on iCloud Shared Album scraping.

## Q5. Weather, presence-based wake, DPMS on Wayland, ambient brightness

### Takeaway
- **Weather:** Open-Meteo is free for non-commercial use, needs no API key, and is licensed CC BY 4.0. The fair-use limits are under 10,000 calls a day, 5,000 an hour and 600 a minute.
- **Screen power on wlroots compositors (labwc, cage):** `wlopm --on/--off <output>` is the common tool. MagicMirror users drive it from a PIR sensor. `wlr-randr` is the alternative.

### Cited Findings
- Open-Meteo's terms set the free tier at fewer than 10,000 API calls a day, 5,000 an hour and 600 a minute. Use must be non-commercial and is under CC BY 4.0. Commercial use or higher volume needs a subscription. Third-party sites quoting "unlimited" contradict the official terms. — [Open-Meteo Terms](https://open-meteo.com/en/terms); [Open-Meteo home](https://open-meteo.com/); contradicted by [apibouncer.com](https://apibouncer.com/guides/best-free-weather-apis)
- MagicMirror users run `wlopm --on HDMI-A-1` / `wlopm --off HDMI-A-1` from a PIR module. Others use `wlr-randr`. Some users reported issues with labwc and moved back to Wayfire. Disabling blanking through raspi-config reportedly made no difference under labwc for one user. — [MagicMirror forum](https://forum.magicmirror.builders/topic/19562/i-cannot-disable-screen-blanking-with-magicmirroros/9?page=2); [MagicMirror forum post](https://forum.magicmirror.builders/post/125314)
- `wlr-randr` can fail to connect to the display when run from outside the compositor's session or container. — [MagicMirror forum](https://forum.magicmirror.builders/post/125402)
- X11-era `xset dpms` approaches appear in older guides and do not apply under Wayland. — [Brecht-Schule touchscreen guide](https://fixes.brecht-schule.hamburg/raspberry-pi/official-touchscreen)

### Inferences
- **Presence wake:** a PIR (GPIO, for example via the `rppal` crate on a Pi) or a mmWave sensor such as LD2410 (UART) feeds the Rust backend. The backend runs `wlopm` with the compositor's `WAYLAND_DISPLAY` and `XDG_RUNTIME_DIR` set.
- **Ambient brightness:** a lux sensor (for example BH1750 or VEML7700 over I2C) can drive backlight via `/sys/class/backlight` on panels that expose it, or DDC/CI (`ddcutil`) on monitors. Many 27-inch HDMI monitors support only DDC/CI.
- Use a weather crate or plain `reqwest` + `serde` against Open-Meteo's `/v1/forecast`. Cache for about 15 minutes, which is well under the limits.

### Gaps
- `wlopm` / `wlr-randr` project pages were not fetched to confirm current versions.
- No sources were gathered on DDC/CI or backlight control on specific 27-inch panels, or on mmWave sensor integration.

## Q6. Security (token storage, LAN-only admin) and updates (Tauri updater vs image-based OTA)

### Takeaway
For the OS, A/B image updaters (RAUC, Mender, SWUpdate) all have documented Raspberry Pi 5 integrations. Pi 5 firmware now supports A/B slot switching without U-Boot (`tryboot`/`autoboot.txt`, and the 2025-03-10 eeprom `boot_partition` conditional). No sourced findings were obtained on token storage, so that guidance is inference only.

### Cited Findings
- A FOSDEM 2025 talk demonstrated Mender, RAUC and SWUpdate integrated on Raspberry Pi 5 with Yocto. — [FOSDEM 2025: Exploring Open Source Dual A/B Update Solutions](https://fosdem.org/schedule/event/fosdem-2025-6299-exploring-open-source-dual-a-b-update-solutions-for-embedded-linux)
- rpi-eeprom release 2025-03-10 added the `[boot_partition=N]` conditional, which lets RAUC avoid U-Boot on Pi 5. — [Bootlin: Safe updates using RAUC on Raspberry Pi 5](https://bootlin.com/?p=19769)
- Pi 5 firmware supports `tryboot` + `autoboot.txt` for A/B switching without U-Boot. — [Codeberg bac-software issue #83](https://codeberg.org/buildacubesat-project/bac-software/issues/83)
- Torizon's test of a one-byte change, measured by a vendor, so treat with caution:

  | Updater | Full image | Delta |
  |---|---|---|
  | Mender | 117 MB | 0.227 MB |
  | RAUC | 129 MB | 18–28 MB |
  | SWUpdate | 115 MB | 42 MB |

  — [Torizon: OTA best Linux OS image update model](https://www.torizon.io/blog/ota-best-linux-os-image-update-model)
- RidgeRun describes RAUC as highly configurable but requiring manual setup effort. — [RidgeRun OTA providers](https://developer.ridgerun.com/wiki/index.php/RidgeRun_Platform_Security_Manual/Getting_Started/Over-the-Air/Main-Providers)

### Inferences
- **Token storage:**
  - Keep OAuth refresh tokens and CalDAV app passwords only in the Rust backend, never in the WebView or the phone.
  - On a headless kiosk the Secret Service keyring (`keyring` crate) needs an unlocked session, which is awkward. A common approach is to encrypt secrets at rest in SQLite with a key in a root-only file or TPM (the N100 has fTPM, the Pi 5 has none), or to use `systemd-creds` (systemd ≥ 250) to bind the key to the machine.
- **LAN-only admin:**
  - Bind axum to the LAN interface.
  - Require a per-family PIN or passkey for admin routes.
  - Use mDNS (`mdns-sd` crate) for discovery.
  - Optionally use Tailscale for remote phone access rather than exposing ports.
- **App updates:**
  - The Tauri updater plugin covers app-level updates if Tauri is used.
  - For the Chromium + axum design, ship the Rust binary and static assets as a `.deb` or a single binary, and update via apt repo or a self-update with signature checks.
  - Reserve RAUC or Mender for when whole-OS robustness matters. For a one-off family device, plain Raspberry Pi OS with unattended-upgrades plus a read-only overlay root (raspi-config overlayfs) is a lighter middle ground.

### Gaps
- Docs for the `keyring` crate, `systemd-creds`, the Tauri updater plugin and Raspberry Pi overlayfs were not fetched.
- RK3588 and N100 OTA specifics were not researched.

## Q7. Reference projects on GitHub

### Takeaway
Several open-source Skylight alternatives exist, but none was confirmed to use exactly Tauri + Svelte + Rust. They are useful for features and UX, not as a code base.

### Cited Findings
- **FamilyHub** (joe-bor/FamilyHub): a custom touchscreen family calendar positioned as a Skylight replacement. Stack not confirmed. — [GitHub](https://github.com/joe-bor/FamilyHub)
- **kinboard** (svenger87/kinboard): a self-hosted kitchen-wall dashboard with calendar, weather, photos and shopping list. Web stack, framework not confirmed. — [GitHub](https://github.com/svenger87/kinboard)
- **Beacon** (asachs01/beacon): MIT-licensed family command center with calendar, weather, chores and a daily dashboard. Runs as a Home Assistant add-on or standalone. Its docs compare it directly to Skylight. — [GitHub](https://github.com/asachs01/beacon); [Beacon docs](https://beacon-family-docs.netlify.app/docs/welcome)
- **LX Family** and **FamQuest**: self-hosted family boards and routine displays, from Home Assistant community posts. — [LX Family](https://community.home-assistant.io/t/lx-family-a-self-hosted-family-board-with-calendars-chores-kid-profiles-and-home-assistant-widgets/1020587); [FamQuest](https://community.home-assistant.io/t/famquest-self-hosted-fridge-display-for-kids-routines-not-an-ha-integration-built-with-claude-code/1027051)
- **GitHub topic "family-calendar"**: lists open-source alternatives to Skylight, Hearth and Cozi. — [GitHub topic](https://github.com/topics/family-calendar)
- **Supporting projects:**
  - immich-kiosk: photo frame. — [pkg.go.dev](https://pkg.go.dev/github.com/damongolding/immich-kiosk)
  - touchkio: kiosk browser for touch displays. — [awesome.ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fleukipp%2Ftouchkio)
  - pimsync/vdirsyncer: the reference Rust CalDAV client behind `libdav`. — [docs.rs libdav](https://docs.rs/crate/libdav/latest)

### Inferences
- MagicMirror² and Home Assistant dashboards remain the most widely used DIY approaches. Their forum threads are the best source of real-world kiosk, PIR and blanking fixes on current Raspberry Pi OS.

### Gaps
- The stacks (package.json / Cargo.toml) of FamilyHub, kinboard and Beacon were not inspected.
- No Tauri + Svelte family calendar was found.
