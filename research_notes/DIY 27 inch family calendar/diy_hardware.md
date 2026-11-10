# DIY 27"+ Wall Touchscreen Family Calendar: Hardware Options, BOMs and Trade-offs (US, Nov 2026)

Research date: 2026-11-10. Prices are retailer snapshots and move a lot. 2026 matters here because a DRAM shortage has pushed up SBC and mini-PC prices sharply; see the compute section. Where a price is older or unverified, the note says so.

## Display options with prices (consumer touch monitors, open-frame/commercial PCAP, IR overlay frames, StandbyMe-style)

### Takeaway
A true 27" touch display costs roughly $500–$1,100 new. Commercial PCAP monitors (Planar Helium, Elo, iiyama) run about $530–$800. The ViewSonic TD3207 32" IR open-frame runs about $1,030–$1,550. An LG StanbyME runs $700–$1,000. The cheap routes are a used commercial PCAP monitor (one builder paid about $200 for a Planar PCT2785 on eBay), or a normal 27"/32" monitor plus a $135–$310 IR overlay frame. Dell's touch line tops out at 24" (P2424HT). The "P2724DE" is a non-touch conferencing monitor.

### Cited Findings
**Consumer and office touch monitors**
- **Dell P2724DE(B):** not a touch monitor. It is a 27" 2560x1440 IPS video-conferencing monitor (350 nits, USB-C). CDW lists it at $649.99 with a $506.99 advertised price, and Best Buy at $499.99. — [CDW](https://www.cdw.com/product/dell-27-video-conferencing-monitor-p2724deb-led-monitor-qhd-27/7748198); [BuildCores](https://www.buildcores.com/products/Monitor/fjmx0z90b/Dell-Pro-27-Plus-Video-Conferencing-Monitor-P2724DEB)
- **Dell P2424HT:** 23.8" 1080p touch, $519.99 MSRP and $419.99 at review. Current US listings run about $329–$378. It is too small for the 27"+ goal but is the reference "office touch monitor." — [PCWorld review](https://www.pcworld.com/article/2063582/dell-p2424ht-review.html); [Smartprix](https://us.smartprix.com/monitors/dell-pro-p2424ht-24-inch-full-hd-touch-monitor-ppd1d9nk63qn); [knowledgelib 2026 roundup](https://knowledgelib-io.pages.dev/consumer-electronics/monitors/touchscreen-monitors/2026)
- **Planar Helium PCT2785:** 27" 1080p touch, $555 MSRP, $532.66 at CDW. **Planar PCT2735Q:** 27" QHD (1440p) touch, $546.99 at CDW. — [CDWG PCT2785](https://www.cdwg.com/product/planar-helium-pct2785-27-led-monitor-black/2828936); [Gov Connection PCT2735Q](https://gov.connection.com/product/planar-27-pct2735q-qhd-led-lcd-touchscreen-monitor/998-3718-00/41931590); [CDW Planar 27](https://www.cdw.com/product/planar-27in-touch-desktop-monitor/8263898)
- **iiyama ProLite T2755MSC-B1:** 27" 1080p with optically bonded PCAP. Optical bonding is a manufacturer claim that improves touch accuracy and parallax. — [manuals.plus / listing summary via search](https://manuals.plus/m/61cc984c97ebf881b239453ac99fa0c957e7a0d3b384cdb567ebf6911378cb2c)
- **ALOGIC Clarity Pro Touch 27":** 4K, and a 5K touch variant (5120x2880, 400 nits, USB-C PD) exists. One vendor page notes multitouch gestures need vendor drivers on macOS. No Linux statement was found. — [aio.lv 4K](https://aio.lv/en/product--datalogic-27c4kpdwt--11425498.md); [aio.lv 5K](https://aio.lv/en/product--alogic-27c5kpdt--11666631.md)
- Generic 27" QHD 100Hz 10-point touch monitors (Amazon-style brands) exist, but their specs are vendor claims only. One roundup warns "Linux compatibility varies wildly — look for monitors explicitly tested with Raspberry Pi or Ubuntu." — [desertcart listing](https://www.desertcart.com.cy/products/685051344-touchscreen-monitor-27-inch-2k-100hz-gaming-monitor-qhd-2560x1440); [thewearify roundup](https://thewearify.com/best-big-touch-screen-display/)
- **Lenovo ThinkVision touch 27" and ViewSonic TD2760:** no current price or spec found in this research (gap).

**Open-frame and commercial (24/7-rated)**
- **ViewSonic TD3207:** 32" 1080p IR 10-point touch, 24/7 operation, 450 nits, HDMI/DP/RS232. MSRP $1,289. US street prices: AVI-SPL $1,029.99, Staples $1,049.99–$1,086.52, CDW $1,551.99. — [SHI](https://www.shi.com/product/41953311/TD3207-IR-TOUCH-FHD-32IN-16:91920-X-1080-247-HDMI); [AVI-SPL](https://shop.avispl.com/products/viewsonic-32-full-hd-open-frame-10-point-touch-monitor-with-24-7-operation); [Staples](https://www.staples.com/viewsonic-32-60-hz-lcd-open-frame-touch-monitor-black-td3207/product_24587952); [CDW](https://www.cdw.com/product/ViewSonic-TD3207-1080p-Touch-Screen-Monitor-with-24-7-Operation-HDMI-DisplayPort-RS232-450-cd-m178-32/7650751)
- **Mimo Monitors:** a 27" open-frame or wall-mountable multi-touch 1080p unit at $779.99, and a 32" open-frame non-touch unit at $879.99. — [Mimo (via search)](https://mimomonitors.com/collections/21-5-inch)
- **Elo:** 27" models in the line include the 2770L, 2702L, 2794L, 2799L and E510644 (all 1080p), plus a 32" 3203L interactive display. Retail listings were mostly EU, with no reliable US price found. — [Elo 3203L](https://www.elotouch.com/catalog/product/view/id/1635); [aio.lv Elo 2702L](https://aio.lv/en/product--elo-touch-solutions-e351997--10968726.md)
- Beetronics sells a dedicated wall-mount touchscreen range from 7" to 32" (no price captured). — [Beetronics](https://www.beetronics.com/c-touchscreens/wall/27-inch-touchscreens)
- **Used-market data point:** one DIY builder used a Planar PCT2785 27" FHD PCAP (VESA 100x100) bought on eBay for about $200 out the door, with a Pi 5 and Home Assistant. — [DIY family wall calendar writeup (Notion)](https://likehellabro.notion.site/diy-family-wall-calendar) (the page content would not render on fetch; details come from the search snippet)

**IR overlay frames (add touch to any monitor or TV)**
- **32" IR frames:** about $135 USD for a 20-point frame (marketplace), $199 CAD on Fruugo, $311.99 at Newegg for a Deyowo 10-point frame (no glass), and about €271 for a SpecialTouch 20-point. Many are sold without glass. — [housecleanlosangeles marketplace listing](https://www.housecleanlosangeles.com/products/32-inch-20-points-infrared-touch-frame-interactive-usb-inter/209104409/); [Fruugo CA](https://www.fruugo.ca/32-inch-infrared-touch-frame-usb-plug-and-play-interactive-touch-screen-overlay-for-kiosks/p-435867546); [Newegg](https://www.newegg.com/p/3C6-01ZY-01F53); [desertcart SpecialTouch](https://www.desertcart.nl/products/457348988-specialtouch-32-inch-infrared-ir-touch-screen-panel-usb-interface.md)
- **Linux:** listings claim "Free driver for Windows, Android and Linux" (vendor claims). CNX Software says frames already in the kernel's hid-multitouch table are plug-and-play. Others may need their VID/PID added to `drivers/hid/hid-ids.h` and a kernel rebuild (2014 article; the kernel quirk tables have grown since). — [CNX Software](https://www.cnx-software.com/2014/02/11/how-to-convert-your-hdtv-into-a-massive-touchscreen-enabled-android-tablet/?amp=1)

**Portable / StandbyMe-style**
- **LG StanbyME 27ART10AKPL:** 27" 1080p touch with battery and rolling stand. $999.99 list, $696.99 Black Friday 2025, and about $797–$800 at Amazon in mid-2025. It runs webOS, and one listing disputes the touch function. — [LG](https://www.lg.com/us/lifestyle-products/lg-27art10akpl); [Slickdeals](https://slickdeals.net/f/18590917-lg-27-inch-class-stanbyme-1080p-portable-touch-screen-monitor-27art10akpl-built-in-battery-full-swivel-rotation-60hz-refresh-rate-calming-beige-796-99); [Android Authority](https://www.androidauthority.com/lg-stanbyme-portable-monitor-3620625)
- **LG StanbyME 2 (27LX6TYGA):** 27" QHD touch, up to 4 hours of battery. $1,299.99 list, $899.99–$996.99 street. — [B&H](https://www.bhphotovideo.com/c/product/1915788-REG/lg_27lx6tyga_stanbyme_2_27_qhd.html); [dealnews](https://www.dealnews.com/products/LG/LG-Stanby-ME-2-27-QHD-Portable-Touch-Screen-TV/501229.html)

### Inferences
- For a Linux wall build, the most reliable display picks are 24/7 commercial PCAP monitors (Planar Helium, Elo, iiyama), which ship standard USB HID multitouch controllers. Buying used ones from eBay or office liquidations is the biggest single cost lever.
- The "best resolution per dollar" route is a normal 27" 1440p IPS monitor (about $250–$300 non-touch, e.g. ViewSonic VG2756A-2K at $279.99 on [Target](https://www.target.com/c/27-to-32-9/new/-/N-xisr0Z6ql00855lvm?Nao=72)) plus an IR frame. The cost is a raised bezel, an air gap (parallax), and an unpolished look unless the build is framed in wood.
- StanbyME units are TVs with webOS and a rolling stand. They are poor fits for wall mounting with a Linux SBC driving them, and they cost more than commercial PCAP monitors.
- 1080p at 27–32" (about 69–82 PPI) is acceptable at 1–2 m viewing distance for calendar text. 1440p looks noticeably crisper for dense month views.

### Gaps
- No confirmed spec sheets with brightness, power draw (W) or thickness were captured for most models. Commercial 27" LCD monitors typically draw roughly 20–35 W, but no source confirmed this (unverified).
- No US price was found for Elo 27" models, the Lenovo ThinkVision touch, or the ViewSonic TD2760.
- No independent Linux test of a specific 27" 1440p PCAP monitor was found. Linux compatibility claims are vendor or roundup assertions.
- AliExpress open-frame PCAP pricing was not captured.

## PCAP vs IR vs resistive for a family wall display

### Takeaway
PCAP is the right choice for a kitchen or hall wall display used by bare fingers. It ignores sleeves, paper and non-conductive objects, has a flat wipeable glass face with no raised bezel, and has better accuracy. IR is cheaper at large sizes and works with gloves or styluses, but it false-triggers on objects near the glass, collects dirt in its raised bezel, and can be upset by sunlight. Resistive is not suitable for multitouch at this size.

### Cited Findings
- PCAP "inherently rejects non-conductive objects, significantly reducing the risk of false touches from sleeves, paper, or plastic tools." — [Touchwo PCAP vs IR](https://touchwo.com/uk/pcap-vs-ir-touch-screen/) (vendor content)
- IR: "solid contaminants, moving liquids or obstructions may cause a false touch and may create dead zones until completely removed." — [Sharp Displays touch technologies](https://www.sharpdisplays.eu/p/se/en/launch/rp/touch-technologies.xhtml)
- IR frames "inherently contain edges, gaps, and recesses that trap dirt and liquids," and IR "fail[s] the moment debris blocks the optical beams." — [Touchwo](https://touchwo.com/uk/pcap-vs-ir-touch-screen/)
- IR is sensitive to direct sunlight and ambient IR, while PCAP ignores ambient light. IR detects any opaque object, so it works with gloves or tools. — [Touchwo](https://touchwo.com/uk/pcap-vs-ir-touch-screen/); [digitalsignage.com](https://digitalsignage.com/digital_signage/docs/kiosk/touch-screen-technologies)
- IR needs no sensors on the glass, which gives a brighter, clearer image, and it scales cost-effectively above 55". — [Touchwo](https://touchwo.com/uk/pcap-vs-ir-touch-screen/)

### Inferences
- For kids, IR's "anything near the glass counts as a touch" behavior (a child leaning on the frame, a sticky note, a magnet) is a real usability problem. PCAP's tolerance for small fingers and resistance to stray objects make it the better family choice.
- Palm rejection is mostly a software matter (Chromium/Wayland touch handling). Both PCAP and IR report multiple contacts via HID. Calendar UIs should use large targets and avoid gesture-heavy interactions.
- Resistive is effectively unavailable at 27"+ and is single-touch. It is not a contender. (General industry knowledge; no source captured.)

### Gaps
- No source directly measured palm rejection for IR vs PCAP. Sources are mostly vendor marketing.

## Compute options with prices and kiosk performance

### Takeaway
The 2026 DRAM shortage changed the math. The Raspberry Pi 5 16GB is now $385 (Nov 2, 2026). Pi 5 8GB figures conflict (about $130–$175). An Intel N150 16GB/512GB mini PC has a median of about $349. RK3588 boards rose too (Orange Pi 5 Plus 8GB is about $225–$237). A calendar kiosk needs only 4GB, so the sweet spots are a Pi 5 4GB (about $85, unverified) or a used or cheap N100/N150 mini PC. The N1x0 machines have mainline Intel graphics, which makes them the least risky for smooth Chromium at 1440p/4K.

### Cited Findings
- Pi 5 16GB price history: $120 at launch, then $145 (Dec 2025), $205 (Feb 2026), about $305 (Apr 2026), and $385 (Nov 2, 2026). CM5 rose $40 to $375–$415. Pi 500+ unchanged at $410. — [CNX Software, Nov 3 2026](https://www.cnx-software.com/2026/11/03/when-will-this-stop-the-raspberry-pi-5-16gb-sbc-now-sells-for-385/); [Phoronix](https://phoronix.com/news/Raspberry-Pi-5-16GB-385); [Tom's Hardware](https://www.tomshardware.com/raspberry-pi/raspberry-pi-5-price-increases-drastically-as-ai-shortage-bites-16gb-version-now-usd205-second-price-increase-in-three-months-over-70-percent-more-expensive-than-original-msrp)
- Raspberry Pi's official early-2026 post raised prices by +$10 (2GB), +$15 (4GB), +$30 (8GB) and +$60 (16GB). It blamed HBM demand for AI competing with LPDDR fab capacity. — [raspberrypi.com](https://raspberrypi.com/news/more-memory-driven-price-rises)
- **Pi 5 8GB current price conflicts:** BGR and TweakTown reported $175 after the April 2026 hike, while a Tom's Hardware table lists $130 (8GB) and $85 (4GB) for October 2026. — [BGR](https://bgr.com/2150106/raspberry-pi-cost-ram-crisis/); [TweakTown](https://www.tweaktown.com/news/110841/raspberry-pi-hikes-prices-by-up-to-150-tries-cushion-the-blow-with-new-3gb-4-variant/index.html); contradicted by [Tom's Hardware](https://www.tomshardware.com/raspberry-pi/component-shortages-drive-raspberry-pi-prices-up-by-up-to-23-percent-escalating-lpddr4-lpddr5-costs-trigger-the-third-price-hike-of-the-year)
- **N150 mini PCs (Nov 2026 survey of 15 listings, 16GB/512GB):** $280.79–$549.99, median $349 (Beelink Mini S13 sets the going rate). The S13 was $169 in Aug 2025. — [ComputingForGeeks mini PC prices](https://computingforgeeks.com/mini-pc-prices/)
- Jeff Geerling (Jan 5, 2026) found a GMKtec N100 16GB/512GB at $246.99 (was $159) vs a Pi 5 16GB kit with NVMe at $246.95, reaching rough parity. A Pi 5 1–2GB kit cost under $80. He expects 2026 to favor repurposed used hardware. — [Jeff Geerling](https://www.jeffgeerling.com/blog/2026/raspberry-pi-cheaper-than-mini-pc/)
- Orange Pi 5 Plus 8GB is about $225–$237 (July 2026 tracker), up from a $109 launch price. 16GB is about $390 per a late-2026 comparison. — [pricehistory.app](https://pricehistory.app/p/orange-pi-5-plus-8gb-rockchip-rk3588-He3FNOyp); [androidpimp (launch prices)](https://www.androidpimp.com/embedded/orange-pi-5-plus/); [tech-insider comparison](https://tech-insider.org/fi/raspberry-pi-5-vs-intel-n150-vs-orange-pi-5-plus-2026/)
- CNX reports Orange Pi, Radxa, Hardkernel and Banana Pi also raised prices (no figures given). — [CNX Software](https://www.cnx-software.com/2026/11/03/when-will-this-stop-the-raspberry-pi-5-16gb-sbc-now-sells-for-385/)
- Memory makers expect tight supply until 2028–2030 (per TechRadar's summary). — [TechRadar](https://www.techradar.com/pro/raspberry-pi-5-price-hike-means-the-16gb-model-now-costs-three-times-what-it-did-at-launch-and-of-course-the-global-ram-shortage-is-to-blame)
- DAKboard OS 4.01 supports the Raspberry Pi 5, and a DIY Pi 5 + 27" PCAP + Home Assistant build exists. — [DAKboard blog](https://blog.dakboard.com/category/diy/); [Notion writeup](https://likehellabro.notion.site/diy-family-wall-calendar)
- A Docker-based Xorg-modesetting + Chromium kiosk recipe exists (ZimaBoard). — [ZimaSpace blog](https://shop.zimaspace.com/en-ca/blogs/zima-campaign-hub/build-zimaboard-touchscreen-kiosk-docker)

### Inferences
- A calendar web app (DAKboard, Home Assistant dashboard, MagicMirror, or a custom SvelteKit page) needs 2–4GB of RAM. Do not pay the 2026 premium for 8–16GB.
- The Pi 5 has first-party Raspberry Pi OS with Wayland (labwc/wayfire), GPU-accelerated Chromium, an official NVMe HAT path, and the best community kiosk docs. It handles 1080p/1440p dashboards well. 4K Chromium on the VideoCore VII is workable for mostly static pages but can stutter on animation (general community knowledge; no benchmark captured).
- N100/N150 mini PCs use mainline i915/Xe graphics with VA-API, M.2 NVMe and standard UEFI and Debian/Ubuntu. That makes them the lowest-risk choice for 4K or heavy dashboards and for 24/7 updates. Idle is roughly 6–10 W vs about 3–4 W for a Pi 5 (typical published figures; not captured in this research, so verify).
- RK3588 boards (Orange Pi 5 Plus, Rock 5B) are fast, but GPU acceleration under mainline Linux (Panthor/Mesa) is still maturing, and vendor images vary. They no longer have a price advantage in 2026, so they are not recommended for a "set and forget" family appliance.
- For 24/7 reliability, boot from NVMe or an SSD, not microSD. Use a read-only root or log2ram, plus a watchdog and a nightly browser restart.

### Gaps
- No measured Chromium FPS benchmarks at 1440p/4K for Pi 5 vs N150 vs RK3588 were captured.
- No primary-source idle power numbers were captured for each platform.
- The current official Pi 5 4GB/8GB prices conflict across sources (see above).

## Display power management (DPMS/CEC, presence sensors, dimming, scheduling)

### Takeaway
On Raspberry Pi OS (Wayland), `wlr-randr --output HDMI-A-1 --off/--on` is the standard way to blank the screen. MagicMirror users pair it with PIR modules. A presence sensor (PIR or LD2410 mmWave) plus a hold timer gives "wake on approach," but some monitors drop the HDMI link when turned off and fail to wake, so test the specific monitor.

### Cited Findings
- On Raspberry Pi OS Bookworm/Trixie under Wayland, use `wlr-randr --output <name> --off` / `--on`. HDMI usually appears as HDMI-A-1, and running `wlr-randr` alone lists the outputs. — [Waveshare docs](https://docs.waveshare.com/4-DSI-TOUCH-A/FAQ)
- A MagicMirror user ran MMM-Universal-Pir with wlr-randr. It worked by day, but overnight the screen stayed off and the PIR could not wake it, which the thread attributed to the monitor dropping its link. Another user used `gpiomon` on a GPIO edge. — [MagicMirror forum](https://forum.magicmirror.builders/post/125186); [MagicMirror screen on/off tips thread](https://forum.magicmirror.builders/topic/19116/having-trouble-with-screen-on-and-off-here-are-some-tips-that-could-help/13)
- UbiHome publishes a screen on/off example for presence-driven display control. — [UbiHome example](https://ubihome.github.io/examples/screen_on_off/index.html)

### Inferences
- **LD2410 mmWave sensors** detect stationary people (someone reading the calendar), which PIR cannot. They expose a digital OUT pin (usable with gpiomon) and a UART. Many builders run them through an ESP32 with ESPHome into Home Assistant, which then calls the kiosk to blank or wake. This is general community practice; no primary source was captured.
- **Alternatives to full DPMS off:** dim the backlight via DDC/CI (`ddcutil setvcp 10 <brightness>`) on monitors that support it, or show a black or clock screen. This avoids monitors that go into deep sleep and drop the HDMI link. CEC only applies to TVs, not most monitors.
- **Ambient-light dimming:** an I2C lux sensor (e.g. BH1750/VEML7700) driving DDC/CI brightness, plus a time-based schedule (cron/systemd timers) for nighttime off.
- **Wake-on-touch:** PCAP/IR touch controllers stay powered over USB while the panel is off, so a touch event can trigger `--on` (implementation detail inferred; verify per monitor).

### Gaps
- No primary-source LD2410 + Pi kiosk tutorial or LD2410 price was captured. LD2410 modules are commonly a few dollars, but this was not verified here.
- No data on which monitors support DDC/CI brightness control under Linux.

## Mounting, framing, cable concealment, weight and heat

### Takeaway
Use the monitor's VESA 100x100 with a low-profile fixed or tilt wall mount. Hide power with a UL-listed in-wall power kit (about $35–$70), not an extension cord in the wall. The compute board can hang off the VESA bracket. A wood shadow-box frame can be built around it, but leave ventilation.

### Cited Findings
- Legrand In-Wall Power & Cable Management TV Connection Kit: $34.99 (blank) and $44.99 (with outlet). Other Legrand kit pages list $46.34–$48.20. The CPT306W had a $69.99 MSRP and Best Buy lists $69.99. — [Legrand HT2102BK](https://www.legrand.us/audio-visual/home-theater-connections-and-cable-management/cable-access-wall-plates/in-wall-tv-connection-kit-black/p/oq-ht2102bkv1); [Best Buy Legrand kit](https://www.bestbuy.com/product/legrand-in-wall-flat-screen-power-and-cable-concealment-kit-white/J38KFP43R7)
- Creative Audio PowerBridge kits are certified to UL 498 & 514C and meet NEC 400.7(A)(11). They plug into an existing outlet rather than being hardwired. Running a plain extension or power cord inside the wall is what these kits exist to avoid. — [PowerBridge TWO-CK (Firefold)](https://www.firefold.com/products/powerbridge-two-ck-in-wall-dual-power-and-cable-management-kit); [creativeaudio.net](https://creativeaudio.net/pow-two-ck)
- One DIY build mounted a 27" monitor on a VESA TV bracket and hung a 3D-printed Pi case from the bracket. — [taint.org build](https://taint.org/2020/12/20/235801a.html)
- The Planar PCT2785 uses VESA 100x100. — [Notion writeup](https://likehellabro.notion.site/diy-family-wall-calendar)
- Commercial "smart calendar" frames made from 27" touch monitors are sold by woodworkers (e.g. about $810 on a marketplace), which shows the shadow-box approach. — [Yaeger Woodworks listing](https://reach.dog/shop/yaegerwoodworks/products/24in-touchscreen-smart-calendar-62818)
- Skylight sells Calendar Max in "Classic" and "Shadow Box" frame variants. — [Skylight AU shadow box](https://au.manage.myskylight.com/products/skylight-calendar-max-shadow-box-natural-aluminum)

### Inferences
- An in-wall recessed box (e.g. an On-Q/Legrand recessed media box) between studs can hold an NVMe Pi or a thin mini PC and the power brick, allowing a near-flush mount. Check heat and fire-rated wall rules with the local AHJ.
- Commercial 27" touch monitors usually weigh 6–9 kg with heavy glass, so mount into studs or use rated anchors. (Typical figure; not sourced.)
- A wood frame should leave rear and top vent gaps. LCD backlights and SBCs generate continuous heat in 24/7 use. Keep the frame lip clear of the active touch area. IR frames need line of sight across the glass, so the frame must not protrude past the IR bezel.

### Gaps
- No specific low-profile VESA mount prices or thicknesses were captured.
- No sourced weight or thickness for specific touch monitors.

## Example BOMs (budget / mid / premium) vs Skylight Calendar Max

### Takeaway
Skylight Calendar Max is about $570–$600 plus a subscription that rose to $79/yr. DIY reaches parity around $400–$500 with a used commercial PCAP monitor. New-parts builds land around $650–$900 (mid) and $1,200–$1,600 (premium, 32" or 4K plus an N150).

### Cited Findings (comparison anchors)
- Skylight Calendar Max 27": $569.99 direct (with 1 free month of Plus), Best Buy $579.99–$599.99 (aluminum $599.99), Costco black bundle $599.99. — [Skylight](https://myskylight.com/products/skylight-calendar-max-classic-white-with-plus-plan); [Best Buy](https://www.bestbuy.com/site/6588516.p)
- The Skylight Plus subscription doubled to $79/yr for new users. — [Verge review mirror](https://thevergenews.pages.dev/reviews/615523/skylight-calendar-max-sidekick-ai-assistant-review)

### BOMs (built from cited component prices; totals are arithmetic estimates)
**Budget (~$400–$500): used commercial 27" PCAP plus a Pi 5**
- Used Planar PCT2785 27" 1080p PCAP (eBay): about $200 ([Notion writeup](https://likehellabro.notion.site/diy-family-wall-calendar))
- Raspberry Pi 5 4GB: about $85 (Tom's Hardware Oct 2026 figure; conflicting sources), plus an official 27W PSU, case or cooler, and a 128–256GB NVMe or SSD: about $60–$90 (not sourced)
- Legrand in-wall power kit $35–$45 ([Legrand](https://www.legrand.us/audio-visual/home-theater-connections-and-cable-management/cable-access-wall-plates/in-wall-tv-connection-kit-black/p/oq-ht2102bkv1)), plus a VESA wall mount (about $20–$40, not sourced), plus a micro-HDMI cable
- Estimated total about $420–$480. An alternative is a new 27" 1440p non-touch monitor ($279.99) plus a 27" IR frame (about $135+), for about $550 total, with IR caveats.

**Mid (~$700–$900): new 27" commercial PCAP plus an N150 mini PC**
- Planar PCT2735Q 27" QHD touch $546.99 or PCT2785 $532.66 ([CDW](https://www.cdw.com/product/planar-27in-touch-desktop-monitor/8263898))
- N150 16GB/512GB mini PC: low end about $281, median $349 ([ComputingForGeeks](https://computingforgeeks.com/mini-pc-prices/)). Or a Pi 5 4–8GB kit for about $150–$250.
- Plus about $80 for the in-wall kit and mount. Estimated total about $850–$980 with an N150, or about $780 with a Pi.

**Premium (~$1,200–$1,700): 32" 24/7 display or 4K, framed**
- ViewSonic TD3207 32" IR 24/7 at $1,029.99–$1,086 ([AVI-SPL](https://shop.avispl.com/products/viewsonic-32-full-hd-open-frame-10-point-touch-monitor-with-24-7-operation)). Alternatively a 27" 4K or 5K PCAP (ALOGIC, price not captured), or the LG StanbyME 2 QHD at about $900–$1,000.
- N150 mini PC at about $349, plus a custom hardwood shadow box (about $100–$250, not sourced), plus an in-wall kit and an LD2410/ESP32 presence sensor.
- Estimated total about $1,500–$1,700.

### Inferences
- The DIY advantages are no subscription (vs $79/yr), a 32" option, 1440p/4K options, a fully open stack (Home Assistant, MagicMirror, DAKboard OS or a custom app), and repairability. The disadvantage is the time spent on integration, screen sleep, and kiosk hardening.
- With 2026 RAM pricing, the compute share of the BOM roughly doubled vs 2025. The display remains the dominant cost.

### Gaps
- Mount, cable, case, NVMe and frame-lumber prices were not individually sourced.

## Commercial alternatives (Android signage panels, Hearth, Mango, DAKboard)

### Takeaway
Off-the-shelf 27" family hubs cost $570–$800 and are subscription-gated (Skylight $79/yr, Hearth about $6–$9/mo). DAKboard Touch 27 ($799.95) is the most open, since it is DAKboard OS-based and DAKboard also supports DIY Pi. Generic 32" Android PCAP wall panels cost about $760–$1,900 and run arbitrary Android apps or kiosk browsers but are not Linux.

### Cited Findings
- **Hearth Display 27":** $699 list, sometimes $599, open-box $200 off. The Family Membership is about $9/mo, or $155.52 for 2 years and $207.36 for 3 years. Basic calendar works without the membership. — [Hearth product page](https://www.hearthdisplay.com/products/hearth-display); [Hearth membership](https://hearthdisplay.com/products/family-membership); [Mango Display comparison](https://mangodisplay.com/mango-display-vs-hearth-display/)
- **DAKboard Wall Display Touch 27:** $799.95, launched Apr 3, 2026. Touch 22 is $599.95. The non-touch Wall Display 27 ($549.95) is discontinued. — [DAKboard shop](https://shop.dakboard.com/collections/all-products); [DAKboard blog](https://blog.dakboard.com/go-big-with-the-new-dakboard-wall-display-touch-27/)
- **Mango Display:** a competitor publishing "Hearth alternatives" content. No 27"/32" Mango price was found. — [Mango Display alternatives](https://mangodisplay.com/best-hearth-display-alternatives/)
- **32" Android PCAP wall panels:** Geniatech TPC3200 (Android 11, 10-point capacitive) at $759. Allsee AO32H at £653 ex-VAT and £912 at Scan. Clear Digital 32" 1000-nit Android 13 at $1,934. Walmart 32" Android kiosk panels at about $1,299–$1,599. — [Geniatech](https://shop.geniatech.com/?p=5335); [Scan UK Allsee](https://www.scan.co.uk/products/32-allsee-android-pcap-touch-screen-display-ips-1920x1080-50001-450cd-m2); [Avendor Clear Digital](https://www.avendor.com/products/clear-digital-32-inch-pcap-touch-screen-with-ip54-1000-nits-brightness-anti-gl); [Walmart](https://www.walmart.com/c/kp/32-inch-touch-screen)
- Other 27" interactive signage exists (LG 27TNF3K, ViewSonic IFP2710, AG Neovo TM-27, Clear Touch Muv 27). Prices were not captured. — [touchboards ViewSonic IFP2710](https://touchboards.com/ViewSonic-IFP2710); [B&H AG Neovo TM-27](https://www.bhphotovideo.com/c/product/1087339-REG/ag_neovo_tm_27_27_10_point_touch.html)
- Budget Android "calendar" panels exist (e.g. Adrinfly 21.5" at Home Depot). — [Home Depot](https://www.homedepot.com/p/Adrinfly-21-5-in-Touchscreen-Electronic-Calendar-Display-Spruce-Gray-Family-Planner-with-Widgets-and-Apps-Wall-Mount-27HSA05167/335572908)

### Inferences
- An Android signage panel such as the Geniatech TPC3200 at $759 is a credible "semi-DIY" option. It is an all-in-one PCAP panel with a wall mount and runs Fully Kiosk Browser pointed at a self-hosted calendar. The cost is a vendor Android build with uncertain update support.
- Skylight and Hearth are closed ecosystems tied to subscriptions. DAKboard is the most DIY-friendly commercial vendor.

### Gaps
- Mango Display hardware pricing and openness were not found.
- No Amazon pricing for generic 27"–32" Android wall panels was captured.
