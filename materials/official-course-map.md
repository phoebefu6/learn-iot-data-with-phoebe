# Official course map - learn-iot-data-with-phoebe

"IoT & Industrial Data (incl. smart home)". Bucket `emrg`, difficulty d3, audience both,
16 sessions, Leader 6 + Practitioner 10. **Every session is 45 minutes, on both tracks.**
Short name `iot`, engine `assets/iot-live.js`, sample `assets/iot-sample.js`,
PASSPORT_KEY `lwp-passport:iot-data` (the brief said `lwp-passport:iot`; pre-publish requires the slug core). Skeleton approved by Phoebe 2026-10-10; not re-scoped here.

**Angle (Phoebe-approved).** A warehouse row is written by a person or a system that meant it; a
sensor row is written by a device that drifts, drops out exactly when conditions are worst, and
never says so. A false alarm stops a line; a missed one breaks an engine; there is no user id.
Smart home is the consumer face: the household is the unit, occupancy is inferred, and the
privacy line moves into the living room.

**Data.** REAL public rows from NASA's simulation: C-MAPSS FD001 train, 100 simulated turbofan
engines run to failure, every cycle kept (20,631 rows). Say "real public rows from NASA's
simulation" on every page that quotes it, never "real engines". p8 and p9 use CONSTRUCTED data,
labelled constructed on the widget and in the prose.

**Running cases (fictional, labelled constructed on every page that uses them; never Phoebe's
work):**
- **Harrow Lane Overhaul** - a constructed engine-overhaul shop whose planners must decide, each
  week, which engines to pull for maintenance. Its "fleet" is the 100 NASA-simulated engines.
- **Flat 4B** - a constructed household whose electricity meter reports every 15 minutes (p9, a4).

**Content refusals (overrides file).** No vendor, product, platform or protocol-brand names
beyond open standards. No named incidents. No prices, no purchasing advice. Money appears only as
"the cost of being wrong", never as a figure; no page needs the investment-advice line because no
page quotes money, but the landing page and a1 still carry "not purchasing or investment advice"
under the cost-of-error discussion.

---

## The seam

| Subject | Owner (LIVE) | Here |
|---|---|---|
| General detectors: z-score, isolation forest, one-class, time-series anomalies, precision/recall of a detector | `learn-anomaly-detection-with-phoebe` b7 "Time-series anomalies", a5 "Measuring detection" | **Linked, never re-taught.** Here the question is not "is this point odd" but "how long until this engine fails", and the cost of a false alarm versus a miss is priced by the asymmetric score. |
| Forecasting models, rolling-origin backtests, MAPE/RMSE/MASE | `learn-timeseries-forecasting-with-phoebe` b8 "Backtesting & metrics" | Linked. RMSE is used, not taught; the new object is a run-to-failure target and a score that punishes late more than early. |
| Event time, late data, windows, watermarks | `learn-streaming-data-with-phoebe` 04 "Windowing", 05 "Late data" | Linked from p2. p2 teaches sampling rate, clock skew and resampling of a sensor channel; the streaming mechanics stay there. |
| Pipeline data quality, freshness, volume, drift monitors | `learn-data-observability-with-phoebe` b5 "Distribution drift from metadata only" | Linked from p3. Here the drift is in the physical sensor, not the pipeline. |
| Missing data as a feature, imputation methods | `learn-feature-engineering-with-phoebe` practitioner session 7 "Missing data as signal" (file `b7-missing-data.html`) | Linked from a2 and p6. Here the missingness is planted, its mechanism is declared, and the bench measures what deletion does to a time-to-failure estimate. |
| Law: lawful basis, consent, household and personal data | `learn-gdpr-with-phoebe` a1, b2; `learn-pdpa-dnc-with-phoebe` a4 | Linked from a4 and p9. Here: what a meter trace reveals and where a data team should stop; no legal advice, no reteaching of either law. |

**This course owns:** run-to-failure data, remaining useful life (RUL) as a target, the RUL cap
convention, health indices, channel triage (flat / noisy / drifting), missing-not-at-random sensor
dropout, the PHM08 asymmetric score, edge-or-cloud budgeting, and smart-meter occupancy inference.

