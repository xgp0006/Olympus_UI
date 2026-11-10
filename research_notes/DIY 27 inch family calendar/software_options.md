# Software Options for a DIY 27" Family Wall Calendar (Skylight Cal Max clone) — research notes, Nov 10 2026

Method note: Web search/fetch plus shallow `git clone` of each GitHub repo to read the date of the latest commit on the default branch (checked 2026-11-10). The GitHub REST API was not reachable from this session, so star counts and open-issue counts were NOT collected. Many "comparison" pages are vendor-authored (Mango Display, Sense, DinkyDash, Hearth-sponsored), so they are flagged where used.

## 1. What Skylight Calendar / Cal Max does (feature list to replicate) and which features need Plus

### Takeaway
The Skylight Cal Max is a 27" touchscreen ($599.99 Shadow Box, $569.99 Classic) that shows a color-coded family calendar synced from Google, iCloud, Outlook, Cozi, Yahoo, TeamSnap and ICS URLs. It also has chores, lists, weather and a mobile app. A $79/yr Plus plan, billed annually only, gates meal planning, the photo screensaver, rewards, Sleep Mode, Magic Import and the Sidekick AI. A DIY build needs to replicate the free tier plus meal planning, photos, rewards and screen sleep. The AI import is the hardest piece to copy.

