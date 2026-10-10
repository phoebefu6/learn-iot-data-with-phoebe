# Agent brief - shared by every fan-out page of learn-iot-data-with-phoebe

Filled from `~/.claude/skills/course-builder/references/agent-brief.template.md` plus
`course-estate-audit/briefs/two-track-emrg-overrides.md` (a5/a6 family rule) on 2026-10-10.
Internal build document: never link it from an audience page.

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page for YOUR track. Copy its structure, classes, SVG grammar and quiz markup
   EXACTLY, including how many options each question has (three):
   - Leader: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/courses/a1-the-sensor-is-the-source-of-truth.html`
   - Practitioner: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/courses/p1-reading-a-turbofan-run.html`
   - The bench page, for any page that drives the engine: `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/courses/p10-the-rul-bench.html`
2. The source map: every verified number, its evidence tier, per-session coverage ("May quote"
   column), the seams. Use ONLY its numbers; never invent a statistic; if a fact is missing,
   teach the uncertainty.
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/materials/official-course-map.md`
3. The stylesheet `:root` block for the palette tokens:
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/assets/style.css`
4. The engine, if your page has a widget:
   `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-iot-data-with-phoebe/assets/iot-live.js`
   Exports `IOT.ladder(IOT_SAMPLE, opts)` (rungs `mean, linear, hi, smooth, trailing, mnarSmooth,
   shuffleSmooth, cap130Smooth`, each `{rmse, score, scorePerUnit, bias, lateShare, n, preds}`;
   `opts.only` = list of rung keys to compute; any key of `IOT.DEFAULTS` may be overridden),
   `IOT.decode(IOT_SAMPLE)` (units `{u, n, rows, cyc}`, `rows[t][k]` in `IOT_SAMPLE.channels`
   order), `IOT.triage`, `IOT.household(seed)`, `IOT.edgeBudget(params)`, `IOT.phmScore(d, 13,
   10)`, `IOT.localLine`, `IOT.trailingMean`, `IOT.selfTest(fault)`, `IOT.selfTestResult`.
   Pages that use the real rows load `../assets/iot-sample.js?v=1` FIRST (298 KB; only on pages
   that need it: a1, a2, a3, a5, p1, p3 to p7, p10), then `../assets/iot-live.js?v=1`, then
   `../assets/app.js?v=1`. p2, p8, p9, a4, a6 load only iot-live.js and app.js.

## Page skeleton (keep every component; the template pages are the authority)

toolbar (crumb EXACTLY `<a href="../index.html">learn-iot-data-with-phoebe</a> / Leader session N of 6`
or `/ Practitioner session N of 10`, #toggle-all, #zoom-toggle) · masthead (eyebrow
"Learn IoT &amp; Industrial Data with Phoebe · Leader session N of 6" / "· Practitioner session N
of 10", h1 with one `<span class="accent">`, .sub, .chip-row with the level chip (leader pages:
`🟠 Leader track`; practitioner: `🟡 Foundations` for p2, `🟠 Working depth` for p3 to p5,
`🔴 Advanced` for p6 to p9), two audience chips, `.chip.time` "45 min"; .agenda a1-a4 with flex
weights) · main.wrap · section#intro (Part 0: kicker `.klabel` "Part 0" + h2, .lede, .legend with
the three pills exactly as the template, `.callout.win` beginning "★ What you walk out with
tonight.", two `details.card`, the first `open`) · section#part-1 and section#part-2 (each:
section-kicker with klabel "Part N · covers ...", h2, `.tag.concept "N min live"`; a `.lede`; ONE
`figure.zoomable`; three or four `details.card` with summary `.mode.live` or `.mode.self`, title,
`.mini "N min"`, `.caret ▶`; at least one `.callout.example` with `span.ex-pill` "Real world" on
the page; one `details.card` titled "Where serious people disagree" somewhere on the page) ·
section#part-3 (klabel "Part 3 · build-along", h2, `.tag.build "N min hands on"`, .lede, ONE
figure, `.steps > .step > div > h4 + p` with 5 or 6 steps; practitioner pages carry a
`.prompt-box.good` with `span.label` "console" under most steps; leader pages carry no code; close
with a `.callout.tip` beginning "The habit to keep.") · section#quiz (klabel "Check yourself", h2
"Three questions", 3 x `div.quiz-q data-answer="0-based"` each with `p.qtext`, three `div.qopt`
"A · ...", "B · ...", "C · ...", and `q.qwhy`; then ONE `div.quiz-score`) · section#homework
(klabel "Before session N+1" or "After the track", h2 "Homework", .lede, `.steps` with 2 or 3
steps) · section#official (klabel "Covered tonight", h2 EXACTLY "What this session covers",
`.covered > .covered-row` with `span.status.pill.solid` ✓ / `.pill.inkpill` ◐ / `.pill.light` ○,
`span.name`, `span.note`; 8 to 11 rows; the last two rows are always the seam hand-off and the
"simulated, not real engines" line as in the template) · section#cheatsheet (klabel "Take this
with you", h2 "Cheat sheet", `.cheat > .cheat-item` x 8, each `<strong>Label.</strong> text`) ·
footer.pagefoot (`<p>Leader session N of 6 · learn-iot-data-with-phoebe · by Phoebe Fu</p>`,
`nav.pagenav` with prev and next) · scripts as above, then the page's own `<script>` and
`<style>` as the template.