**Estate vocabulary check (grep of `learn-*-with-phoebe/courses/*.html`, 2026-10-10).**
`turbofan` 0 · `C-MAPSS` 0 · `remaining useful life` 0 · `predictive maintenance` 0 · `smart meter`
0 · `occupancy` 0 · `OT/IT` 0 · `health index` 0 · `asymmetric score` 0 · `PHM08` 0 · `IEC 62443` 0
· `Purdue` 0 · `missing not at random` 1 (feature-engineering p7, the seam above). None of the 16
titles collides with a sibling h1 (closest: quant a5 "Why the playbook breaks here", crypto/quant
a6 "... : the transfer map" - ours carry "warehouse" and "plant floor").

---

## Frozen canon - the remaining-useful-life bench

### The world, in one paragraph

FD001 train: 100 engines, one operating condition (sea level), one fault mode (high-pressure
compressor degradation), each run from normal operation to failure. Each row is one operational
cycle with 3 operational settings and 21 sensor channels. Seven channels never move in FD001 and
are not shipped (listed below as a fact p1 and p3 teach); 14 are shipped, each quantised to at
most 90 levels (step = max(native resolution, range / 89), so T50 is kept to 0.67 degrees Rankine,
Nc to 2.50 rpm; the steps are in `IOT_SAMPLE.meta`). A seeded split (seed 2008) holds out 30
engines; each held-out engine gets 10 seeded cut points with true RUL drawn uniformly from 10 to
min(150, life - 31), so **n = 300 units under test**. The 70 training engines fit the models.
The NASA test and RUL files were not shipped: they would push the sample past 300 KB. The held-out
engines stand in for them, and every page says so.

### The engine is checked, not assumed

- `selfTest()` runs on load: six properties (late costs more than early at equal size; score 0
  at d = 0; the smoother has no lag on a straight decline; least squares recovers a known line;
  seeded draws repeat; dropout removes only hot readings). **All pass.**
- Each of three planted faults in the REAL functions fails at least one check (measured
  2026-10-10): `swapScore` fails "late costs more than early"; `laggedSmoother` fails "no lag on
  a straight decline"; `mnarAll` fails "dropout removes only hot readings".
- **Python agreement:** `materials/iot_reference.py` reimplements decode, split, fit, smoothing,
  planting and scoring in pure Python on the same sample. Against `node materials/iot_canon.js`:
  worst relative difference on every headline number **0.0**, max per-cut prediction difference
  **0.0**, identical cut draws, identical triage and household outputs. The comparer was tested
  against failing: a planted 1e-5 change and a changed household count both exit 1.
- Whole ladder in node: 67 to 72 ms.

### The ladder (seed 2008, 300 units, 70 training engines; widget precision)

Score = PHM08 asymmetric score summed over the 300 units; per unit = that sum / 300. Bias = mean
(predicted - true); positive = late. Late share = share of units predicted late.

| Rung | RMSE | Score (sum) | Score per unit | Bias | Late share |
|---|---|---|---|---|---|
| 0 Mean-life baseline (predict 200.37 - cycles seen) | **45.61** | **305,167** | 1,017.22 | -12.1 | 43% |
| 1 Linear fit on 14 raw channels, uncapped target | **30.50** | **28,557** | 95.19 | +15.8 | 70% |
| 2 Health index + capped RUL target (cap 125) | **24.00** | **3,542** | 11.81 | +0.8 | 56% |
| 3 + smoothing (local line over last 10 health-index values) | **23.64** | **3,366** | 11.22 | +1.4 | 56% |
| contrast: trailing mean of last 10 instead (lags) | 24.88 | 4,171 | 13.90 | +4.3 | 61% |
| ANTI-LEVER: hottest T50 readings go missing (p = 0.7), rows with gaps dropped, then rung 3 | **24.89** | **4,656** | 15.52 | +4.7 | 60% |
| BREAK: cycle order shuffled inside each engine, then rung 3 | **40.41** | **46,145** | 153.82 | +7.9 | 57% |
| convention check: rung 3 with cap 130 | 23.70 | 3,622 | 12.07 | +3.0 | 57% |

- **Two-number headline:** rung 3 prints RMSE 23.64 and score 3,366; the anti-lever moves RMSE by
  only +1.25 (5 percent) but the score by +1,290 (38 percent), and the bias goes late (+1.4 to
  +4.7). That gap IS the lesson of p6 and p7: the square-error number barely notices a late shift
  that the asymmetric score prices.
