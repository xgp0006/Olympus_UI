# Build your own Skylight, skip the subscription

Don't buy a Skylight Calendar Max to repurpose it. It costs about **$570–$600**, it is cloud-bound and almost certainly locked down, and nobody has published what is inside the 27" model. The only hardware evidence anyone has found is for its 15" sibling. That model is a Skyworth-built Rockchip RK3566/RK3562 Android 12 board, and newer units enforce secure boot. For a Rust/Svelte/TypeScript developer, the better route is a **27" commercial PCAP touch monitor** (about $200 used or $530–$550 new) driven by an **Intel N150 mini PC** (about $281–$349 at 2026 RAM-inflated prices) or a Raspberry Pi 5. On top of that you run Chromium in kiosk mode against a local **axum + SvelteKit** app that syncs Google, Microsoft and iCloud calendars into SQLite. That build costs about **$420–$480 (budget) or $850–$980 (new parts)** and has no $79/yr Plus fee. It also gives you 1440p, repairability and features you control. If you want a working wall in a weekend before writing code, the Home Assistant "Skylight clone" dashboards are mature and actively maintained (commits in October–November 2026), and they make a good prototype and fallback. Two things remain unknown: the Max's actual SoC, RAM and touch technology, and whether Google's device-flow OAuth allows read-write calendar scopes for a personal unverified app without frequent re-authentication. That second question is the one to answer before you commit to a fully custom sync layer.

## The Calendar Max is a locked Android appliance, not a hackable panel

Skylight publishes surprisingly little about the Max. The official specs list a **27" IPS 2560×1440** panel, an ambient light sensor, dual 4 W speakers, no camera or microphone, and a **12 V / 3 A** adapter. They describe the USB port as "for manufacturing only," and the storage figure is stated as 32 GB ([Skylight support](https://skylight.zendesk.com/hc/en-us/articles/37153807094683-Technical-Specifications-for-27-Calendar-Max)), while the US product page says 16 GB. The product page also says the Max is "built for wall mounting only" on a proprietary bracket, that "WiFi [is] required at all times," and that it carries a 3-year warranty ([Skylight](https://www.myskylight.com/products/skylight-calendar-max)). A 36 W adapter fits a 27" LCD plus an ARM board, not a PC-class machine. Brightness, touch technology (PCAP vs IR), VESA pattern, RAM and SoC are all undocumented. **No FCC filing for the Max or the Calendar 2 was found.**

The 15" model has been examined in detail, and the evidence points the same way for the whole product line. It is FCC ID **2AABK-150**, filed by Shenzhen Chuangwei (Skyworth), which has built Skylight frames since 2018 ([fccid.io](https://fccid.io/2AABK-150)). Community analysis of boot device trees and driver logs identifies a **Rockchip RK3566** board with an AMPAK AP6256 (Broadcom BCM4345) Wi-Fi module ([wesbos/photo-frame-dashboard](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/hardware-research.md)). A unit opened in October 2026 instead reported an **RK3562** build with about 15 GB eMMC, so board revisions vary within one SKU ([issue #222](https://github.com/wesbos/photo-frame-dashboard/issues/222)). The OS is Android 12 ("skylightOS"). The Skylight app runs as a privileged system app with a vendor watchdog updater. Wi-Fi networks set up during onboarding belong to that app, so disabling it knocks the device offline ([skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)).