Head: the template's social meta block with this page's own title, description and url;
`<title>Leader session N · <Title> - learn iot data with phoebe</title>` (or `Practitioner session
N · ...`); `<link rel="stylesheet" href="../assets/style.css?v=1">`. Nothing else external.

First `details.card` in Part 1 is `open`, plus the first in Part 0; no other. Sentence case
headings. Warm practitioner voice, concrete, never dry. Inside prompt-boxes escape `&` `<` `>`.
500 to 700 lines is guidance about depth, never a target: never collapse whitespace, dissolve a
list into a paragraph, or drop a component to fit.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only.
- No meta or internal wording in visible text, aria-labels or meta tags: never "this course",
  "in this course", "the course teaches", "course map", "source map", "materials/". Say "every
  session", "the leader track", "the canon figures". "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or is printed by the engine at the canon settings (seed 2008,
  defaults). Constructed data (p2, p8, p9, a4): "constructed" on the widget and in the prose, and
  "your numbers will differ" wherever the reader can change an input.
- **"Real public rows from NASA's simulation"**, never "real engines", "real flights" or "real
  failures", on every page that quotes FD001. Say once per page that the degradation is simulated
  (C-MAPSS).
- Contested or missing evidence: teach the disagreement (the map's three "Contested or moving"
  items: the 125/130 cap, the score's printed orientation, one score or several). Never resolve.
- Citations in the exact form of the map's appendix; anything the map marks reported is
  "reported" on the page too (Heimes 2008, Molina-Markham 2010, IEC 62443 / Purdue).
- NEVER "lottery" or "lotteries"; say the mechanism ("a seeded random draw").
- Default to the English word. No Chinese terms are expected on these pages.
- **No vendor, product, platform, cloud, protocol-brand or controller names; no named incidents,
  recalls, outages or breaches; no prices or money figures; no purchasing or investment advice.**
  Open standards and public bodies (NIST, NASA, ISA/IEC by name only) are fine.
- Running cases: **Harrow Lane Overhaul** (constructed engine-overhaul shop; its fleet is the 100
  simulated engines) and **Flat 4B** (constructed household). Labelled constructed on first use on
  every page. Never Phoebe's own work.
- Every page number must be one the engine prints at the canon settings, quoted with n ("300 units
  under test", "70 training engines"). The bench is n = 300 cut points on 30 held-out engines,
  NOT the NASA test set; say so whenever a score appears.
- The score lean: **late is punished harder** (divide by 10 late, 13 early). Never write "a1 = 10
  for late"; if the equation is shown, show it as the map's fact 11 describes and name the
  discrepancy.
- Titles, widget ids and class names must not collide with siblings: prefix EVERY widget id with
  `i` + your page id (`ip3-`, `ia4-`) and every figure with `i` + page id + letter (`ip3a`,
  `ip3b`). Do not use any `.dh-`, `.hb-`, `.tr-`, `.tick-`, `.sv-`, `.wipe-`, `.stakes-` class.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): moss `#3F6212` · deep `#2A410C` · mid `#93A86F` ·
soft `#D5E0C1` · tint `#F3F7EA` · ink `#1D2513` · muted `#56604A` · faint `#CDD5C0` · hairline
`#E3E9D8` · copper `#9B4D45` · copper tint `#FBEFEC` · copper text `#7A3730` · paper `#FBFCF7` ·
faint text `#5E6752` · `#FFFFFF` · universal reds `#991B1B` `#FEF2F2` `#FCA5A5` only for a
wrong-way panel.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg"
  role="img" aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Prefix P unique per figure, used for every class and id (`ip3a`: classes `.ip3aH`, ids
  `ip3aSk`, `ip3aHc`, `ip3aAr`).
- `<defs>` holds three things: a wobble filter `id="PSk"` (`feTurbulence type="fractalNoise"
  baseFrequency="0.02" numOctaves="2" seed="<int>"` + `feDisplacementMap scale="2.4"
  xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%" width="106%" height="106%"`), a
  hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one line in `#3F6212` or
  `#9B4D45`, opacity .5), an open arrowhead `id="PAr"` (path `M1 1 L9 5 L1 9`, fill none, stroke
  `#1D2513` 1.6). ALL shapes sit inside ONE `<g filter="url(#PSk)" fill="none" stroke="#1D2513"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`; rects carry a tiny rotation
  (-1.2 to 1.2 degrees). Fills: white, `#F3F7EA`, `#FBEFEC`, the hachure for "the pile" or "the
  data", and copper `#9B4D45` ONLY for the one thing the figure is about. One doodle anchor per
  figure (a sensor dot, a meter dial, a gauge needle: simple strokes, never a mascot). A deliberate
  strike-through carries `data-strike="1"` on its path.