- **Anti-lever planting, declared on the widget:** rows whose T50 reading is at or above 1416.2
  degrees Rankine (the hottest 20 percent of the fleet's readings) go missing with probability 0.7.
  **3,073 of 20,631 rows (14.9 percent)** vanish. The pipeline then "drops rows with gaps" and
  reads the last surviving rows as if they were current, so the engine looks cooler and healthier
  than it is. Modelled, labelled modelled.
- **The baseline's score is a lesson by itself:** 305,167 is mostly two long-lived engines. Engine
  69 (life 362, the longest in FD001) and engine 96 (life 336) are already past the 200-cycle
  average at their cut points, so the baseline predicts 0 to 14 cycles left when 140 to 150
  remain. Six of the 300 units (those two engines) carry **79.5 percent** of the sum; the single
  worst unit (d = -142) costs 55,440 alone, 18.2 percent. For contrast, rung 3's three worst units
  carry 12.8 percent of its sum. Say "a sum of exponentials is ruled by its worst few units"
  wherever the number appears.
- **Smoothing buys little, and only if it does not lag.** The lag-free local line improves RMSE by
  0.36 and score by 176 at seed 2008. On seeds 1, 7 and 42 (exploration, not canon) it improved
  both numbers every time, by 0.03 to 0.85 RMSE. A trailing mean of the same window made both
  numbers WORSE (24.88 / 4,171) because a one-way degradation signal punishes lag. Teach it as a
  small, real gain with a trap beside it; never as "smoothing fixes noise".
- **The cap is a convention.** Cap 130 instead of 125: RMSE 23.70 against 23.64, score 3,622
  against 3,366. Both appear in the literature (facts 9 and 10). Do not claim either is right.
- **Seed robustness (engine runs on seeds 1, 7, 42; quotable only with the seed named):**

  | Seed | mean | linear | hi | smooth | trailing | MNAR | shuffle | cap 130 |
  |---|---|---|---|---|---|---|---|---|
  | 2008 | 45.61 / 305,167 | 30.50 / 28,557 | 24.00 / 3,542 | 23.64 / 3,366 | 24.88 / 4,171 | 24.89 / 4,656 | 40.41 / 46,145 | 23.70 / 3,622 |
  | 1 | 38.00 / 34,206 | 37.18 / 96,743 | 25.01 / 4,968 | 24.73 / 4,735 | 26.56 / 6,204 | 25.84 / 6,258 | 41.78 / 72,140 | 25.13 / 5,542 |
  | 7 | 38.06 / 47,989 | 40.40 / 89,310 | 24.85 / 5,288 | 24.82 / 4,891 | 26.46 / 6,727 | 26.25 / 7,351 | 38.44 / 47,858 | 25.39 / 5,709 |
  | 42 | 36.48 / 24,530 | 25.94 / 6,973 | 23.17 / 2,941 | 22.32 / 2,562 | 23.36 / 2,947 | 23.16 / 2,993 | 39.28 / 39,987 | 21.89 / 2,453 |

  (RMSE / summed score.) **Holds on all four seeds:** hi beats mean and linear; smooth beats hi and
  trailing; MNAR is worse than smooth on both numbers and later in bias; shuffle is far worse than
  smooth. **Does not hold:** linear is WORSE than the floor at seed 7 (40.40 vs 38.06) and its score
  is worse than the floor's at seeds 1 and 7; the shuffle is not always the worst rung (seed 7:
  linear is worse); cap 130 beats 125 at seed 42. Pages say "on every seed tried" only for the
  holds list.

### Channel triage (all 100 engines; `IOT.triage`)

r = Pearson correlation with cycles-to-failure (negative = rises as failure nears). Noise share =
within-engine cycle-to-cycle spread over the channel's total spread (lower = smoother trend).

