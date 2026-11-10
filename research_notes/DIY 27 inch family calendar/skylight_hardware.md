# Skylight Calendar Max (27") and Skylight 15" / Calendar 2: Hardware Internals and Hackability

Research date: 2026-11-10. Scope note: almost all hardware/firmware evidence found is for the **15" Skylight Calendar (150-CAL, internal codename "D156")**. Nothing equivalent was found for the 27" Calendar Max. Max-specific claims are limited to the official specs and reviews below. Any extrapolation to the Max is flagged as an inference.

## FCC IDs and what the filings reveal (SoC, RAM, eMMC, Wi-Fi, power)

### Takeaway
The 15" calendar is FCC ID **2AABK-150**, filed by Skyworth's Shenzhen Chuangwei. Its internal photos and community firmware analysis point to a Rockchip RK3566 board (newer units RK3562) with an AMPAK AP6256 Wi-Fi/BT module. **No FCC ID for the 27" Calendar Max or Calendar 2 was found**, so the Max's SoC is unknown.

### Cited Findings
- Grantee code 2AABK = Shenzhen Chuangwei Electronic Appliance Tech Co., Ltd. (Skyworth). It has filed Skylight frames since 2018 (2AABK-SKYLIGHT, -SKYLIGHT03, -SKYV3, -SKY002) and **2AABK-150**, a "15.6" WiFi Digital Photo Frame ... with calendar function" (application 2022-08-23, Class II permissive change 2024-05-13) — [fccid.io grantee 2AABK](https://fccid.io/2AABK); [fccid.io 2AABK-150](https://fccid.io/2AABK-150)
- 2AABK-150 radio: 2.4 GHz (2412–2462 MHz) plus 5 GHz UNII bands. Long-term confidentiality applies, so the schematics, block diagram and operational description are not public. Internal photos, test reports and the user manual ("User Manual CAL") are public — [fccid.io 2AABK-150](https://fccid.io/2AABK-150)
- A community analysis of the 2022 internal photos reads mainboard silkscreen `D156-MB-D6-V02`, an **AMPAK AP6256** Wi-Fi module, three volume/power keys, and three exposed gold pads (function unverified). It also notes a 2024 "Glimpse" filing **2BF8S-150** that is a change-of-ID of the same device, plus a separate 2BF8S-150-1 family — [wesbos/photo-frame-dashboard hardware-research.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/hardware-research.md)
- SoC on 15" units: Android boot device trees identify "Rockchip RK3566 g10 Board". Live driver logs show a Broadcom BCM4345 rev 9 (bcmdhd driver, AP6256 firmware/NVRAM), even though the DTB string says `ssv6x5x` — [hardware-research.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/hardware-research.md)
- A second 15" unit (opened Oct 2026) reports firmware `skylightOS-rk3562_15_inch-user-release-keys-...20241123`, i.e. a **Rockchip RK3562**, with **~14.9 GB eMMC** (14912 MB). This means board revisions differ within the same "150-CAL" product — [GitHub issue #222](https://github.com/wesbos/photo-frame-dashboard/issues/222)
- A D156 unit reported a 1920×1080 display at 240 dpi, Android System WebView 95, and a light sensor — [skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)
- XDA thread "Trying to hack a 2025 Skylight Calendar 15"" reports the SoC as Rockchip RK356x/RK3566 via USB enumeration (search snippet only; page returned 403) — [XDA forums](https://xdaforums.com/t/trying-to-hack-a-2025-skylight-calendar-15.4766127/)
- Skylight's 2026 press material says the next-gen (Calendar 2) hardware has "3x faster processing" but names no chip (search summary) — [Skylight price/hardware post](https://myskylight.com/why-some-skylight-calendar-product-prices-are-going-up-and-what-were-doing-about-it/)
- Calendar Max official specs: 27" IPS, 2560×1440, 32 GB storage, dual 4 W speakers, ambient light sensor, **no camera or microphone**, 100–240 V adapter supplying **12 V / 3 A**, 7 ft cable. The USB port is "for manufacturing only" — [Skylight support: Technical Specifications 27" Calendar Max](https://skylight.zendesk.com/hc/en-us/articles/37153807094683-Technical-Specifications-for-27-Calendar-Max)

### Inferences
- Skylight hardware has been Skyworth-built Rockchip Android boards since at least 2022. The Max is plausibly from the same ODM and platform family (RK356x-class), but this is **unverified**. Treat the Max SoC, RAM and Wi-Fi module as unknown.
- 12 V / 3 A = 36 W max adapter rating. This is consistent with a 27" IPS panel plus an ARM board, not a PC-class board.
- RAM was not found in any source for any model.

### Gaps
- No FCC ID found for the Calendar Max or Calendar 2. These may be under the Skyworth 2AABK grantee with a new suffix, or under 2BF8S. A direct FCC EAS search for grantees 2AABK and 2BF8S filed in 2024–2026 is recommended.
- The internal-photo PDFs were not inspected directly (fcc.report returned 403), so the AP6256 identification relies on one community analysis.
- Panel interface (eDP/LVDS/MIPI), touch controller IC and RAM size are unknown for all models.

## Operating system, lockdown, ADB/developer access, and OTA

### Takeaway
The 15" runs Android 12 ("skylightOS") with the Skylight app as a privileged system app and launcher. Most retail units ship a locked `user` build with no ADB and secure boot enforced. Openness depends heavily on the firmware revision. Nothing has been reported for the Max.

### Cited Findings
- An Android Central forum user calls the Skylight "basically a glorified tablet running Android 12." They had developer mode and ADB, and tried Nova and Action Launcher, but could not get a usable home button or gesture. No root was mentioned — [Android Central forum](https://forums.androidcentral.com/threads/help-with-skylight-calendar.1073370/)
- Firmware varies by unit. One unit on firmware `D156.V0.10` was a **userdebug** build (`rockchip/D156/D156:12/...:userdebug`). It had USB ADB on, root available to the ADB shell, an unlocked bootloader flag (verified boot "orange") and SELinux permissive. This is reported as one unit and is not typical — [skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)
- Other units run a locked `user` build. On the RK3562 unit, ADB over USB and network was refused, unsigned loaders were rejected, and the author concluded **secure boot is enforced**. No workaround succeeded — [GitHub issue #222](https://github.com/wesbos/photo-frame-dashboard/issues/222)
- The Skylight app contains a hidden manufacturer menu that can enable ADB. Its access code is deliberately not published. The project calls the app a privileged system app (`/system_ext/priv-app`, shared system UID). Re-signing a modified copy of the same package is ruled out unless you have the manufacturer's signing keys — [app-analysis.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/app-analysis.md); [project README](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/README.md)
- Vendor packages on the D156 unit were `com.skylight` (app), `skylight.watchdog` (installs app updates) and `skylight.keyboard` (default IME). Wi-Fi networks set up during Skylight onboarding are owned by the app, so the device drops off Wi-Fi if that app is disabled — [skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)
- The project lists Skylight 15" as a "working frame" for running a custom kiosk/dashboard, with outcomes that vary by firmware — [project README](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/README.md); [devices.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/devices.md)
- Skylight's help center documents only in-app settings. There is no official developer mode, sideloading or third-party app support — [Skylight support: Settings](https://skylight.zendesk.com/hc/en-us/articles/45664471763995-Settings)
- An unofficial Python client/CLI for the Skylight cloud API (pyskylight) exists. It allows data access without modifying the device — [awesome.ecosyste.ms pyskylight](https://awesome.ecosyste.ms/projects/github.com%2Fjoshuaswarren%2Fpyskylight)

### Inferences
- OTA: app updates arrive through the vendor watchdog/updater. No source documents full system OTAs re-locking devices. Any future firmware could close the userdebug or manufacturer-menu routes, though, and newer units already appear more locked (signed RK3562 build).
- For the Max, assume a locked Android-based kiosk by default. The officially "manufacturing only" USB port suggests no supported user data path.

### Gaps
- No Calendar Max or Calendar 2 firmware strings, Android version or build type were found.
- r/skylight and r/homeassistant threads specific to sideloading were not surfaced by search.
- No iFixit or YouTube teardown of any Skylight calendar was found.

## Panel and physical specs, price and subscription (Calendar Max, as of late 2026)

### Takeaway
The Max is a 27" 2560×1440 IPS touchscreen, about 25 lb, wall-mount only on a proprietary bracket, 12 V powered, about $600 USD plus $79/yr Plus for new buyers. The touch technology is not documented.

### Cited Findings
- 27" IPS, 2560×1440. 26⅛ × 16 × 1½ in, 25 lb (11.34 kg). 12 V / 3 A adapter — [Skylight support specs](https://skylight.zendesk.com/hc/en-us/articles/37153807094683-Technical-Specifications-for-27-Calendar-Max)
- Storage conflict: the support page says 32 GB, while the US product page says 16 GB — [support specs](https://skylight.zendesk.com/hc/en-us/articles/37153807094683-Technical-Specifications-for-27-Calendar-Max); [product page](https://www.myskylight.com/products/skylight-calendar-max)
- "Built for wall mounting only". A stand is not supported. It includes a bracket, hardware and a bubble level, and mounts in landscape or portrait. "WiFi required at all times". 3-year limited warranty. $599.99 with 1 free month of Plus, then Plus is $79/yr — [Skylight product page](https://www.myskylight.com/products/skylight-calendar-max)
- Other price reports: $569.99 and $629.99, with Plus at $39 (legacy/grandfathered) to $79/yr for new users — [search summary of reviews incl. Greenlight](https://greenlight.com/learning-center/reviews/skylight-calendar-review); [ShopSavvy Max TLDR](https://shopsavvy.com/reviews-tldr/skylight-calendar-max)
- Australia: AUD $1,199 RRP, Calendar Plus AUD $49/yr, 66.3 × 40.6 × 3.8 cm, 11.34 kg. Processor, RAM, OS and brightness are not stated — [GadgetGuy review](https://www.gadgetguy.com.au/skylight-calendar-max-review)
- Calendar 2 (15"): $299.99 (Aug–Sep 2026), Plus $79/yr. Plus adds photo screensaver, Magic Import, meal planning, rewards and the Sidekick AI. The core calendar, chores and lists work without Plus — [itechguides](https://www.itechguides.com/?p=598693); [Nori comparison](https://heynori.com/article/comparisons/skylight-vs-nori)

### Inferences
- No VESA pattern is documented. The proprietary bracket suggests a VESA adapter would be a DIY job.
- 25 lb for 27" is heavy compared with a bare 27" monitor panel. This may reflect a metal or glass enclosure, but that is unverified.

### Gaps
- Touch type (PCAP vs IR), brightness (nits), and panel or touch-controller part numbers were not found for the Max.
- No VESA information was found.

## Risks: warranty, re-locking, account requirements

### Takeaway
The device is cloud- and account-bound ("WiFi required at all times", activation through the Skylight app). Modifying it is unsupported and likely voids the 3-year warranty. Firmware differences mean there is no guaranteed open path, and later units appear more locked.

### Cited Findings
- Wi-Fi is always required, and the device is activated and managed through the Skylight mobile app/account — [product page](https://www.myskylight.com/products/skylight-calendar-max); [Skylight support: resetting/removing calendar](https://skylight.zendesk.com/hc/en-us/articles/37835680255131-Removing-and-Resetting-a-Calendar-from-the-Linked-Devices-List)
- 3-year limited warranty — [product page](https://www.myskylight.com/products/skylight-calendar-max)
- Community notes warn that disabling the vendor app drops the Wi-Fi it configured, and that re-enabling it requires re-activation — [skylight-d156.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/skylight-d156.md)
- Newer RK3562 15" firmware enforces signed boot loaders, and no route was found — [issue #222](https://github.com/wesbos/photo-frame-dashboard/issues/222)
- The same project's security page flags vendor updaters on Android frames as a privileged update path to account for — [security.md](https://github.com/wesbos/photo-frame-dashboard/blob/HEAD/docs/security.md)

### Inferences
- For a DIY 27" family calendar, buying a Max with the aim of repurposing it is high-risk: the SoC is unknown, the firmware is likely locked, it costs about $600, and it is account-bound. A generic 27" touchscreen plus a small PC/SBC, or an open Android 27" panel, is the lower-risk route.
- The Skylight cloud API (pyskylight) offers a non-invasive way to integrate Skylight data into a custom display.

### Gaps
- No Skylight warranty text addresses rooting or modification specifically.
- No reports were found of OTAs re-locking devices that had already been opened.