- Text classes, declared in the figure's `<style>` with `fill:` (never rely on attributes): `.PH`
  800 12px `#1D2513` heading · `.PL` 600 12px ink label · `.PS` 400 11px `#56604A` · `.PB` 800 11px
  `#7A3730` · `.PV` 800 16-18px `#2A410C` value · `.PW` 800 12px white on a fill · `.PA` 700 11px
  `#3F6212` · `.PN` 400 12px `#56604A` note.
- ALL `<text>` outside the filtered group, font `Inter, sans-serif`, never below 10.5px.
- Fit (owner: `diagram-kit.md`): max chars about (box width - 20) / 7 at 12px, 6.4px/char at
  11px; a full-width note under 110 characters per line, split into two lines at y + 18 when
  longer; 40px between neighbouring point labels; bottom note 22px below the last row, H clears
  it by 8px. No path may cross a label; no label may extend past the box it sits in; no two filled
  rects may overlap unless one is wholly inside the other. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along (three per page). Draw the MECHANISM
  (where the sensor sits and what it reads, where a reading vanishes and what the pipeline does
  next, which side of the true failure the prediction lands and what each side costs, where the
  sample clock and the event clock part, which bytes cross the link and which stay at the edge,
  what a meter trace says about the people behind it), never a metaphor literally, never decoration.

## Voice and honesty

Every Part gets a real-world story from the map's cases: Harrow Lane Overhaul or Flat 4B,
constructed, said so. The bench's smoothing gain is small (0.36 RMSE); never call it a fix, and
name the lagging trailing mean beside it. The baseline's 305,167 is two long-lived engines; say
so wherever it appears. The 125 cap is a convention; print 130 beside it where a cap is taught.

## Widgets (practitioner p2 to p9 carry one; leader a2 to a6 carry one small one)

Copy the `.wk` block from p1 or p10: `div.wk#i<pageid>-<name>` > `.wk-head` (b "Live" +
`.wk-hint`) > `.wk-body` (`label.sql-label` + `select.sql-code` or `input.sql-code[type=range]`,
a `div#<id>-out`, a `p.sql-note#<id>-verdict`) > `.wk-foot#<id>-self` that prints the selfTest
sentence as the template does. Default render must finish in about a second; the full ladder runs
in under 100 ms in node, so it may run on load. Never hard-code a number the widget does not print.

## Family sessions (overrides, Phoebe-approved family rule)