| Channel | Symbol (Table 2) | r | Noise share |
|---|---|---|---|
| s2 | T24 LPC outlet temperature | -0.606 | 0.60 |
| s3 | T30 HPC outlet temperature | -0.584 | 0.65 |
| s4 | T50 LPT outlet temperature | -0.679 | 0.45 |
| s7 | P30 HPC outlet pressure | +0.657 | 0.46 |
| s8 | Nf physical fan speed | -0.564 | 0.43 |
| s9 | Nc physical core speed | -0.390 | 0.19 |
| s11 | Ps30 HPC outlet static pressure | -0.696 | 0.38 |
| s12 | phi fuel flow / Ps30 | +0.672 | 0.41 |
| s13 | NRf corrected fan speed | -0.563 | 0.42 |
| s14 | NRc corrected core speed | -0.307 | 0.17 |
| s15 | BPR bypass ratio | -0.643 | 0.54 |
| s17 | htBleed bleed enthalpy | -0.606 | 0.61 |
| s20 | W31 HPT coolant bleed | +0.629 | 0.56 |
| s21 | W32 LPT coolant bleed | +0.636 | 0.56 |

**Flat in FD001 (not shipped):** s1 T2, s5 P2, s6 P15 (two distinct values, 21.60 / 21.61), s10
epr, s16 farB, s18 Nf_dmd, s19 PCNfR_dmd; operational setting 3 is constant at 100.0. Lesson for
p1/p3: a channel that never moves in one operating condition is not broken and not useful here;
it may matter in the six-condition subsets (FD002, FD004), which are not covered.
Note s9 and s14 have the weakest correlation and the lowest noise. CORRECTED 2026-10-09 (p3 agent,
re-checked in the engine): they do NOT drift across the whole life. Their fleet mean changes late,
like T50 (s9 tenth means 9056.0 ... 9090.6), but engines split on direction: 29 of 100 (s9) and 43
of 100 (s14) end lower than they start (mean of first tenth vs last tenth). That split is what weakens
the pooled r. Teach: weak r means look at the traces, not drop the channel. The file does not say why
engines split; do not invent a cause. (s2 r is -0.606; raw -0.60647, an earlier -0.607 double-rounded.)

**Fleet facts computed from FD001 train (all 100):** life 128 to 362 cycles, mean 206.31, median
199. The 70 training engines of the seed-2008 split average 200.37. Engine 39 is the shortest
(128), engine 69 the longest (362), engine 1 runs 192.

**T50 (LPT outlet temperature) on the shipped, quantised sample:** fleet mean of each engine's
first 20 cycles 1402.75 degrees Rankine, of its last 20 cycles 1424.95: a rise of 22.20. Engine 1:
1400.85 to 1424.85; engine 69: 1402.38 to 1427.58; engine 39: 1407.14 to 1426.68 (it starts
hotter and has the least life). **Where the hot readings live:** 88.8 percent of rows in an
engine's last 30 cycles are at or above the anti-lever's 1416.2 threshold, against 1.6 percent of
rows in the first half of life. That is why the planted dropout is not at random: it removes the
end of life. (Computed with `IOT.decode` in node, 2026-10-10.)

**By tenth of each engine's life (all 100 engines, 20,631 rows):** fleet mean T50 1402.57,
1402.75, 1403.41, 1404.35, 1405.48, 1406.96, 1409.16, 1412.57, 1417.50, 1425.04; share of rows at
or above 1416.2: 0.8, 0.8, 1.4, 1.8, 3.4, 6.7, 12.0, 27.1, 63.8, 96.4 percent. Most of the rise
comes in the last three tenths. (a1 figure 2 plots these.)

### Constructed: Flat 4B meter trace (`IOT.household(909)`, p9 and a4)

14 days of 15-minute average power. Truth = someone awake at home. Inference = a reading above the
day's 10th percentile + 120 W. Confounders built in: quiet awake slots, and on some days a timed
appliance that runs with nobody home. **Accuracy 93.0 percent of slots. Leave time inferred
within 30 minutes on 12 of 14 days; median error 0 minutes; the two misses (225 and 45 minutes)
are both days the timed appliance ran.** Constructed; "your numbers will differ" if the seed is
exposed. Lesson: a threshold on one meter already prints the household's wake, leave, return and
sleep times - the schedule of an empty home.

### Constructed: edge-or-cloud budget (`IOT.edgeBudget()`, p8)

Defaults (all constructed, all learner-editable): 40 devices x 14 channels x 10 Hz x 4 bytes;
2,000 kbit/s uplink; edge summary of 224 bytes per device per minute; decision deadline 500 ms;
link latency 120 ms each way; cloud compute 150 ms; edge compute 40 ms.
Raw stream **179,200 bit/s = 9.0 percent of the link, 1.94 GB per day**; edge summaries
**1,195 bit/s, a 150x reduction**; sample-to-decision **cloud path 490 ms (inside 500 by 10 ms),
edge path 140 ms**. Lesson: the cloud path "meets" the deadline with 10 ms of slack, which one
slow round trip erases. Arithmetic, not measurement; say so.