The hackability record is mixed and getting worse. One early unit shipped a **userdebug** build with root ADB, an unlocked bootloader flag and permissive SELinux ([skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)). On the newer RK3562 unit, ADB was refused, unsigned loaders were rejected and **secure boot was enforced**, and no workaround was found ([issue #222](https://github.com/wesbos/photo-frame-dashboard/issues/222)). A hidden manufacturer menu can enable ADB, but its code is unpublished, and re-signing the privileged app requires Skyworth's keys ([app-analysis.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/app-analysis.md)). Skylight offers no developer mode or sideloading ([Skylight support](https://skylight.zendesk.com/hc/en-us/articles/45664471763995-Settings)).

The likely outcome is that a 2026 Max is a newer, more locked Rockchip Android board from the same ODM. Even in the best case, where you get ADB, you would be running a kiosk browser on Android 12 with an unknown SoC and an always-on vendor updater. That is a worse foundation than a $200 used monitor plus any Linux box. If the household already owns a Skylight, the non-invasive bridge is the unofficial **pyskylight** client for Skylight's cloud API, which lets a custom display read Skylight data without touching the device ([pyskylight](https://awesome.ecosyste.ms/projects/github.com%2Fjoshuaswarren%2Fpyskylight)).

## A used commercial PCAP panel beats the Max on price and quality

### Touch technology decides the look and the kid-proofing

For a kitchen or hallway wall, **projected-capacitive (PCAP)** is the right choice. It ignores sleeves, paper and plastic, has a flat wipeable glass face, and is unaffected by sunlight ([Touchwo, vendor](https://touchwo.com/uk/pcap-vs-ir-touch-screen/)). IR overlay frames are cheaper at large sizes and work with gloves. However, "solid contaminants, moving liquids or obstructions may cause a false touch and may create dead zones" ([Sharp Displays](https://www.sharpdisplays.eu/p/se/en/launch/rp/touch-technologies.xhtml)). Their raised bezels also trap dirt, and they register anything near the glass. A child leaning on the frame or a magnet stuck to the bezel becomes a touch. Choose IR only if you want 32"+ cheaply and accept a framed, slightly parallaxed look.

### Display options and prices (US, November 2026)

| Display | Size / res / touch | Price | Verdict |
|---|---|---|---|
| Planar Helium PCT2785 (used, eBay) | 27" 1080p PCAP, VESA 100 | ~$200 ([build writeup](https://likehellabro.notion.site/diy-family-wall-calendar)) | Best value; proven with Pi 5 + HA |
| Planar Helium PCT2785 (new) | 27" 1080p PCAP | $532.66 ([CDWG](https://www.cdwg.com/product/planar-helium-pct2785-27-led-monitor-black/2828936)) | Reliable new option |
| Planar PCT2735Q (new) | 27" **1440p** PCAP | $546.99 ([Gov Connection](https://gov.connection.com/product/planar-27-pct2735q-qhd-led-lcd-touchscreen-monitor/998-3718-00/41931590)) | **Recommended new**: matches Max resolution |
| iiyama ProLite T2755MSC-B1 | 27" 1080p, optically bonded PCAP | price not captured ([listing](https://manuals.plus/m/61cc984c97ebf881b239453ac99fa0c957e7a0d3b384cdb567ebf6911378cb2c)) | Less parallax; check availability |
| Mimo 27" open-frame/wall | 27" 1080p multitouch | $779.99 ([Mimo](https://mimomonitors.com/collections/21-5-inch)) | Pricier |
| ViewSonic TD3207 | 32" 1080p IR, 24/7 rated | $1,029.99–$1,551.99 ([AVI-SPL](https://shop.avispl.com/products/viewsonic-32-full-hd-open-frame-10-point-touch-monitor-with-24-7-operation)) | Premium 32"; IR caveats |
| 27" 1440p monitor + 32" IR frame | e.g. ViewSonic VG2756A-2K + IR overlay | $279.99 ([Target](https://www.target.com/c/27-to-32-9/new/-/N-xisr0Z6ql00855lvm?Nao=72)) + $135–$312 ([Newegg](https://www.newegg.com/p/3C6-01ZY-01F53)) | Cheapest 1440p; bezel, dirt, false touches |
| LG StanbyME / StanbyME 2 | 27" 1080p / 1440p touch, webOS | $697–$1,000 / $900–$997 ([B&H](https://www.bhphotovideo.com/c/product/1915788-REG/lg_27lx6tyga_stanbyme_2_27_qhd.html)) | A rolling TV; wrong tool for a wall |

Two traps are worth knowing. The **Dell P2724DE is not a touch monitor**. It is a conferencing display, and Dell's touch line stops at the 23.8" P2424HT ([CDW](https://www.cdw.com/product/dell-27-video-conferencing-monitor-p2724deb-led-monitor-qhd-27/7748198); [PCWorld](https://www.pcworld.com/article/2063582/dell-p2424ht-review.html)). Generic Amazon 27" touch monitors make unverified claims, and "Linux compatibility varies wildly" ([thewearify](https://thewearify.com/best-big-touch-screen-display/)). Commercial Planar, Elo and iiyama units use standard USB HID multitouch, which is why they are the safe Linux choice. IR frames that are already in the kernel's hid-multitouch table are plug-and-play. Others need a quirk entry ([CNX Software](https://www.cnx-software.com/2014/02/11/how-to-convert-your-hdtv-into-a-massive-touchscreen-enabled-android-tablet/?amp=1)). At 1–2 m, 1080p on 27" is legible. 1440p is visibly crisper in a dense month view.

### Compute: the 2026 RAM shortage flipped the Pi-vs-x86 math

Memory prices driven by AI demand have made the SBC "cheap Linux box" much more expensive. The **Pi 5 16GB hit $385 on November 2, 2026**, up from $120 at launch ([CNX Software](https://www.cnx-software.com/2026/11/03/when-will-this-stop-the-raspberry-pi-5-16gb-sbc-now-sells-for-385/)). Raspberry Pi has blamed HBM competition for LPDDR capacity across successive price rises ([raspberrypi.com](https://raspberrypi.com/news/more-memory-driven-price-rises)). Sources disagree on current Pi 5 prices. Tom's Hardware lists **$85 for 4GB and $130 for 8GB** ([Tom's Hardware](https://www.tomshardware.com/raspberry-pi/component-shortages-drive-raspberry-pi-prices-up-by-up-to-23-percent-escalating-lpddr4-lpddr5-costs-trigger-the-third-price-hike-of-the-year)), while others report $175 for 8GB ([BGR](https://bgr.com/2150106/raspberry-pi-cost-ram-crisis/)). A survey of 15 Intel **N150 16GB/512GB** mini PC listings found **$281–$550, with a median of $349**. The Beelink S13 sold for $169 in August 2025 ([ComputingForGeeks](https://computingforgeeks.com/mini-pc-prices/)). Jeff Geerling found an N100 box and a Pi 5 16GB NVMe kit at near price parity in January ([Jeff Geerling](https://www.jeffgeerling.com/blog/2026/raspberry-pi-cheaper-than-mini-pc/)). The RK3588 boards have lost their price advantage: the Orange Pi 5 Plus 8GB is now about $225–$237 ([pricehistory.app](https://pricehistory.app/p/orange-pi-5-plus-8gb-rockchip-rk3588-He3FNOyp)).

A calendar web app needs 2–4 GB of RAM, so don't pay for 16 GB on a Pi. The N150 is still the lower-risk choice for a 1440p appliance. It has mainline Intel graphics, standard UEFI Debian, NVMe and an fTPM for sealing secrets, and Chromium's GPU path on it is the most mature. The Pi 5 4GB wins on idle power and has the best documented kiosk path. No source benchmarked Chromium frame rates at 1440p on either platform, so test photo crossfades before you finalize. Whichever you choose, boot from NVMe or SSD rather than microSD.

### Mounting, power and screen wake

Hang the monitor on its VESA 100×100 holes with a low-profile wall mount, and strap the compute box to the bracket, as earlier DIY builds have done ([taint.org](https://taint.org/2020/12/20/235801a.html)). Hide the power with a UL-listed in-wall kit such as Legrand's at **$34.99–$44.99** ([Legrand](https://www.legrand.us/audio-visual/home-theater-connections-and-cable-management/cable-access-wall-plates/in-wall-tv-connection-kit-black/p/oq-ht2102bkv1)). Kits like PowerBridge are certified to UL 498/514C and NEC 400.7(A)(11), precisely because running an extension cord inside a wall is not code-compliant ([Firefold](https://www.firefold.com/products/powerbridge-two-ck-in-wall-dual-power-and-cable-management-kit)). A hardwood shadow box makes it look like the Max's "Shadow Box" variant ([Skylight AU](https://au.manage.myskylight.com/products/skylight-calendar-max-shadow-box-natural-aluminum)). Leave top and rear vent gaps, and keep the frame lip off the active touch area.

For screen wake on Wayland, use `wlopm --on/--off HDMI-A-1` or `wlr-randr --output HDMI-A-1 --off`. Both run from the compositor's session ([Waveshare](https://docs.waveshare.com/4-DSI-TOUCH-A/FAQ); [MagicMirror forum](https://forum.magicmirror.builders/topic/19562/i-cannot-disable-screen-blanking-with-magicmirroros/9?page=2)). The known failure mode: some monitors drop the HDMI link when turned off overnight and never wake ([MagicMirror forum](https://forum.magicmirror.builders/post/125186)). Two mitigations are untested by any source in this research. One is to dim to black via DDC/CI (`ddcutil setvcp 10`) instead of a full power-off. The other is to wake on a touch event, since the USB touch controller stays powered. A PIR sensor misses someone standing still and reading. An LD2410 mmWave sensor detects stationary presence, which is why builders prefer it, though that is community practice rather than a sourced benchmark.

## Home Assistant clones deliver a Skylight in a weekend; MagicMirror does not

Before writing code, know what you are replacing. Skylight's free tier covers calendar views, color-coded profiles, chores, lists, touch event entry and weather. **Plus ($79/yr, annual only)** gates **Sleep Mode, photo display, meal planning, rewards, Magic Import and the Sidekick AI** ([Skylight support](https://skylight.zendesk.com/hc/en-us/articles/48778850390171-Calendar-Features); [Sense, competitor](https://getsense.ai/blog/posts/skylight-calendar-hidden-costs-paywall)). Sync covers Google, iCloud, Outlook, Cozi, Yahoo, TeamSnap and ICS URLs ([Skylight support](https://skylight.zendesk.com/hc/en-us/articles/35986090425627)). Five of the six paywalled features are easy to self-host. The sixth, Sidekick's "photo of a flyer becomes an event" ([Skylight](https://skylight.zendesk.com/hc/en-us/articles/47278643288091)), is a vision-LLM API call away.

**Home Assistant is the strongest off-the-shelf route.** Several Skylight clones have commits in October–November 2026:

- The **randrcomputers/my-skylight-calendar** wizard auto-builds a Skylight-styled dashboard from your people, calendars and weather. It does not include chore checkboxes ([GitHub](https://github.com/randrcomputers/my-skylight-calendar)).
- **gclenaghan/family-calendar-card** adds swipe, a month view and full event create/edit/delete with recurrence ([GitHub](https://github.com/gclenaghan/family-calendar-card)).
- **superdingo101/skylight-calendar-card** is a standalone Lovelace card ([GitHub](https://github.com/superdingo101/skylight-calendar-card)).

The original community thread runs to 21+ pages. Its pain points are useful design input: there is no hourly week view, per-person filters are regex helpers that lag, and setup is hard for non-technical users ([HA Community](https://community.home-assistant.io/t/diy-family-calendar-skylight/844830)). Browser Mod handles kiosk control and screensavers ([GitHub](https://github.com/thomasloven/hass-browser_mod)). Grocy covers chores and shopping ([GitHub](https://github.com/grocy/grocy)), Mealie covers recipes and meal plans ([GitHub](https://github.com/mealie-recipes/mealie)), and Immich provides the photo library ([GitHub](https://github.com/immich-app/immich)). All three are very active. Grocy has chores but no native points-and-rewards economy, and single-maintainer clone projects carry bus-factor risk.

**MagicMirror² is the wrong base for an interactive wall.** Its own forum states that "MM doesn't provide any native touch support, as it's designed as output info display panel." CalendarExt3 popovers don't open on touch, and builders have to bolt on MMM-Touch, MMM-pages and custom Google-write modules ([MagicMirror forum](https://forum.magicmirror.builders/topic/18011/touchscreen-family-dashboard/17)). Use it only for a read-only glance display.

Other open-source family boards (Beacon, kinboard, FamilyHub, LX Family, FamQuest) are worth mining for UX ideas. None uses a Rust/Svelte stack ([Beacon](https://github.com/asachs01/beacon); [kinboard](https://github.com/svenger87/kinboard); [GitHub topic](https://github.com/topics/family-calendar)).

The commercial alternatives cluster at **$570–$800 plus a subscription**:

| Product | Hardware price | Recurring | Openness |
|---|---|---|---|
| Skylight Calendar Max 27" | $569.99–$599.99 ([Best Buy](https://www.bestbuy.com/site/6588516.p)) | Plus $79/yr | Locked Android |
| Hearth Display 27" | $699 (sometimes $599) ([Hearth](https://www.hearthdisplay.com/products/hearth-display)) | ~$9/mo ([Hearth](https://hearthdisplay.com/products/family-membership)) | Closed |
| DAKboard Wall Display Touch 27 | $799.95 ([DAKboard](https://shop.dakboard.com/collections/all-products)) | ~$5–10/mo tiers | Most DIY-friendly; also supports your own Pi |
| Geniatech TPC3200 32" Android PCAP | $759 ([Geniatech](https://shop.geniatech.com/?p=5335)) | none | Generic Android; run a kiosk browser |
| Mango Display (software only) | your screen | $5.99/mo or $59.99/yr ([Mango, vendor](https://mangodisplay.com/mango-display-for-echo-show/)) | Software on any screen |

A Geniatech-style Android panel pointed at a self-hosted app is a credible "semi-DIY" shortcut. The trade-off is a vendor Android build with uncertain update support.

## Chromium kiosk plus a Rust daemon beats Tauri on the wall

### Kiosk runtime: keep the browser dumb and the backend in Rust

This repo already uses Tauri, so Tauri v2 is the obvious temptation. On Linux, though, Tauri renders through **WebKitGTK**. Tauri's own docs list a ladder of environment-variable workarounds for white windows and Wayland "Error 71" crashes, and each step trades away acceleration: `WEBKIT_DISABLE_DMABUF_RENDERER=1`, then `WEBKIT_DISABLE_COMPOSITING_MODE=1`. The docs also warn that WebGL and canvas can fall onto "silent slow paths" ([Tauri v2](https://v2.tauri.app/develop/debug/linux-graphics/)). The same white-window DMABUF failure has been seen on a Raspberry Pi ([Debian bug](https://lists.alioth.debian.org/pipermail/pkg-webkit-maintainers/2023-September/007034.html)). By contrast, Raspberry Pi officially documents a Chromium kiosk launched from labwc's autostart ([Raspberry Pi](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)).

The production design follows from that:

- An **axum** service runs as its own systemd unit and serves the SvelteKit app, built with `adapter-static`, together with a JSON + WebSocket API.
- **Chromium** runs with `--kiosk --noerrdialogs --no-first-run --ozone-platform=wayland` under **cage** on the N150, or labwc on Pi OS. cage and labwc both had commits in November 2026 ([cage](https://github.com/cage-kiosk/cage); [labwc](https://github.com/labwc/labwc)).
- A browser crash never stops sync.
- The same origin serves the **phone companion PWA** on the LAN, so one Svelte codebase covers wall and phone.

Disable pinch-zoom and overscroll with `touch-action` and `overscroll-behavior: none`. Use in-page input controls rather than relying on the OS keyboard. Squeekboard and wvkbd reportedly fail to appear over Chromium in `--kiosk` mode ([Raspberry Pi forum](https://forums.raspberrypi.com/viewtopic.php?t=358147&start=25)). `unclutter` does not work on Wayland ([linuxjunkies](https://linuxjunkies.org/guides/raspberry-pi-kiosk-mode)). Keep Tauri as an option to evaluate only if you want a single binary, and test it on the real board first.

### Calendar sync: one trait, four providers, SQLite as truth

Define a `CalendarSource` trait and normalize every provider into SQLite. Expand recurrences locally with the **`rrule`** crate, whose `RRuleSet` handles RRULE, RDATE and EXDATE. Bound the expansion: the crate's default limit is 100,000 iterations, and it warns about untrusted rules ([docs.rs](https://docs.rs/rrule)).

**Google:** use the OAuth flow for **TVs and limited-input devices**, because out-of-band copy-paste is deprecated ([Google](https://developers.google.com/identity/protocols/oauth2/limited-input-device?authuser=6); [Google OOB](https://developers.google.cn/identity/protocols/oauth2/resources/oob-migration?hl=en)). Then use incremental `syncToken` polling. The token arrives only on the last page, and **HTTP 410 means wipe and resync** ([Google](https://developers.google.com/workspace/calendar/api/guides/sync?hl=de)). Push via `events.watch` needs a public HTTPS webhook, so polling every 1–5 minutes is right for a LAN device. `yup-oauth2` ships a `DeviceFlowAuthenticator` ([docs.rs](https://docs.rs/yup-oauth2/12.1.1/src/yup_oauth2/lib.rs.html)). Home Assistant's source states that calendar is on the device-flow allow-list ([HA mirror](https://git.sudo.is/home-assistant/core/src/branch/dev/homeassistant/components/google/config_flow.py)).

There are two open risks. It is unconfirmed whether read-write `calendar.events` is allowed through device flow. It is also unresearched whether an unverified "testing"-mode app hits a 7-day refresh-token expiry. Prototype this first. If write-back fails, a fallback is to authorize with a web flow from your phone against the kiosk's LAN URL.

**Microsoft:** use Graph `calendarView/delta` and replay the `deltaLink` verbatim. Personal accounts work with delegated `Calendars.Read` or `Calendars.ReadWrite` ([Microsoft Learn](https://learn.microsoft.com/en-us/graph/api/event-delta)). Watch for community reports of missed events ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/353077/graph-api-doesnt-return-all-events)).

**iCloud:** use CalDAV at `caldav.icloud.com` with an **app-specific password**, and poll, because there is no third-party push ([Nylas](https://cli.nylas.com/guides/icloud-caldav-settings); [OneCal](https://www.onecal.io/blog/how-to-integrate-icloud-calendar-api-into-your-app)). Use **`libdav`** from the pimsync/vdirsyncer author, not `minicaldav`, which calls itself "neither correct nor sufficiently tested" ([libdav](https://docs.rs/crate/libdav/latest); [minicaldav](https://docs.rs/crate/minicaldav/0.6.0/source/README.md)).

**ICS URLs** (Cozi, TeamSnap, school feeds) are plain conditional GETs.

### Data, photos, weather and secrets

Use **SQLite in WAL mode** through `sqlx`, with tables for profiles, events, chores and completions, lists, meals and photo metadata. Push changes over axum WebSockets. CRDTs are mature, but they only earn their place for offline phone edits. Automerge 3 cut memory by more than 10×, and the Rust `samod` repo is wire-compatible with JS ([Automerge](https://automerge.org/blog/automerge-3/); [Aug '26](https://automerge.org/blog/2026-august/)). The pragmatic hybrid is to keep the shopping list as an Automerge document and make everything else server-authoritative.

**Photos are where Google bites.** Since March 31, 2025, the Library API can read only app-created media. Full-library scopes return 403 ([Google](https://developers.google.com/photos/support/updates)). That leaves you with:

- the **Picker API**, a QR "choose photos for the frame" session that you download and cache ([Google](https://developers.google.com/photos/picker/guides/get-started-picker));
- the **Ambient API**, which is built for frames but gated behind a partner program and two reviews ([Google](https://developers.google.com/photos/partner-program/overview?authuser=3));
- **Immich**, which gives a live album via an API key with `asset.read`/`asset.view` ([immich-kiosk](https://pkg.go.dev/github.com/damongolding/immich-kiosk); [espframe](https://jtenniswood.github.io/espframe/api-key.html)).

Use Immich, possibly on the same N150, and add the Picker flow for relatives who live in Google Photos.

**Weather** comes from Open-Meteo: no key, CC BY 4.0, under 10,000 calls a day for non-commercial use ([Open-Meteo](https://open-meteo.com/en/terms)). Cache it for 15 minutes.

Keep OAuth refresh tokens and app passwords **only in the Rust process**, encrypted at rest. The key can be sealed with `systemd-creds` or the N150's fTPM. This is reasoned design, not sourced practice. Bind the admin API to the LAN, gate settings behind a family PIN, and use Tailscale rather than port-forwarding for remote phone access.

### Updates: ship a signed .deb, reserve A/B images for later

For one family device, ship the axum binary and static assets as a signed `.deb` from your own apt repo or a self-updater, and run unattended-upgrades on an overlay-root OS. If you later want brick-proof whole-OS updates, **RAUC, Mender and SWUpdate** all have documented Pi 5 integrations ([FOSDEM 2025](https://fosdem.org/schedule/event/fosdem-2025-6299-exploring-open-source-dual-a-b-update-solutions-for-embedded-linux)). Pi 5 firmware now supports A/B boot without U-Boot ([Bootlin](https://bootlin.com/?p=19769)). In a vendor test of a one-byte change, Mender's delta was **0.227 MB versus 18–28 MB for RAUC** ([Torizon, vendor](https://www.torizon.io/blog/ota-best-linux-os-image-update-model)).

## The recommended build costs about $950 and takes six phases

The recommended configuration matches the Max's 1440p panel, adds headroom for local photo hosting, and leaves you nothing to fight on the graphics stack:

| Component | Choice | Price |
|---|---|---|
| Display | Planar PCT2735Q 27" QHD PCAP | $546.99 ([Gov Connection](https://gov.connection.com/product/planar-27-pct2735q-qhd-led-lcd-touchscreen-monitor/998-3718-00/41931590)) |
| Compute | Intel N150 16GB/512GB mini PC (Beelink S13 class), Debian | $281–$349 ([ComputingForGeeks](https://computingforgeeks.com/mini-pc-prices/)) |
| Power | Legrand in-wall power kit | $34.99–$44.99 ([Legrand](https://www.legrand.us/audio-visual/home-theater-connections-and-cable-management/cable-access-wall-plates/in-wall-tv-connection-kit-black/p/oq-ht2102bkv1)) |
| Mount, cables, LD2410 + ESP32/USB presence sensor, optional wood frame | low-profile VESA 100 mount | ~$50–$300 (unsourced estimate) |
| **Total** | | **≈ $910–$1,240**; no subscription |

The **budget variant** swaps in a used Planar PCT2785 at about $200 and a Pi 5 4GB at about $85 plus NVMe and PSU, for roughly **$420–$480**. That is under the price of the Max before you count its $79/yr. In 2025 the Pi would have been the default. In 2026, a used N100/N150 office mini PC is often the better buy if you can find one.

| Phase | Goal | Concrete steps | Exit criterion |
|---|---|---|---|
| 1. Hardware bring-up (1 weekend) | Proven panel + box | Bench-test the touch monitor on Debian/Pi OS. Confirm HID multitouch in `libinput list-devices`. Test `wlopm`/`wlr-randr` off/on overnight, plus DDC/CI dimming with `ddcutil`. | Touch maps correctly and the screen reliably wakes after 8 hours off |
| 2. Prototype on HA (1 weekend) | Validate family UX before coding | Install Home Assistant + HACS and the randrcomputers wizard or family-calendar-card. Point Chromium kiosk at it. Live with it for two weeks and note which views the family actually uses. | Family uses it daily; feature list is ranked |
| 3. Sync spike (1–2 weeks) | Retire the riskiest unknown | In Rust, implement Google device flow + syncToken with **write-back**, Graph delta, iCloud via `libdav`, ICS. Normalize to SQLite and expand with `rrule`. Check refresh-token lifetime over 10+ days. | All family calendars round-trip; tokens survive two weeks |
| 4. App build (3–6 weeks) | Replace HA dashboard | axum + WebSocket API. SvelteKit `adapter-static` for wall + phone PWA: day/week/month views, per-person colors, chores/rewards, lists (Automerge for groceries), meals (own tables or Mealie), Immich screensaver, Open-Meteo weather, a PIN-gated settings page. Large touch targets and in-page inputs. | Feature parity with Skylight free tier + Plus features you care about |
| 5. Appliance hardening (1 week) | Set-and-forget | systemd units for axum and `cage -- chromium --kiosk`. Watchdog + nightly browser restart. Overlay/read-only root, NVMe boot. Secrets sealed with systemd-creds/TPM. LD2410 presence → backend → `wlopm`. Schedule for night sleep. | 30 days unattended with no intervention |
| 6. Install and update path (1 weekend) | On the wall, maintainable | Install the in-wall power kit and studs-mounted VESA bracket, plus a shadow box with vents. Signed `.deb` + apt repo, Tailscale for remote admin. Optionally add a vision-LLM "magic import" endpoint. | Updates ship from your laptop without touching the wall |

## Conclusion

The idea of "hacking the Skylight" turns out to have the wrong target. The valuable part of a Skylight is its sync layer and the family UX, not the hardware. A 27" commercial PCAP panel is a commodity, and you can buy one used for a third of a Max. The engineering effort belongs in the Rust sync daemon, and a Rust/Svelte developer is unusually well placed to build that. Phase 2's Home Assistant prototype is the cheapest way to learn which features your family actually uses before you write any Rust.

Two forces in 2026 shape the decision. First, the RAM shortage has made the compute box the volatile line in the BOM, which favors used x86 hardware over new SBCs. Second, both Google APIs that matter now resist small developers: the Photos library is closed, and device-flow scopes are restricted. The real risk to a fully custom build is therefore Google OAuth policy, not hardware or UI. Settle that in the first two weeks of the sync spike. Design `CalendarSource` so a CalDAV hub (or Home Assistant's own Google integration) can stand in if Google's rules get tighter. Treat Immich, not Google Photos, as the long-term home for family pictures.