### Cited Findings
**Hardware and price**
- Calendar Max 27" costs $599.99 in the Shadow Box frame with one free month of Plus, and $569.99 in the Classic frame. An older review cites $629.99. The first year costs about $679, and about $837 over three years. — [Luana](https://myluanahome.com/skylight-calendar-cost); [Skylight product page](https://myskylight.com/products/skylight-calendar-max-shadow-box-natural-aluminum-with-plus-plan/)
- Calendar 2 (15") costs $299.99 and the Max (27") costs $599.99. Plus is $79/year, billed annually with no monthly option, and one plan covers every Skylight in the home. Regional prices are CA$109.99, £60 and A$124.99. Frame Plus ($39/yr) is a different product for photo frames. — [Sense blog, updated Oct 12 2026 (competitor marketing)](https://getsense.ai/blog/posts/skylight-calendar-hidden-costs-paywall)
- Plus was reportedly raised from $39 to $79/yr. — [Skylight subscription coverage](https://dinkydash.co/skylight-calendar-subscription/); The Verge review mirror cites the $79 annual sub ([mirror](https://thevergenews.pages.dev/reviews/615523/skylight-calendar-max-sidekick-ai-assistant-review))

**Calendar sync sources**
- Skylight's official support article lists Google Calendar, Apple iCloud, Microsoft Outlook, Cozi, Yahoo and TeamSnap, plus calendar subscriptions by URL. — [Skylight support: What does Skylight Calendar sync with?](https://skylight.zendesk.com/hc/en-us/articles/35986090425627)
- Two-way vs one-way sync is unclear. The page as fetched lists Google and iCloud under "two-way" but also lists them under "one-way". Separate search snippets of the article say "with one-way sync, changes made on the Skylight Calendar cannot be synced back." This is most likely a choice made per calendar when you connect it, but that is unconfirmed. — [same article](https://skylight.zendesk.com/hc/en-us/articles/35986090425627)
- Yahoo is added by toggling "Get shareable link" in Yahoo, copying the ICS URL, and choosing Sync new calendar → Calendar URL. — [Skylight: How to sync a Yahoo Calendar](https://skylight.zendesk.com/hc/en-us/articles/360034578432)
- Cozi is added by pasting a public Cozi calendar URL. Skylight warns "Do not sync calendar of all events." — [Skylight support search snippet](https://skylight.zendesk.com/hc/en-us/articles/360034578432)
- A third-party vendor claims Cozi and Yahoo feeds only update at intervals and can lag. — [CalendarBridge (vendor)](https://calendarbridge.com/blog/how-to-fix-sync-issues-on-the-most-popular-digital-family-calendars/)

**Core features (official "Calendar Features" article)**
- The core features are:
  - shared calendar with day, week and month views
  - color-coded profiles for each family member
  - chore charts and task assignment
  - to-do and custom lists (grocery, errands)
  - meal planning
  - touchscreen event entry
  - mobile app
  - real-time sync
  - multi-user access, including co-parents
  - parental controls to lock settings
  - device linking across rooms or households
  - weather display
- The same article marks these as Plus-only:
  - Sleep Mode (screen off on a schedule)
  - Sidekick AI
  - Magic Import
  - Rewards and advanced chore tools
  - Photo display

  — [Skylight support: Calendar Features](https://skylight.zendesk.com/hc/en-us/articles/48778850390171-Calendar-Features)
- Free without Plus: calendar display, Google/Apple/Outlook sync, color-coded members, manual events, lists and chore assignment. Plus-only: Magic Import, Sidekick, meal planning, chore rewards and points, photo screensaver and custom backgrounds. — [Sense blog (competitor)](https://getsense.ai/blog/posts/skylight-calendar-hidden-costs-paywall)
- Plus also unlocks "Disney Mode" (themed content). — [Luana](https://myluanahome.com/skylight-calendar-cost)

**Sidekick AI (Plus only)**
- Sidekick turns photos, emails, flyers and PDFs into events, tasks or recipes. It can also create events from speech. — [Skylight support: Email Events, Recipes, Menus, and Photos With Sidekick](https://skylight.zendesk.com/hc/en-us/articles/47278643288091); [Skylight Sidekick landing page](https://myskylight.com/lp/sidekick/)
- Sidekick generates recipes, shopping lists and full meal plans from family size, budget and dietary restrictions. It launched as a beta. — [Digital Trends](https://digitaltrends.com/home/skylight-ai-assistant-sidekick-meal-prep); [T3](https://t3.com/home-living/smart-home/skylight-adds-an-ai-sidekick-to-its-smart-calendars-and-it-can-plan-your-weekly-meals)
- A newer Sidekick feature finds local events and family activities ("Plan an Activity"). — [Skylight support feature article](https://skylight.zendesk.com/hc/en-us/articles/49068482238747--Feature-Ask-Sidekick-to-Help-Find-Local-Events-and-Family-Activities); [Plan an Activity](https://skylight.zendesk.com/hc/en-us/articles/49069661502747)
- Skylight also runs a separate "Skylight Assistant" web property. — [assistant.myskylight.com](https://assistant.myskylight.com/lp)

**Routines / UX**
- Reviewers describe Skylight as parent-oriented and focused on visibility: it "informed the kids but didn't motivate them." Hearth is more kid-routine-oriented. — [The Quality Edit (sponsored by Hearth)](https://www.thequalityedit.com/articles/hearth-vs-skylight-review)
- One reviewer says Skylight is the "hero" of their kids' nighttime routine (routine/checklist use). — [Cubby](https://www.cubbyathome.com/skylight-calendar-review-80042154)

### Inferences
- A complete DIY clone needs these features:
  - (a) multi-source calendar aggregation (CalDAV, Google API, ICS)
  - (b) per-person color profiles and filtering
  - (c) touch event creation that writes back to at least Google
  - (d) chores with points and rewards
  - (e) routines (checklists by time of day)
  - (f) lists (grocery, to-do)
  - (g) meal plan and recipes
  - (h) a photo slideshow screensaver
  - (i) scheduled screen sleep
  - (j) weather
  - (k) phone access
  - (l) optionally, an LLM "magic import" (email/photo → event). This could be built with a vision LLM API.
- Five of Skylight's paid features (photos, sleep mode, meal plan, rewards, AI import) can be self-hosted, which removes the $79/yr.

### Gaps
- I could not find an authoritative statement on Skylight's sync refresh interval, or a clear list of which sources are two-way.
- I could not confirm whether "Routines" is a named, separate feature in Skylight as of Nov 2026 or part of chores.
- I could not confirm the full Sidekick feature list or its non-beta status from a primary source fetched in full.

## 2. Competitors: Hearth, Mango, Cozyla, Amazon Echo Hub/Show, DAKboard, Nextcloud-based

### Takeaway
- **Hearth** is the premium kid-routine device: 27", about $699, plus $9/mo.
- **Cozyla** is the device least dependent on a subscription; an optional plan is $79.99/yr.
- **DAKboard and Mango** are software for a screen you already own, about $5–6/mo. They are the closest commercial analogues to a DIY build.
- **Amazon Echo Show 15/21** are Alexa displays whose family organizer widgets tie into the Alexa ecosystem.

Most pricing comes from vendor-authored pages and should be re-verified.

### Cited Findings
- **Hearth Display:** a 27" touchscreen at $699 plus a $9/mo Family Membership ($108/yr) that unlocks most features. A membership is reportedly required to finish setup, and the calendar still works after cancelling. — [Mango Display vs Hearth (vendor)](https://mangodisplay.com/mango-display-vs-hearth-display/); [Notebookcheck](https://www.notebookcheck.net/Hearth-Display-is-a-27-in-touchscreen-to-replace-your-family-bulletin-board.634526.0.html)
- Hearth's features are icon-based routines that kids complete on their own, a points and reward system, emoji emotional check-ins, and Google and iCloud sync. The reviewer did not mention meal planning. — [The Quality Edit (Hearth-sponsored)](https://www.thequalityedit.com/articles/hearth-vs-skylight-review)
- **Cozyla:** prices are reported as $169.99–$349.99 depending on model and source (Calendar Neo 15.6" at $349.99). The core calendar, chores and routines need no subscription. An optional Calendar Essential plan costs $79.99/yr, covers meal planning and custom screensavers, and comes as a 30-day trial that auto-renews. Cozyla runs Android, so it is flexible. — [usecalendara price guide](https://www.usecalendara.com/blog/family-calendar-app-pricing-2026); [cast-hub comparison](https://cast-hub.com/family-calendar-display/); [Cozyla vs Skylight (reseller)](https://smartnmagic.com/blogs/solutions/cozyla-vs-skylight-calendar-in-2026)
- **Mango Display:** software for existing screens (TVs, tablets, Echo Show 15/21). It has a free tier and a Pro tier at $5.99/mo or $59.99/yr. Sources conflict on whether calendar sync needs Pro: one third-party site says it does, while Mango's FAQ says the free plan includes sync. — [Mango for Echo Show (vendor)](https://mangodisplay.com/mango-display-for-echo-show/); [Mango alternatives roundup (vendor)](https://mangodisplay.com/best-skylight-calendar-alternatives/)
- **DAKboard:** has a free option. The Essential plan is reportedly $5/mo for 2 screens, and paid tiers run about $5–10/mo. It offers time-of-day screens, weather and news. It is "more setup," and paid plans now include a chore chart with points and rewards. I could not reach dakboard.com/pricing. — [usecalendara](https://www.usecalendara.com/blog/family-calendar-app-pricing-2026); [Productive Anna](https://mccagues.com/skylight-calendar-alternatives)
- **Amazon Echo Show 21:** a 21" 1080p smart display with Fire TV and Alexa, listed at $399. It has persistent "widgets" for household info, including a calendar. Alexa+ requires Prime or an Alexa+ subscription. — [Amazon announcement](https://aboutamazon.com/news/devices/echo-show-21-amazon-smart-tv); [Mango (vendor) price table](https://mangodisplay.com/mango-display-for-echo-show/)

### Inferences
- DAKboard and Mango validate the "software on any screen" model. A DIY 27" monitor with a Pi or mini-PC and a self-hosted dashboard competes with them directly and avoids the recurring fee.

### Gaps
- **Echo Hub:** I found no reliable 2026 feature or price data. The Echo Hub is a smart-home control panel and is not marketed as a family calendar.
- **Nextcloud-based family calendar products:** I found no packaged product. Nextcloud is relevant only as a CalDAV backend (Nextcloud Calendar/Tasks), and I did not research it in depth.
- **FamilyWall:** I did not research FamilyWall's 2026 pricing or features.
- **Wirecutter and The Verge:** I did not fetch their full reviews. The Verge's Cal Max review was seen only via a mirror.

## 3. Open-source building blocks: maturity, touch-friendliness, activity

### Takeaway
Home Assistant (HA) plus HACS cards is the most active and touch-capable route. Several ready-made Skylight clones exist, all with commits in Oct–Nov 2026, and HA brings Google/CalDAV write-back, to-do lists, Grocy chores, Mealie meal plans and Immich photos. MagicMirror² is actively maintained but is output-first, and its touch support is patchy. Mealie, Tandoor, Grocy and Immich are all very active.

### Cited Findings: activity (latest commit on default branch, checked 2026-11-10 via shallow clone)

| Project | Role | Last commit | Source |
|---|---|---|---|
| randrcomputers/my-skylight-calendar | HA integration + setup wizard that builds a Skylight-look dashboard (fork of mohesles) | 2026-10-16 | [GitHub](https://github.com/randrcomputers/my-skylight-calendar) |
| mohesles/my-skylight-calendar | Original HA "DIY Family Calendar (Skylight)" package | 2026-02-10 | [GitHub](https://github.com/mohesles/my-skylight-calendar) |
| superdingo101/skylight-calendar-card | Standalone Lovelace card (`custom:skylight-calendar-card`, default_view, rolling_days) | 2026-11-05 | [GitHub](https://github.com/superdingo101/skylight-calendar-card) |
| gclenaghan/family-calendar-card | Skylight-inspired card: Skylight and HA themes, swipe, month view, full event CRUD, recurrence, weather, multi-language | 2026-10-09 | [GitHub](https://github.com/gclenaghan/family-calendar-card) |
| FamousWolf/week-planner-card | Base multi-day/week calendar card most clones build on | 2026-01-25 | [GitHub](https://github.com/FamousWolf/week-planner-card) |
| totaldebug/atomic-calendar-revive | Calendar card (agenda/month) | 2026-11-02 | [GitHub](https://github.com/totaldebug/atomic-calendar-revive) |
| piitaya/lovelace-mushroom | Touch-friendly card set (incl. to-do/chips) | 2026-10-20 | [GitHub](https://github.com/piitaya/lovelace-mushroom) |
| Clooos/Bubble-Card | Pop-ups and buttons used by the Skylight clones | 2026-10-31 | [GitHub](https://github.com/Clooos/Bubble-Card) |
| thomasloven/hass-browser_mod | Kiosk/browser control, pop-ups, screensaver | 2026-11-10 | [GitHub](https://github.com/thomasloven/hass-browser_mod) |
| thomasloven/lovelace-card-mod | CSS styling for cards | 2026-02-09 | [GitHub](https://github.com/thomasloven/lovelace-card-mod) |
| grocy/grocy | Chores, shopping lists, meal plan, stock | 2026-09-16 | [GitHub](https://github.com/grocy/grocy) |
| custom-components/grocy | HA integration for Grocy | 2026-10-25 | [GitHub](https://github.com/custom-components/grocy) |
| mealie-recipes/mealie | Recipes + meal planner + shopping lists | 2026-11-10 | [GitHub](https://github.com/mealie-recipes/mealie) |
| TandoorRecipes/recipes | Recipes + meal planning | 2026-10-27 | [GitHub](https://github.com/TandoorRecipes/recipes) |
| immich-app/immich | Self-hosted photos (screensaver source) | 2026-11-10 | [GitHub](https://github.com/immich-app/immich) |
| MagicMirrorOrg/MagicMirror | MagicMirror² core | 2026-10-01 | [GitHub](https://github.com/MagicMirrorOrg/MagicMirror) |
| MMRIZE/MMM-CalendarExt3 | Month/week calendar module for MM² | 2026-10-19 | [GitHub](https://github.com/MMRIZE/MMM-CalendarExt3) |
| PierreGode/MMM-Chores | Chores module for MM² (touch-capable per forum) | 2026-06-05 | [GitHub](https://github.com/PierreGode/MMM-Chores) |

- The week-planner-card fork the randrcomputers wizard depends on is [randrcomputers/week-planner-card-plus](https://github.com/randrcomputers/week-planner-card-plus). Its activity date was not checked.

**HA Skylight clones in detail**
- The original "DIY Family Calendar (Skylight)" thread was posted by Mohesles on Feb 9 2025 and moved to a package and GitHub repo on Nov 26 2025. It has about 111 likes and at least 21 pages of replies.
  - **Hardware:** a NUC on a VESA mount, driving a 15" HP Engage touchscreen over DisplayPort, with Chrome in kiosk mode.
  - **Software:** the Google Calendar integration (read/write), Browser Mod, Week Planner Card, config-template-card, Bubble Card, better-moment-card, weather-card and button-card. Grocy is planned for tasks and lists.
  - **Filtering:** each person's calendar is filtered with `input_text` regex helpers.
  - **Reported issues:**
    - no hourly week view, because week-planner-card does not support it
    - users must create the UI helpers by hand
    - toggling filters can lag
    - setup is hard for non-technical users

  — [HA Community thread](https://community.home-assistant.io/t/diy-family-calendar-skylight/844830); [page 21](https://community.home-assistant.io/t/diy-family-calendar-skylight/844830?page=21)
- The randrcomputers fork adds a config-flow wizard (people, calendars, weather) that auto-builds a "Family Calendar" dashboard. It offers a `sensor.skylight_setup_status`, a Repairs integration, a `skylight_calendar.fix_setup` service and a `themes/skylight.yaml`. Its README says "Chore/todo checkboxes … are not part of the shared template — add those yourself." Required cards are Week Planner Card Plus, Bubble Card, Config Template Card, card-mod, Better Moment Card and Weather Card. — [README](https://github.com/randrcomputers/my-skylight-calendar)
- The mohesles original notes that week-planner-card cannot natively hide calendars on the fly, which is why it uses regex `input_text` filters. — [GitHub](https://github.com/mohesles/my-skylight-calendar)
- A separate HA forum thread covers "Skylight Calendar Card — A family-friendly schedule card". — [HA Community](https://community.home-assistant.io/t/skylight-calendar-card-a-family-friendly-schedule-card/981221)

**MagicMirror² for a touch family calendar**
- A forum post says "MM doesn't provide any native touch support, as it's designed as output info display panel." A user also reports the CalendarExt3 event popover "will not come up when I touch the individual events on a tablet," although it works with a mouse. — [MagicMirror forum, Touchscreen Family Dashboard thread](https://forum.magicmirror.builders/topic/18011/touchscreen-family-dashboard/17); [CalendarExt3 thread](https://forum.magicmirror.builders/topic/16690/mmm-calendarext3/347?page=3)
- Builders combine MMM-pages and MMM-Touch for swipe navigation and MMM-Chores for chores. A Feb 2026 forum reply says MMM-Chores supports touch. One builder added transparent per-day buttons to CalendarExt3 and wrote a custom Google Calendar add/edit/delete module. — [MagicMirror forum](https://forum.magicmirror.builders/topic/18011/touchscreen-family-dashboard/13?page=3)

### Inferences
- **Recommended DIY software path:** Home Assistant OS/Container plus HACS, with either the randrcomputers wizard or the gclenaghan family-calendar-card (which has built-in event CRUD and swipe).
  - **Chores and lists:** HA to-do lists, the Grocy integration, or the Mushroom/Bubble cards.
  - **Meals:** Mealie, which HA supports as a core integration with meal plans and shopping lists.
  - **Photos and sleep:** Immich as the photo source for a browser_mod or wallpanel screensaver. browser_mod can also drive scheduled screen sleep.
  - This stack is the most active and the most touch-capable.
- **MagicMirror²** suits a read-only "glanceable" display. It needs extra work for touch event entry, so it is weaker for a Skylight-style interactive 27" screen.
- **Single-maintainer risk:** clone projects with one maintainer (mohesles, randrcomputers, superdingo101, gclenaghan) are recent but carry this risk. week-planner-card (Jan 2026) and card-mod (Feb 2026) have slower recent commit cadence, though both remain widely used dependencies.

### Gaps
- I collected no star or issue counts, because the GitHub API was blocked. Maturity is judged only by recent commits and forum adoption.
- I found no standalone (non-HA, non-MM) open-source "family calendar" web app on GitHub with notable adoption. The search was limited.
- Not assessed:
  - Grocy's chore "points/rewards" depth (Grocy has chores but no native reward economy)
  - HA's native chore/reward community add-ons, such as KidsChores
  - DAKboard self-hosted alternatives, such as a self-hosted HA "wall panel" or Dashy
- Reddit "I built my own Skylight" threads were not fetched.

## 4. Linux kiosk display stack (Chromium kiosk, cage, labwc, FullPageOS, OSK, blanking)

### Takeaway
On current Raspberry Pi OS (Trixie and Bookworm), the default compositor is labwc. A kiosk is `chromium --kiosk` launched from `~/.config/labwc/autostart`. Screen blanking is handled by swayidle, and touch mapping by autotouch. cage, labwc and FullPageOS are all actively maintained (commits Nov 2026). The on-screen keyboard is the weak spot: squeekboard and wvkbd may not appear over Chromium in kiosk mode.

### Cited Findings
- **Pi OS default:** Raspberry Pi OS uses labwc (Wayland). The user autostart file is `~/.config/labwc/autostart`. On Trixie the old X11 approach (xset plus .desktop autostart) does nothing. Use `chromium` (not `chromium-browser`) with `--kiosk --noerrdialogs --no-first-run --ozone-platform=wayland`. — [ryancheley/firebirds-scoreboard PR #2 (Trixie labwc kiosk)](https://github.com/ryancheley/firebirds-scoreboard/pull/2); [Linux Junkies kiosk guide](https://linuxjunkies.org/guides/raspberry-pi-kiosk-mode); [Raspberry Pi news: new OS release](https://www.raspberrypi.com/news/a-new-release-of-raspberry-pi-os/)
- **On-screen keyboard:**
  - Squeekboard is the official OSK, is preinstalled, and auto-appears on text-field focus with a touchscreen.
  - wvkbd is an alternative, started with `wvkbd-mobintl --hidden` in autostart.
  - One test found neither keyboard appeared over Chromium in `--kiosk` mode, so this needs workarounds and is unverified.

  — [Raspberry Pi forum: Bookworm on-screen keyboard](https://forums.raspberrypi.com/viewtopic.php?t=358147&start=25); [Raspberry Pi forum: kiosk tutorial with labwc](https://forums.raspberrypi.com/viewtopic.php?t=378883); [mvladislav HA kiosk](https://mvladislav.online/posts/ha-kiosk/)
- **Touch and blanking:**
  - autotouch maps a touchscreen to its display under labwc, for a single DSI panel.
  - Screen blanking uses swayidle, which writes a timeout into the labwc autostart. Blanking can also be toggled in raspi-config.

  — [raspberry.tips Touch Display guide](https://raspberry.tips/en/raspberrypi-tutorials/setting-up-the-raspberry-pi-touch-display-7-inch-display-2-bookworm); [computingforgeeks Pi 5 touchscreens 2026](https://computingforgeeks.com/best-touchscreen-raspberry-pi-5/)
- **Packaged kiosk images and compositors:**
  - TOLDOTECHNIK/Raspberry-Pi-Kiosk-Display-System packages a Wayland compositor with hardware-accelerated Chromium for signage. — [GitHub](https://github.com/TOLDOTECHNIK/Raspberry-Pi-Kiosk-Display-System)
  - FullPageOS last commit 2026-11-08. — [GitHub](https://github.com/guysoft/FullPageOS)
  - cage (single-app Wayland kiosk compositor) last commit 2026-11-01. — [GitHub](https://github.com/cage-kiosk/cage)
  - labwc last commit 2026-11-05. — [GitHub](https://github.com/labwc/labwc)

### Inferences
- **Recommended stacks:**
  - **Pi 5 + 27" USB-touch monitor:** Pi OS Lite or Desktop, with labwc autostart running `chromium --kiosk <HA dashboard URL>`, swayidle (or HA/browser_mod-driven DPMS) for night sleep, and autotouch or a manual libinput mapping.
  - **x86 mini-PC:** `cage -- chromium --kiosk ...` under a systemd user service (or getty autologin) is the minimal, robust option.
- **Keyboard:** the Skylight-clone cards provide in-page add-event forms, so an OS-level keyboard may matter less if the dashboard UI avoids heavy text entry. Otherwise, test squeekboard or wvkbd with Chromium's `--enable-wayland-ime` or text-input-v3 flags.
- **FullPageOS:** the fastest turnkey option, but it uses its own image and is less flexible.

### Gaps
- I did not verify squeekboard/wvkbd behavior with current Chromium on Trixie, or the exact Chromium IME flags.
- I did not fetch wvkbd (hosted on sourcehut) or squeekboard (GNOME GitLab) to get activity dates.
- I found no primary source on multi-touch gesture support (pinch/swipe) through cage versus labwc with 27" USB HID touch panels.
- I did not fetch a systemd unit example for cage from a primary source.