---

## Verified facts and their tiers

**Read at source** = fetched and read in this build (PDF text extracted, figures rendered and
looked at). **Reported** = from an abstract page, a citing paper or a search summary; the primary
text was not read. A fact that could not be read at source is reported or cut.

| # | Fact | Tier | Source |
|---|---|---|---|
| 1 | FD001: 100 train and 100 test trajectories, ONE condition (sea level), ONE fault mode (HPC degradation); FD002 six conditions; FD003 two fault modes; FD004 both | read at source | dataset readme.txt (inside the NASA zip) |
| 2 | "Each engine starts with different degrees of initial wear and manufacturing variation which is unknown to the user"; the engine operates normally at the start and develops a fault; in train the fault grows until system failure; test series end some time before failure; "The data is contaminated with sensor noise" | read at source | readme.txt |
| 3 | 26 columns: unit, cycle, 3 operational settings, 21 sensor measurements | read at source | readme.txt |
| 4 | Data set 6 of the NASA PCoE repository; citation "A. Saxena and K. Goebel (2008). Turbofan Engine Degradation Simulation Data Set, NASA Prognostics Data Repository, NASA Ames Research Center, Moffett Field, CA"; "Four different sets were simulated under different combinations of operational conditions and fault modes"; data set 17 is a second turbofan set (2021, real flight conditions) | read at source | NASA PCoE data set repository page |
| 5 | The 21 sensed outputs and their units (Table 2): T2, T24, T30, T50 in degrees Rankine; P2, P15, P30, Ps30 in psia; Nf, Nc, NRf, NRc in rpm; epr, phi, BPR, farB, htBleed, Nf_dmd, PCNfR_dmd, W31, W32 | read at source | Saxena et al. 2008, Table 2 |
| 6 | The column-to-symbol pairing (sensor 1 = T2 ... sensor 21 = W32) follows Table 2's order; the readme numbers the columns only | reported (convention used across the PHM literature) | Table 2 order + common usage |
| 7 | Health index = the lowest of the normalised operability margins (fan, LPC, HPC stall margins, EGT margin), 1 healthy, 0 failed; limit 15 percent for the stall margins and about 2 percent for EGT; simulation stopped when health reached 0; participants were NOT given the health index and had to infer it from the sensed variables | read at source | Saxena et al. 2008, sections V.D and VI |
| 8 | Noise: the degradation trajectory was masked by a mixture of two random distributions, passed through the system dynamics, then measurement noise was added to every output channel ("multistage noise contamination") | read at source | Saxena et al. 2008, section V.B/C |
| 9 | PHM08 test RULs ranged 10 to 150 cycles; validation 6 to 190, a widening not announced to participants | read at source | Saxena et al. 2008, section VI |
| 10 | The score: d = estimated RUL - true RUL; s = sum of e^(-d/a) - 1 for early and e^(d/a) - 1 for late; "late predictions were more heavily penalized than early predictions"; "the penalty grows exponentially with increasing error"; "in specific situations ... early predictions may instead involve significant economic burden", so the preference can be tuned | read at source | Saxena et al. 2008, section VII |
| 11 | **Orientation discrepancy:** eq. (11) as printed pairs a1 = 10 with d < 0 (early) and a2 = 13 with d >= 0 (late), which taken literally punishes EARLY harder. Figure 9 shows about 46 at -50 and about 147 at +50, i.e. early divides by 13 and late by 10, matching the prose. The engine follows the figure and the prose. Teach the discrepancy on p7 as a reading lesson; never say the paper "has a typo" - say the printed pairing and the figure disagree and the figure matches the stated intent | read at source (equation and Figure 9 rendered and inspected) | Saxena et al. 2008, eq. 11, Figure 9 |
| 12 | Saxena et al. also argue for weighting short true RULs more and for a correlation metric, because a summed score can hide uneven performance across units | read at source | Saxena et al. 2008, section VII |
| 13 | Minimum run length in FD001 train is 128 cycles (computed here, and stated as the reason for a 125 cap in fact 15) | read at source + computed | FD001 train; Tsurkan et al. 2025 |
| 14 | Piecewise-linear RUL target with maximum 130: "We use piece-wise linear RUL as the target function, where the maximal RUL is 130" | read at source | Zhou et al. 2020, arXiv 2008.03961 |
| 15 | Early-RUL threshold 125 "based on the minimum run length of 128 cycles observed in the training data"; the cap means the model is "only asked to track the RUL once the engine approaches end of life" | read at source | Tsurkan et al. 2025, arXiv 2504.20823 |
| 16 | A survey adopts the piecewise-linear label citing Heimes (2008) and sets the maximum to 125, citing Li, Ding and Sun (2018) | read at source | Wang et al. 2024 survey, arXiv 2409.19629 |
| 17 | Heimes (2008) introduced the piecewise-linear target for PHM08 RNNs; the cap value Heimes himself used was NOT read (IEEE, not open) | reported | citations in facts 14-16; DOI 10.1109/PHM.2008.4711422 |
| 18 | One thesis notes 130 was chosen on FD001 and "extended to other subsets ... without sufficient justification" | reported (search summary only) | Cranfield thesis via search; not read. Do not quote. |
| 19 | Rubin (1976): ignoring the process that causes missing data is appropriate for sampling-distribution inference when the data are "missing at random" and "observed at random"; for likelihood or Bayesian inference when missing at random and the missingness parameter is "distinct"; these are "the weakest general conditions" | read at source (abstract only) | Rubin 1976, Biometrika 63(3) |
| 20 | The formal definitions of MAR / MCAR and the later name MNAR are in the full paper and later texts, not the abstract | reported | the abstract does not define them |
| 21 | NIST IR 8259A core baseline, six device capabilities: Device Identification; Device Configuration; Data Protection; Logical Access to Interfaces; Software Update; Cybersecurity State Awareness. "The core baseline's role is as a default for minimally securable devices" and it "does not specify how" capabilities are achieved | read at source | NIST IR 8259A (May 2020) PDF |
| 22 | NIST SP 800-213 (Nov 2021) frames IoT device cybersecurity requirements for federal organisations from the device's place in a larger system | read at source (abstract page) | NIST SP 800-213 page |
| 23 | A third party with smart-meter data "may gain insights into users' activities and behaviors, and determine, for example, a user's presence at home, her religious beliefs, disabilities, illnesses, and even the TV channel she is watching" | read at source, verbatim | Giaconi, Gunduz, Poor 2018, arXiv 1802.01166 |
| 24 | Molina-Markham et al. (2010) "Private memoirs of a smart meter" showed activity inference from meter data | reported (abstract not readable: publisher blocked, metadata elides it) | DOI 10.1145/1878431.1878446 |
| 25 | ISA/IEC 62443 and the Purdue reference model as OT network-zoning vocabulary | reported (standards behind a paywall; not read) | name only, no claims |

