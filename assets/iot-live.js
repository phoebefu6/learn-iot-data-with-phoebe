/* iot-live.js - the computed engine for learn-iot-data-with-phoebe, by Phoebe Fu.
   One file for node and the browser. Python mirror: materials/iot_reference.py (must agree).

   Real part: NASA C-MAPSS FD001 train (assets/iot-sample.js), real public rows from NASA's
   simulation, not real engines. Saxena and Goebel (2008), NASA Prognostics Data Repository.
   Modelled parts (always labelled on the widget): the seeded hold-out split and cut points, the
   planted missing-not-at-random dropout, the cycle shuffle, the constructed household trace
   (household) and the constructed edge-or-cloud budget (edgeBudget).

   Ladder: mean-life baseline -> linear fit on raw channels -> health index + capped RUL target
   -> + lag-free smoothing (local line over the last W health-index values). Every rung prints
   RMSE and the PHM08 asymmetric score side by side. Anti-lever: plant MNAR dropout of the
   hottest T50 readings, then drop rows with gaps. Break button: shuffle cycle order inside each
   engine. selfTest() runs on load; each check is proven to fail on a reintroduced fault.
*/
(function (root) {
  "use strict";

  var FAULT = null; // set only inside selfTest to prove a check can fail

  var DEFAULTS = {
    seed: 2008, holdout: 30, cuts: 10, rulMin: 10, rulMax: 150, minSeen: 31, cap: 125,
    window: 10, ridge: 1e-6, mnarCh: "s4", mnarQuantile: 0.8, mnarP: 0.7,
    aEarly: 13, aLate: 10
  };

  function extend(a, b) {
    var o = {}, k;
    for (k in a) o[k] = a[k];
    if (b) for (k in b) o[k] = b[k];
    return o;
  }

  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  var _decoded = null, _decodedFrom = null;
  function decode(sample) {
    if (_decodedFrom === sample && _decoded) return _decoded;
    var A = sample.alphabet, idx = {}, i, k, t;
    for (i = 0; i < A.length; i++) idx[A.charAt(i)] = i;
    var chans = sample.channels, units = [];
    for (i = 0; i < sample.units.length; i++) {
      var u = sample.units[i], cols = [];
      for (k = 0; k < chans.length; k++) {
        var m = sample.meta[chans[k]], s = u.c[k], col = new Array(u.n);
        for (t = 0; t < u.n; t++) col[t] = m.lo + idx[s.charAt(t)] * m.step;
        cols.push(col);
      }
      var rows = new Array(u.n), cyc = new Array(u.n);
      for (t = 0; t < u.n; t++) {
        var r = new Array(chans.length);
        for (k = 0; k < chans.length; k++) r[k] = cols[k][t];
        rows[t] = r; cyc[t] = t + 1;
      }
      units.push({ u: u.u, n: u.n, rows: rows, cyc: cyc });
    }
    _decoded = units; _decodedFrom = sample;
    return units;
  }

  function splitAndCuts(units, o) {
    var rnd = mulberry32(o.seed);
    var ids = shuffle(units.map(function (u) { return u.u; }), rnd);
    var testIds = ids.slice(0, o.holdout), cuts = [];
    for (var i = 0; i < testIds.length; i++) {
      var uid = testIds[i], n = units[uid - 1].n;
      var hi = Math.min(o.rulMax, n - o.minSeen);
      for (var k = 0; k < o.cuts; k++) {
        var r = o.rulMin + Math.floor(rnd() * (hi - o.rulMin + 1));
        cuts.push({ u: uid, cut: n - r, rul: r });
      }
    }
    return { trainIds: ids.slice(o.holdout), testIds: testIds, cuts: cuts };
  }

  // PHM08 asymmetric score for one unit, d = estimated RUL - true RUL. Early (d < 0) divides by
  // 13, late (d >= 0) by 10: Figure 9 and the prose of Saxena et al. (2008). Eq. (11) as printed
  // pairs a1 = 10 with d < 0, which would punish early harder; the figure settles it.
  function phmScore(d, aEarly, aLate) {
    if (FAULT === "swapScore") { var x = aEarly; aEarly = aLate; aLate = x; }
    return d < 0 ? Math.exp(-d / aEarly) - 1 : Math.exp(d / aLate) - 1;
  }

  function solve(A, b) {
    var n = b.length, M = [], r, c, k;
    for (r = 0; r < n; r++) M.push(A[r].slice().concat([b[r]]));
    for (c = 0; c < n; c++) {
      var p = c;
      for (r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      for (r = c + 1; r < n; r++) {
        var f = M[r][c] / M[c][c];
        for (k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    var x = new Array(n);
    for (r = n - 1; r >= 0; r--) {
      var s = M[r][n];
      for (k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / M[r][r];
    }
    return x;
  }

  function fitOLS(X, y, ridge) {
    var p = X[0].length + 1, A = [], b = [], i, a, c;
    for (a = 0; a < p; a++) { A.push(new Array(p).fill(0)); b.push(0); }
    for (i = 0; i < X.length; i++) {
      var z = [1].concat(X[i]);
      for (a = 0; a < p; a++) {
        var za = z[a];
        b[a] += za * y[i];
        var Aa = A[a];
        for (c = a; c < p; c++) Aa[c] += za * z[c];
      }
    }
    for (a = 0; a < p; a++) {
      for (c = 0; c < a; c++) A[a][c] = A[c][a];
      if (a > 0) A[a][a] += ridge * X.length;
    }
    return solve(A, b);
  }

  function predict(w, x) {
    var s = w[0];
    for (var k = 0; k < x.length; k++) s += w[k + 1] * x[k];
    return s;
  }

  // clean | mnar (hot readings vanish with probability mnarP, rows with gaps dropped) |
  // shuffle (cycle order shuffled inside each engine; RUL labels stay by position)
  function prepare(units, o, mode, chans) {
    var out = [], info = {}, i, t;
    if (mode === "mnar") {
      var ci = chans.indexOf(o.mnarCh), allv = [];
      for (i = 0; i < units.length; i++) for (t = 0; t < units[i].rows.length; t++) allv.push(units[i].rows[t][ci]);
      allv.sort(function (x, y) { return x - y; });
      var thr = allv[Math.floor(o.mnarQuantile * (allv.length - 1))];
      var rnd = mulberry32(o.seed + 7), dropped = 0, total = 0;
      for (i = 0; i < units.length; i++) {
        var u = units[i], kr = [], kc = [];
        for (t = 0; t < u.rows.length; t++) {
          total++;
          var hot = FAULT === "mnarAll" ? true : u.rows[t][ci] >= thr;
          if (hot && rnd() < o.mnarP) dropped++;
          else { kr.push(u.rows[t]); kc.push(u.cyc[t]); }
        }
        out.push({ u: u.u, n: u.n, rows: kr, cyc: kc });
      }
      info = { threshold: thr, dropped: dropped, total: total };
      return { units: out, info: info };
    }
    if (mode === "shuffle") {
      var rs = mulberry32(o.seed + 13);
      for (i = 0; i < units.length; i++) {
        var uu = units[i], idx = [];
        for (t = 0; t < uu.n; t++) idx.push(t);
        var order = shuffle(idx, rs);
        out.push({ u: uu.u, n: uu.n, rows: order.map(function (j) { return uu.rows[j]; }), cyc: uu.cyc.slice() });
      }
      return { units: out, info: info };
    }
    return { units: units, info: info };
  }

  function standardiser(units, trainIds) {
    var k = units[0].rows[0].length, s = new Array(k).fill(0), q = new Array(k).fill(0), n = 0, i, t, j;
    for (i = 0; i < trainIds.length; i++) {
      var rows = units[trainIds[i] - 1].rows;
      for (t = 0; t < rows.length; t++) { n++; for (j = 0; j < k; j++) s[j] += rows[t][j]; }
    }
    var mu = s.map(function (x) { return x / n; });
    for (i = 0; i < trainIds.length; i++) {
      var rows2 = units[trainIds[i] - 1].rows;
      for (t = 0; t < rows2.length; t++) for (j = 0; j < k; j++) { var d = rows2[t][j] - mu[j]; q[j] += d * d; }
    }
    var sd = q.map(function (x) { return x > 0 ? Math.sqrt(x / n) : 1; });
    return { mu: mu, sd: sd };
  }

  function zrow(r, mu, sd) {
    var z = new Array(r.length);
    for (var j = 0; j < r.length; j++) z[j] = (r[j] - mu[j]) / sd[j];
    return z;
  }

  // Value at the newest point of the least-squares line through the last W values: smooths
  // noise without the lag a trailing mean adds to a signal that only moves one way.
  function localLine(h, W) {
    if (FAULT === "laggedSmoother") return trailingMean(h, W);
    var seg = h.slice(Math.max(0, h.length - W)), n = seg.length, i;
    if (n < 3) return seg[n - 1];
    var mx = (n - 1) / 2, my = 0;
    for (i = 0; i < n; i++) my += seg[i];
    my /= n;
    var sxx = 0, sxy = 0;
    for (i = 0; i < n; i++) { sxx += (i - mx) * (i - mx); sxy += (i - mx) * (seg[i] - my); }
    return my + sxy / sxx * (n - 1 - mx);
  }

  function trailingMean(h, W) {
    var seg = h.slice(Math.max(0, h.length - W)), s = 0;
    for (var i = 0; i < seg.length; i++) s += seg[i];
    return s / seg.length;
  }

  // rung: mean | linear | hi | smooth | trailing
  function runRung(units, trainIds, cuts, o, rung) {
    var st = standardiser(units, trainIds), mu = st.mu, sd = st.sd, i, t;
    var lifeSum = 0;
    for (i = 0; i < trainIds.length; i++) lifeSum += units[trainIds[i] - 1].n;
    var meanLife = lifeSum / trainIds.length, cap = o.cap, w = null;
    if (rung !== "mean") {
      var X = [], y = [];
      for (i = 0; i < trainIds.length; i++) {
        var u = units[trainIds[i] - 1];
        for (t = 0; t < u.rows.length; t++) {
          var rul = u.n - u.cyc[t];
          X.push(zrow(u.rows[t], mu, sd));
          y.push(rung === "linear" ? rul : Math.min(rul, cap) / cap);
        }
      }
      w = fitOLS(X, y, o.ridge);
    }
    var preds = [];
    for (i = 0; i < cuts.length; i++) {
      var c = cuts[i], uc = units[c.u - 1];
      if (rung === "mean") { preds.push(Math.max(meanLife - c.cut, 0)); continue; }
      var last = -1;
      for (t = 0; t < uc.cyc.length; t++) if (uc.cyc[t] <= c.cut) last = t;
      var v;
      if (rung === "linear" || rung === "hi") v = predict(w, zrow(uc.rows[last], mu, sd));
      else {
        var lo = Math.max(0, last + 1 - o.window), h = [];
        for (t = lo; t <= last; t++) h.push(predict(w, zrow(uc.rows[t], mu, sd)));
        v = rung === "smooth" ? localLine(h, o.window) : trailingMean(h, o.window);
      }
      preds.push(rung === "linear" ? Math.max(v, 0) : Math.min(Math.max(v, 0), 1) * cap);
    }
    return summarise(preds, cuts, o, meanLife, w);
  }

  function summarise(preds, cuts, o, meanLife, w) {
    var n = cuts.length, se = 0, sc = 0, bias = 0, late = 0;
    for (var i = 0; i < n; i++) {
      var d = preds[i] - cuts[i].rul;
      se += d * d;
      sc += phmScore(d, o.aEarly, o.aLate);
      bias += d;
      if (d > 0) late++;
    }
    return { rmse: Math.sqrt(se / n), score: sc, scorePerUnit: sc / n, bias: bias / n,
             lateShare: late / n, n: n, preds: preds, meanLife: meanLife, w: w };
  }

  var RUNGS = ["mean", "linear", "hi", "smooth", "trailing", "mnarSmooth", "shuffleSmooth", "cap130Smooth"];

  // The whole ladder. opts.only: optional list of rung keys to compute (the widget's buttons).
  function ladder(sample, opts) {
    var o = extend(DEFAULTS, opts);
    var units = decode(sample), sp = splitAndCuts(units, o);
    var want = o.only || RUNGS, res = { cuts: sp.cuts, testIds: sp.testIds, opts: o };
    function on(k) { return want.indexOf(k) >= 0; }
    ["mean", "linear", "hi", "smooth", "trailing"].forEach(function (r) {
      if (on(r)) res[r] = runRung(units, sp.trainIds, sp.cuts, o, r);
    });
    if (on("mnarSmooth")) {
      var mn = prepare(units, o, "mnar", sample.channels);
      res.mnarSmooth = runRung(mn.units, sp.trainIds, sp.cuts, o, "smooth");
      res.mnar = mn.info;
    }
    if (on("shuffleSmooth")) {
      var sh = prepare(units, o, "shuffle", sample.channels);
      res.shuffleSmooth = runRung(sh.units, sp.trainIds, sp.cuts, o, "smooth");
    }
    if (on("cap130Smooth")) res.cap130Smooth = runRung(units, sp.trainIds, sp.cuts, extend(o, { cap: 130 }), "smooth");
    return res;
  }

  // Channel triage on all 100 engines: drift = Pearson r of the channel with cycles-to-failure;
  // noise share = within-engine cycle-to-cycle spread (sd of first differences / sqrt 2) over the
  // channel's total sd. Flat channels come from the build script (they are not shipped).
  function triage(sample) {
    var units = decode(sample), chans = sample.channels, out = [], k, i, t;
    for (k = 0; k < chans.length; k++) {
      var n = 0, sx = 0, sy = 0;
      for (i = 0; i < units.length; i++) for (t = 0; t < units[i].n; t++) { n++; sx += units[i].rows[t][k]; sy += units[i].n - units[i].cyc[t]; }
      var mx = sx / n, my = sy / n, sxx = 0, syy = 0, sxy = 0, dd = 0, nd = 0;
      for (i = 0; i < units.length; i++) {
        var u = units[i];
        for (t = 0; t < u.n; t++) {
          var dx = u.rows[t][k] - mx, dy = (u.n - u.cyc[t]) - my;
          sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
          if (t > 0) { var df = u.rows[t][k] - u.rows[t - 1][k]; dd += df * df; nd++; }
        }
      }
      var sdAll = Math.sqrt(sxx / n), noise = Math.sqrt(dd / nd) / Math.SQRT2;
      out.push({ ch: chans[k], sym: sample.meta[chans[k]].sym, r: sxy / Math.sqrt(sxx * syy),
                 noiseShare: noise / sdAll, step: sample.meta[chans[k]].step });
    }
    return { kept: out, flat: sample.flat };
  }

  // CONSTRUCTED household meter trace (p9): 14 days of 15-minute average power in watts.
  // Truth = someone awake at home. Inference = reading above the day's 10th percentile + 120 W.
  function household(seed) {
    var rnd = mulberry32(seed == null ? 909 : seed), days = 14, S = 96, watts = [], truth = [], d, s;
    var plan = [];
    for (d = 0; d < days; d++) {
      var weekend = (d % 7) >= 5, p = {};
      if (!weekend) {
        p.wake = 26 + Math.floor(rnd() * 5); p.leave = p.wake + 4 + Math.floor(rnd() * 3);
        p.back = 70 + Math.floor(rnd() * 9); p.sleep = 90 + Math.floor(rnd() * 5);
      } else {
        p.wake = 30 + Math.floor(rnd() * 9); p.leave = 44 + Math.floor(rnd() * 17);
        p.back = p.leave + 8 + Math.floor(rnd() * 9); p.sleep = 92 + Math.floor(rnd() * 4);
      }
      p.timer = rnd() < 0.35 ? 36 + Math.floor(rnd() * 29) : -1;   // a timed appliance, nobody home needed
      p.weekend = weekend; plan.push(p);
      for (s = 0; s < S; s++) {
        var awakeHome = s >= p.wake && s < p.sleep && !(s >= p.leave && s < p.back);
        var w = 95 + Math.floor(rnd() * 60);                       // fridge + standby
        if (awakeHome) {
          w += 40 + Math.floor(rnd() * 260);                       // lights, devices (quiet slots exist)
          if (s === p.wake + 1) w += 600;                          // kettle / breakfast
          if (s === p.back + 3 || s === p.back + 4) w += 800;      // cooking
        }
        if (p.timer >= 0 && s >= p.timer && s < p.timer + 3) w += 500;
        watts.push(w); truth.push(awakeHome ? 1 : 0);
      }
    }
    var inferred = [], hit = 0, leaveErr = [];
    for (d = 0; d < days; d++) {
      var day = watts.slice(d * S, d * S + S), sorted = day.slice().sort(function (x, y) { return x - y; });
      var base = sorted[Math.floor(0.1 * (S - 1))];
      for (s = 0; s < S; s++) {
        var on = day[s] > base + 120 ? 1 : 0;
        inferred.push(on);
        if (on === truth[d * S + s]) hit++;
      }
      // inferred leave: start of the longest quiet run between the first active slot and 20:00
      var first = -1, best = 0, bestStart = -1, run = 0, runStart = -1;
      for (s = 0; s < 80; s++) {
        var a = inferred[d * S + s];
        if (a && first < 0) first = s;
        if (first < 0) continue;
        if (!a) { if (run === 0) runStart = s; run++; if (run > best) { best = run; bestStart = runStart; } }
        else run = 0;
      }
      leaveErr.push(Math.abs(bestStart - plan[d].leave) * 15);
    }
    var within30 = leaveErr.filter(function (e) { return e <= 30; }).length;
    var se = leaveErr.slice().sort(function (x, y) { return x - y; });
    return { slotsPerDay: S, days: days, watts: watts, truth: truth, inferred: inferred, plan: plan,
             accuracy: hit / (days * S), leaveErrMin: leaveErr, leaveWithin30: within30,
             leaveMedianErrMin: (se[6] + se[7]) / 2 };
  }

  // CONSTRUCTED edge-or-cloud budget (p8). All inputs are the learner's; nothing here is a
  // measured figure. bits per second = devices x channels x Hz x bytes x 8.
  function edgeBudget(p) {
    var q = extend({ devices: 40, channels: 14, hz: 10, bytes: 4, linkKbps: 2000,
                     summaryEverySec: 60, summaryBytes: 14 * 4 * 4,
                     sampleToDecisionMs: 500, linkLatencyMs: 120, cloudComputeMs: 150, edgeComputeMs: 40 }, p);
    var rawBps = q.devices * q.channels * q.hz * q.bytes * 8;
    var edgeBps = q.devices * q.summaryBytes * 8 / q.summaryEverySec;
    var cloudPath = 1000 / q.hz + q.linkLatencyMs * 2 + q.cloudComputeMs;
    var edgePath = 1000 / q.hz + q.edgeComputeMs;
    return { inputs: q, rawBps: rawBps, rawUtil: rawBps / (q.linkKbps * 1000), rawGBperDay: rawBps * 86400 / 8 / 1e9,
             edgeBps: edgeBps, edgeUtil: edgeBps / (q.linkKbps * 1000), reduction: rawBps / edgeBps,
             cloudPathMs: cloudPath, edgePathMs: edgePath,
             cloudMeetsDeadline: cloudPath <= q.sampleToDecisionMs, edgeMeetsDeadline: edgePath <= q.sampleToDecisionMs };
  }

  // Each check is a property; selfTest(fault) re-runs them with a fault planted in the REAL
  // functions above, and every listed fault must make at least one check fail.
  function selfTest(fault) {
    FAULT = fault || null;
    var checks = [];
    function chk(name, ok) { checks.push({ name: name, pass: !!ok }); }
    try {
      chk("late costs more than early at equal size", phmScore(20, 13, 10) > phmScore(-20, 13, 10));
      chk("score is zero at d = 0", phmScore(0, 13, 10) === 0);
      var lin = []; for (var i = 0; i < 10; i++) lin.push(0.9 - 0.02 * i);
      chk("smoother has no lag on a straight decline", Math.abs(localLine(lin, 10) - lin[9]) < 1e-12);
      var X = [], y = [], r = mulberry32(5);
      for (var j = 0; j < 50; j++) { var a = r() * 4 - 2, b = r() * 4 - 2; X.push([a, b]); y.push(3 + 2 * a - 0.5 * b); }
      var w = fitOLS(X, y, 0);
      chk("least squares recovers a known line", Math.abs(w[0] - 3) < 1e-9 && Math.abs(w[1] - 2) < 1e-9 && Math.abs(w[2] + 0.5) < 1e-9);
      var rr = mulberry32(2008);
      chk("seeded draws repeat", rr() === 0.28796942136250436);
      var toy = [{ u: 1, n: 6, rows: [[1], [2], [3], [10], [11], [12]], cyc: [1, 2, 3, 4, 5, 6] }];
      var pm = prepare(toy, extend(DEFAULTS, { mnarCh: "x", mnarQuantile: 0.5, mnarP: 1 }), "mnar", ["x"]);
      var keptCool = pm.units[0].rows.filter(function (q) { return q[0] < pm.info.threshold; }).length;
      chk("dropout removes only hot readings", keptCool === 2 && pm.info.dropped === 4);
    } finally { FAULT = null; }
    var pass = checks.every(function (c) { return c.pass; });
    return { pass: pass, fault: fault || null, checks: checks };
  }

  var IOT = {
    DEFAULTS: DEFAULTS, RUNGS: RUNGS, mulberry32: mulberry32, decode: decode, splitAndCuts: splitAndCuts,
    phmScore: phmScore, fitOLS: fitOLS, prepare: prepare, localLine: localLine, trailingMean: trailingMean,
    runRung: runRung, ladder: ladder, triage: triage, household: household, edgeBudget: edgeBudget,
    selfTest: selfTest, FAULTS: ["swapScore", "laggedSmoother", "mnarAll"]
  };

  if (typeof module !== "undefined" && module.exports) module.exports = IOT;
  else {
    root.IOT = IOT;
    try {
      IOT.selfTestResult = selfTest();
      if (!IOT.selfTestResult.pass && root.console) root.console.error("iot-live selfTest failed", IOT.selfTestResult);
    } catch (e) { IOT.selfTestResult = { pass: false, error: String(e) }; }
  }
})(this);