- **a5 "Why the warehouse playbook breaks here":** one session, mechanism by mechanism, five
  contrasts: the SOURCE (a device that drifts and never says so, vs a person or system that meant
  it), the IDENTITY (no user id: the unit is an engine or a household), the GROUND TRUTH (failure
  arrives once, at the end, and censors everything before it), the FEEDBACK LOOP (maintenance
  changes the outcome you were predicting), the COST OF BEING WRONG (late versus early, priced
  asymmetrically). Each contrast drawn as a figure (two figures may each hold several contrasts as
  side-by-side panels), never a slogan.
- **a6 "From warehouse to plant floor: the transfer map":** three columns CARRIES OVER / MUST LEARN
  / MUST UNLEARN, each item naming the skill, method, tool class or reading concretely (no vendor
  or product names), then a 90-day self-study ladder on free sources only, each marked "official"
  (the publisher's own copy: NASA PCoE repository, NIST CSRC, the PHM Society's open proceedings,
  arXiv author copies) or not. The landing page's "If you come from a data team" block summarises
  a6 and must stay consistent with it: read `index.html` before writing a6.

## Cross-links (absolute URLs)

- Time-series anomalies: https://phoebefu6.github.io/learn-anomaly-detection-with-phoebe/courses/b7-timeseries-anomalies.html
- Measuring detection: https://phoebefu6.github.io/learn-anomaly-detection-with-phoebe/courses/a5-measuring-detection.html
- Backtesting and metrics: https://phoebefu6.github.io/learn-timeseries-forecasting-with-phoebe/courses/b8-backtesting-metrics.html
- Windowing: https://phoebefu6.github.io/learn-streaming-data-with-phoebe/courses/04-windowing.html
- Late data: https://phoebefu6.github.io/learn-streaming-data-with-phoebe/courses/05-late-data.html
- Distribution drift: https://phoebefu6.github.io/learn-data-observability-with-phoebe/courses/b5-distribution-drift.html
- Missing data as signal (its page calls itself practitioner session 7; the file is b7):
  https://phoebefu6.github.io/learn-feature-engineering-with-phoebe/courses/b7-missing-data.html
- GDPR scope: https://phoebefu6.github.io/learn-gdpr-with-phoebe/courses/a1-scope.html
- PDPA consent: https://phoebefu6.github.io/learn-pdpa-dnc-with-phoebe/courses/a4-consent-exemptions.html
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chains and session titles

Leader chain: a1-the-sensor-is-the-source-of-truth.html → a2-missing-is-never-random.html →
a3-a-false-alarm-stops-the-line.html → a4-the-home-is-a-sensor-network.html →
a5-why-the-warehouse-playbook-breaks-here.html → a6-from-warehouse-to-plant-floor.html (last
page: "← Prev" and "All sessions →" to ../index.html).

Practitioner chain: p1-reading-a-turbofan-run.html → p2-clocks-sampling-and-resampling.html →
p3-channel-triage.html → p4-many-channels-one-health-index.html →
p5-remaining-useful-life-as-a-target.html → p6-missing-not-at-random-planted.html →
p7-the-asymmetric-score.html → p8-edge-or-cloud-budget.html → p9-smart-home-telemetry.html →
p10-the-rul-bench.html.

Footer left: `<p>Leader session N of 6 · learn-iot-data-with-phoebe · by Phoebe Fu</p>`.
Footer right: `<a href="prev">← Leader session N-1 · <Title></a>` and `<a href="next">Leader
session N+1 · <Title> →</a>` (session 1 of a track: "← All sessions" to ../index.html).

Session titles (exact, sentence case, one accent span in h1):

- a1 The sensor is the source of truth until it drifts (exists)
- a2 Missing is never random
- a3 A false alarm stops the line
- a4 The home is a sensor network
- a5 Why the warehouse playbook breaks here
- a6 From warehouse to plant floor: the transfer map
- p1 Reading a turbofan run as a dataset (exists)
- p2 Clocks, sampling and resampling
- p3 Channel triage: flat, noisy and drifting
- p4 From many channels to one health index
- p5 Remaining useful life as a target
- p6 Missing not at random, planted
- p7 The asymmetric score
- p8 Edge or cloud: a bandwidth and latency budget
- p9 Smart home telemetry: occupancy and where to stop
- p10 The remaining-useful-life bench (exists)