**Contested or moving, taught as disagreement, never resolved:**

- **The cap: 125 or 130?** Both are in current use (facts 14-16); the originator's value was not
  read (fact 17). The bench defaults to 125 and prints the 130 rung. Pages say "a convention,
  chosen on this subset; it is a modelling choice, not a law of engines".
- **Which way does the score lean?** The printed equation and the figure disagree (fact 11). Teach
  how to settle it (the stated intent and the plotted curve agree) and that every later paper the
  reader meets may have picked either.
- **One summed score or several numbers?** The paper itself argues for more than one (fact 12).
  The bench prints RMSE, score, bias and late share; pages never crown one.

## Coverage per session

`✓` taught to working depth. `◐` named and handed on.

### Leader track (files `courses/a1-...` to `a6-...`)

| Session | Covers | May quote |
|---|---|---|
| a1 The sensor is the source of truth until it drifts | What a sensor row is; noise, drift, flat channels; health index not given; a run-to-failure fleet; the cost of being wrong both ways; not purchasing or investment advice | facts 1-3, 7, 8; flat list; life 128-362 |
| a2 Missing is never random | Rubin's ignorability idea at leader depth; dropout when conditions are worst; deletion makes the engine look healthier | facts 19-20; anti-lever 3,073 rows, RMSE 23.64 to 24.89, score 3,366 to 4,656 |
| a3 A false alarm stops the line | Early vs late cost; the asymmetric score as a business choice; one number hides uneven units | facts 10-12; rung table; baseline 305,167 |
| a4 The home is a sensor network | Household as the unit, inferred occupancy, the privacy line; seam to GDPR / PDPA | facts 23-24; Flat 4B 93.0 percent, 12 of 14 |
| a5 Why the warehouse playbook breaks here | Source, identity, ground truth, feedback loop, cost of being wrong, each a figure; device baseline (fact 21) as the "source" contrast | facts 7, 9, 11, 21; break button 40.41 / 46,145 |
| a6 From warehouse to plant floor: the transfer map | Carries over / must learn / must unlearn; 90-day ladder on official sources (NASA PCoE, NIST, PHM Society open proceedings) | facts 4, 21, 22 |
| Anomaly detectors | `learn-anomaly-detection` b7, a5 | ◐ |
| Law | `learn-gdpr`, `learn-pdpa-dnc` | ◐ |

### Practitioner track (files `courses/p1-...` to `p10-...`)

| Session | Covers | May quote |
|---|---|---|
| p1 Reading a turbofan run as a dataset | Rows, cycles, units, settings, 21 channels, the 7 flat ones, quantisation, run-to-failure vs truncated test | facts 1-6; flat list; life stats; quantisation steps |
| p2 Clocks, sampling and resampling | Sampling rate, cycle vs wall clock, skew between channels, resampling up and down, aliasing; seam to streaming 04/05 | constructed widget only; "your numbers will differ" |
| p3 Channel triage: flat, noisy and drifting | The triage table; r as one lens; s9/s14 late change with a direction split; seam to observability b5 | triage table |
| p4 From many channels to one health index | Standardise, weight, one number; the paper's margin-based index vs a learned one | fact 7; rung 2 24.00 / 3,542 |
| p5 Remaining useful life as a target | Uncapped vs capped; the 125/130 convention; mean-life baseline | facts 13-17; rungs 0, 1, 2 and cap 130 |
| p6 Missing not at random, planted | The planting, the declared threshold and probability, deletion, the two-number move | anti-lever numbers; facts 19-20 |
| p7 The asymmetric score | The formula, the orientation discrepancy, why the baseline scores 305,167, the score-vs-RMSE gap | facts 10-12; all rungs |
| p8 Edge or cloud: a bandwidth and latency budget | The calculator; 179,200 bit/s, 150x, 490 vs 140 ms; device baseline as a requirement list | edge canon; facts 21-22 |
| p9 Smart home telemetry: occupancy and where to stop | Flat 4B trace, the threshold, what it reveals, consent, the household is not a user | household canon; facts 23-24 |
| p10 The remaining-useful-life bench | Every rung live, the anti-lever, the break button, the trailing-mean contrast, the cap toggle | the whole ladder table |

## Not covered, by design

- **FD002-FD004, the multi-condition subsets and N-CMAPSS (data set 17).** One condition keeps the
  mechanism visible; operating-regime normalisation is self-study.
- **The NASA test and RUL files.** Held-out training engines stand in (sample budget).
- **Deep learning for RUL** (CNN, LSTM, transformer, graph models). The literature's numbers come
  from many protocols and are not comparable to this bench; none is quoted.
- **Physics-based and hybrid prognostics, uncertainty intervals on RUL.** Named only.
- **Industrial protocols, controllers, historians and networks; any vendor or platform.** OT/IT
  vocabulary appears only as reported names (fact 25).
- **Legal advice.** Law lives in the GDPR and PDPA courses.
- **Real engines, real plants, real households, named incidents.** None.

## Re-verify before delivery

The engine is seeded and deterministic. If `assets/iot-live.js` or `assets/iot-sample.js` changes:
1. `node materials/iot_canon.js <repo> <scratch>/iot_canon.json` (exit 0 = selfTest passes AND
   every planted fault fails a check);
2. `python3 -I materials/iot_reference.py <repo> --compare <scratch>/iot_canon.json` (exit 0 =
   AGREE);
3. update every number in this file before touching a page.
To rebuild the sample: `python3 -I materials/build_iot_sample.py <train_FD001.txt>
<repo>/assets/iot-sample.js` from the NASA zip (data set 6), downloaded into an empty directory.

## Citation appendix (exact form for every page)

1. Saxena, A., Goebel, K., Simon, D., and Eklund, N. (2008). "Damage Propagation Modeling for
   Aircraft Engine Run-to-Failure Simulation." Proceedings of the 1st International Conference on
   Prognostics and Health Management (PHM08), Denver, CO. Read at source (the PDF ships inside the
   NASA data set zip).
2. Saxena, A., and Goebel, K. (2008). "Turbofan Engine Degradation Simulation Data Set." NASA
   Prognostics Data Repository, NASA Ames Research Center, Moffett Field, CA. Read at source:
   https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/
3. Rubin, D. B. (1976). "Inference and Missing Data." Biometrika 63(3), 581-592.
   DOI 10.1093/biomet/63.3.581. Abstract read at source.
4. Heimes, F. O. (2008). "Recurrent Neural Networks for Remaining Useful Life Estimation."
   2008 International Conference on Prognostics and Health Management. DOI
   10.1109/PHM.2008.4711422. Reported (not read).
5. Zhou, Y., Gao, Y., Huang, Y., Hefenbrock, M., Riedel, T., and Beigl, M. (2020). "Automatic
   Remaining Useful Life Estimation Framework with Embedded Convolutional LSTM as the Backbone."
   arXiv 2008.03961. Read at source.
6. Tsurkan, O., Konstantinova, A., Senokosov, A., Sagingalieva, A., and Melnikov, A. (2025).
   "Hybrid quantum recurrent neural network for remaining useful life prediction of turbofan
   engines." arXiv 2504.20823. Read at source.
7. Wang, Y., Wu, M., Li, X., Xie, L., and Chen, Z. (2024). "A Survey on Graph Neural Networks for
   Remaining Useful Life Prediction: Methodologies, Evaluation and Future Trends." arXiv
   2409.19629. Read at source.
8. Fagan, M., Megas, K., Scarfone, K., and Smith, M. (2020). "IoT Device Cybersecurity Capability
   Core Baseline." NIST IR 8259A. DOI 10.6028/NIST.IR.8259A. Read at source.
9. Fagan, M., Marron, J., Brady, K., Cuthill, B., Megas, K., Herold, R., Lemire, D., and Hoehn, B.
   (2021). "IoT Device Cybersecurity Guidance for the Federal Government: Establishing IoT Device
   Cybersecurity Requirements." NIST SP 800-213. Abstract page read at source:
   https://csrc.nist.gov/pubs/sp/800/213/final
10. Giaconi, G., Gunduz, D., and Poor, H. V. (2018). "Privacy-Aware Smart Metering: Progress and
    Challenges." arXiv 1802.01166 (IEEE Signal Processing Magazine). Read at source.
11. Molina-Markham, A., Shenoy, P., Fu, K., Cecchet, E., and Irwin, D. (2010). "Private Memoirs of
    a Smart Meter." BuildSys '10, pp. 61-66. DOI 10.1145/1878431.1878446. Reported (not read).

### Attribution note for rung 2 (added 2026-10-10, p4 agent, weights checked to 5.7e-14)

Rung 2 ("health index, capped at 125") beats rung 1 (30.50 / 28,557 -> 24.00 / 3,542) because of the
CAPPED LABEL and the clamp, not because the channels were combined into one number: dividing the
target by 125 changes no prediction. Never write that "the health index" cut the error; write that
capping the target (and clamping) did. 49 of the 300 cut points sit above the cap and rung 2 predicts
all 49 early. Engine 96 runs against the fleet: rung 1 beats rung 2 on it alone.

### The anti-lever depends on the score's lean (added 2026-10-10, p7 agent)

With the engine's default lean (late divided by 10, early by 13, following the paper's Figure 9 and
prose), the planted dropout makes BOTH numbers worse (RMSE 23.64 -> 24.89, score 3,366 -> 4,656).
With the constants swapped (aEarly 10, aLate 13: the printed eq. 11 read literally), the score ranks
the dropout rung FIRST at seed 2008 (4,315.57; p7 quotes the full swapped column) and beat rung 3 at
seeds 1, 7 and 42 too. So "deletion makes the score worse" holds only under the late-is-worse lean.
RMSE gets worse under both. Any page claiming the anti-lever must name the lean, or quote RMSE.
