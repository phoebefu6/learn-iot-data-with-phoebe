"""Python reference for assets/iot-live.js: same sample, same seeded draws, same arithmetic order.

Usage:
  python3 -I iot_reference.py <repo>                  # run the whole ladder, print canon
  python3 -I iot_reference.py <repo> --compare FILE   # compare with node's canon JSON
                                                       # (node materials/iot_canon.js <repo> FILE)
Agreement rule: every headline number within 1e-6 relative, every per-cut prediction of the
top rung within 1e-6 absolute, identical cut draws. Exit 1 on any disagreement.

Data: NASA C-MAPSS FD001 train (real public rows from NASA's simulation, not real engines),
quantised by materials/build_iot_sample.py into assets/iot-sample.js.
"""
import json, math, os, re, sys

M32 = 0xFFFFFFFF


def to_i32(x):
    x &= M32
    return x - (1 << 32) if x & 0x80000000 else x


def imul(a, b):
    return to_i32(a * b)


def mulberry32(seed):
    st = [to_i32(seed)]

    def rnd():
        a = to_i32(st[0] + 0x6D2B79F5)
        st[0] = a
        t = imul(a ^ ((a & M32) >> 15), 1 | a)
        t = to_i32(to_i32(t + imul(t ^ ((t & M32) >> 7), 61 | t)) ^ t)
        return ((t ^ ((t & M32) >> 14)) & M32) / 4294967296.0
    return rnd


def load_sample(repo):
    s = open(os.path.join(repo, "assets", "iot-sample.js"), encoding="utf-8").read()
    return json.loads(re.search(r"var IOT_SAMPLE = (\{.*\});\n", s, re.S).group(1))


DEFAULTS = dict(seed=2008, holdout=30, cuts=10, rulMin=10, rulMax=150, minSeen=31, cap=125,
                window=10, ridge=1e-6, mnarCh="s4", mnarQuantile=0.8, mnarP=0.7,
                aEarly=13.0, aLate=10.0)


def decode(sample):
    A = sample["alphabet"]
    idx = {c: i for i, c in enumerate(A)}
    chans = sample["channels"]
    units = []
    for u in sample["units"]:
        cols = []
        for k, ch in enumerate(chans):
            m = sample["meta"][ch]
            cols.append([m["lo"] + idx[c] * m["step"] for c in u["c"][k]])
        rows = [[cols[k][t] for k in range(len(chans))] for t in range(u["n"])]
        units.append({"u": u["u"], "n": u["n"], "rows": rows, "cyc": list(range(1, u["n"] + 1))})
    return units


def shuffle(arr, rnd):
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(math.floor(rnd() * (i + 1)))
        a[i], a[j] = a[j], a[i]
    return a


def split_and_cuts(units, o):
    """Seeded split: the first `holdout` shuffled engines are held out; each gets `cuts` cut points
    with true RUL drawn uniformly in [rulMin, min(rulMax, life - minSeen)] (the PHM08 test RULs
    ran from 10 to 150, Saxena et al. 2008)."""
    rnd = mulberry32(o["seed"])
    ids = shuffle([u["u"] for u in units], rnd)
    test_ids = ids[:o["holdout"]]
    cuts = []
    for uid in test_ids:
        n = units[uid - 1]["n"]
        hi = min(o["rulMax"], n - o["minSeen"])
        for _ in range(o["cuts"]):
            r = o["rulMin"] + int(math.floor(rnd() * (hi - o["rulMin"] + 1)))
            cuts.append({"u": uid, "cut": n - r, "rul": r})
    return ids[o["holdout"]:], test_ids, cuts


def phm_score(d, a_early, a_late):
    """PHM08 asymmetric score for one unit, d = estimated RUL - true RUL. Early (d < 0) divides
    by 13, late (d >= 0) by 10, as Figure 9 and the prose of Saxena et al. (2008) show. Eq. (11)
    as printed pairs a1 = 10 with d < 0, which would punish EARLY harder; the figure (about 46
    at -50, about 147 at +50) settles the orientation."""
    return math.exp(-d / a_early) - 1.0 if d < 0 else math.exp(d / a_late) - 1.0


def solve(A, b):
    n = len(b)
    M = [list(A[i]) + [b[i]] for i in range(n)]
    for c in range(n):
        p = c
        for r in range(c + 1, n):
            if abs(M[r][c]) > abs(M[p][c]):
                p = r
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for r in range(n - 1, -1, -1):
        s = M[r][n]
        for k in range(r + 1, n):
            s -= M[r][k] * x[k]
        x[r] = s / M[r][r]
    return x


def fit_ols(X, y, ridge):
    p = len(X[0]) + 1
    A = [[0.0] * p for _ in range(p)]
    b = [0.0] * p
    for i in range(len(X)):
        z = [1.0] + X[i]
        for a in range(p):
            za = z[a]
            b[a] += za * y[i]
            for c in range(a, p):
                A[a][c] += za * z[c]
    for a in range(p):
        for c in range(a):
            A[a][c] = A[c][a]
        if a > 0:
            A[a][a] += ridge * len(X)
    return solve(A, b)


def predict(w, x):
    s = w[0]
    for k in range(len(x)):
        s += w[k + 1] * x[k]
    return s


def prepare(units, o, mode):
    """Observed rows after planting. clean | mnar (hot readings vanish, rows with gaps dropped) |
    shuffle (cycle order shuffled inside each engine; RUL labels stay by position)."""
    info = {}
    if mode == "mnar":
        ci = o["_chans"].index(o["mnarCh"])
        allv = sorted(r[ci] for u in units for r in u["rows"])
        thr = allv[int(math.floor(o["mnarQuantile"] * (len(allv) - 1)))]
        rnd = mulberry32(o["seed"] + 7)
        out, dropped, total = [], 0, 0
        for u in units:
            kr, kc = [], []
            for t, r in enumerate(u["rows"]):
                total += 1
                if r[ci] >= thr and rnd() < o["mnarP"]:
                    dropped += 1
                else:
                    kr.append(r)
                    kc.append(u["cyc"][t])
            out.append({"u": u["u"], "n": u["n"], "rows": kr, "cyc": kc})
        info = {"threshold": thr, "dropped": dropped, "total": total}
        return out, info
    if mode == "shuffle":
        rnd = mulberry32(o["seed"] + 13)
        out = []
        for u in units:
            order = shuffle(list(range(u["n"])), rnd)
            out.append({"u": u["u"], "n": u["n"], "rows": [u["rows"][i] for i in order], "cyc": list(u["cyc"])})
        return out, info
    return units, info


def standardiser(units, train_ids):
    k = len(units[0]["rows"][0])
    s, q, n = [0.0] * k, [0.0] * k, 0
    for uid in train_ids:
        for r in units[uid - 1]["rows"]:
            n += 1
            for j in range(k):
                s[j] += r[j]
    mu = [x / n for x in s]
    for uid in train_ids:
        for r in units[uid - 1]["rows"]:
            for j in range(k):
                d = r[j] - mu[j]
                q[j] += d * d
    sd = [math.sqrt(x / n) if x > 0 else 1.0 for x in q]
    return mu, sd


def zrow(r, mu, sd):
    return [(r[j] - mu[j]) / sd[j] for j in range(len(r))]


def local_line(h, W):
    """Value at the newest point of the least-squares line through the last W values: smooths
    noise without the lag a trailing mean adds to a signal that only moves one way."""
    seg = h[-W:]
    n = len(seg)
    if n < 3:
        return seg[-1]
    mx = (n - 1) / 2.0
    my = 0.0
    for v in seg:
        my += v
    my /= n
    sxx = 0.0
    sxy = 0.0
    for i in range(n):
        sxx += (i - mx) * (i - mx)
        sxy += (i - mx) * (seg[i] - my)
    return my + sxy / sxx * (n - 1 - mx)


def trailing_mean(h, W):
    seg = h[-W:]
    s = 0.0
    for v in seg:
        s += v
    return s / len(seg)


def run_rung(units_obs, train_ids, cuts, o, rung):
    """rung: mean | linear | hi | smooth | trailing."""
    mu, sd = standardiser(units_obs, train_ids)
    lives = [units_obs[uid - 1]["n"] for uid in train_ids]
    mean_life = sum(lives) / len(lives)
    cap = o["cap"]
    w = None
    if rung != "mean":
        X, y = [], []
        for uid in train_ids:
            u = units_obs[uid - 1]
            for t, r in enumerate(u["rows"]):
                rul = u["n"] - u["cyc"][t]
                X.append(zrow(r, mu, sd))
                y.append(float(rul) if rung == "linear" else min(rul, cap) / cap)
        w = fit_ols(X, y, o["ridge"])
    preds = []
    for c in cuts:
        u = units_obs[c["u"] - 1]
        if rung == "mean":
            preds.append(max(mean_life - c["cut"], 0.0))
            continue
        last = -1
        for t in range(len(u["cyc"])):
            if u["cyc"][t] <= c["cut"]:
                last = t
        if rung in ("linear", "hi"):
            v = predict(w, zrow(u["rows"][last], mu, sd))
        else:
            lo = max(0, last + 1 - o["window"])
            h = [predict(w, zrow(u["rows"][t], mu, sd)) for t in range(lo, last + 1)]
            v = local_line(h, o["window"]) if rung == "smooth" else trailing_mean(h, o["window"])
        preds.append(max(v, 0.0) if rung == "linear" else min(max(v, 0.0), 1.0) * cap)
    return summarise(preds, cuts, o, mean_life, w)


def summarise(preds, cuts, o, mean_life, w):
    n = len(cuts)
    se = sc = bias = 0.0
    late = 0
    for i, c in enumerate(cuts):
        d = preds[i] - c["rul"]
        se += d * d
        sc += phm_score(d, o["aEarly"], o["aLate"])
        bias += d
        if d > 0:
            late += 1
    return {"rmse": math.sqrt(se / n), "score": sc, "scorePerUnit": sc / n, "bias": bias / n,
            "lateShare": late / n, "n": n, "preds": preds, "meanLife": mean_life, "w": w}


def triage(sample):
    """Mirror of IOT.triage: Pearson r with cycles-to-failure and within-engine noise share."""
    units = decode(sample)
    out = []
    for k, ch in enumerate(sample["channels"]):
        n = 0
        sx = sy = 0.0
        for u in units:
            for t in range(u["n"]):
                n += 1
                sx += u["rows"][t][k]
                sy += u["n"] - u["cyc"][t]
        mx, my = sx / n, sy / n
        sxx = syy = sxy = dd = 0.0
        nd = 0
        for u in units:
            for t in range(u["n"]):
                dx = u["rows"][t][k] - mx
                dy = (u["n"] - u["cyc"][t]) - my
                sxx += dx * dx
                syy += dy * dy
                sxy += dx * dy
                if t > 0:
                    df = u["rows"][t][k] - u["rows"][t - 1][k]
                    dd += df * df
                    nd += 1
        sd_all = math.sqrt(sxx / n)
        noise = math.sqrt(dd / nd) / math.sqrt(2)
        out.append({"ch": ch, "r": round(sxy / math.sqrt(sxx * syy), 4), "noiseShare": round(noise / sd_all, 4)})
    return out


def household(seed=909):
    """Mirror of IOT.household (CONSTRUCTED trace, labelled constructed on every page)."""
    rnd = mulberry32(seed)
    days, S = 14, 96
    watts, truth, plan = [], [], []
    fl = lambda x: int(math.floor(x))
    for d in range(days):
        weekend = (d % 7) >= 5
        p = {}
        if not weekend:
            p["wake"] = 26 + fl(rnd() * 5); p["leave"] = p["wake"] + 4 + fl(rnd() * 3)
            p["back"] = 70 + fl(rnd() * 9); p["sleep"] = 90 + fl(rnd() * 5)
        else:
            p["wake"] = 30 + fl(rnd() * 9); p["leave"] = 44 + fl(rnd() * 17)
            p["back"] = p["leave"] + 8 + fl(rnd() * 9); p["sleep"] = 92 + fl(rnd() * 4)
        p["timer"] = 36 + fl(rnd() * 29) if rnd() < 0.35 else -1
        plan.append(p)
        for s in range(S):
            awake = p["wake"] <= s < p["sleep"] and not (p["leave"] <= s < p["back"])
            w = 95 + fl(rnd() * 60)
            if awake:
                w += 40 + fl(rnd() * 260)
                if s == p["wake"] + 1:
                    w += 600
                if s == p["back"] + 3 or s == p["back"] + 4:
                    w += 800
            if p["timer"] >= 0 and p["timer"] <= s < p["timer"] + 3:
                w += 500
            watts.append(w)
            truth.append(1 if awake else 0)
    inferred, hit, leave_err = [], 0, []
    for d in range(days):
        day = watts[d * S:(d + 1) * S]
        base = sorted(day)[fl(0.1 * (S - 1))]
        for s in range(S):
            on = 1 if day[s] > base + 120 else 0
            inferred.append(on)
            hit += on == truth[d * S + s]
        first, best, best_start, run, run_start = -1, 0, -1, 0, -1
        for s in range(80):
            a = inferred[d * S + s]
            if a and first < 0:
                first = s
            if first < 0:
                continue
            if not a:
                if run == 0:
                    run_start = s
                run += 1
                if run > best:
                    best, best_start = run, run_start
            else:
                run = 0
        leave_err.append(abs(best_start - plan[d]["leave"]) * 15)
    se = sorted(leave_err)
    return {"accuracy": hit / (days * S), "leaveWithin30": sum(1 for e in leave_err if e <= 30),
            "leaveMedianErrMin": (se[6] + se[7]) / 2, "leaveErrMin": leave_err}


RUNGS = ["mean", "linear", "hi", "smooth", "trailing", "mnarSmooth", "shuffleSmooth", "cap130Smooth"]


def ladder(sample, opts=None):
    o = dict(DEFAULTS)
    o.update(opts or {})
    o["_chans"] = sample["channels"]
    units = decode(sample)
    train_ids, test_ids, cuts = split_and_cuts(units, o)
    res = {"cuts": cuts, "testIds": test_ids}
    for rung in ["mean", "linear", "hi", "smooth", "trailing"]:
        res[rung] = run_rung(units, train_ids, cuts, o, rung)
    mn, info = prepare(units, o, "mnar")
    res["mnarSmooth"] = run_rung(mn, train_ids, cuts, o, "smooth")
    res["mnar"] = info
    sh, _ = prepare(units, o, "shuffle")
    res["shuffleSmooth"] = run_rung(sh, train_ids, cuts, o, "smooth")
    res["cap130Smooth"] = run_rung(units, train_ids, cuts, dict(o, cap=130), "smooth")
    return res


def headline(res):
    out = {k: {x: res[k][x] for x in ["rmse", "score", "scorePerUnit", "bias", "lateShare", "n"]} for k in RUNGS}
    out["mnarDropped"] = res["mnar"]["dropped"]
    out["mnarTotal"] = res["mnar"]["total"]
    out["mnarThreshold"] = res["mnar"]["threshold"]
    out["meanLife"] = res["mean"]["meanLife"]
    return out


if __name__ == "__main__":
    repo = sys.argv[1]
    res = ladder(load_sample(repo))
    h = headline(res)
    for k in RUNGS:
        v = h[k]
        print(f"{k:14} RMSE {v['rmse']:8.3f}  score {v['score']:10.2f}  per-unit {v['scorePerUnit']:8.3f}  "
              f"bias {v['bias']:+7.2f}  late {v['lateShare']:.3f}  n {v['n']}")
    for k in ["mnarDropped", "mnarTotal", "mnarThreshold", "meanLife"]:
        print(k, h[k])
    if "--compare" in sys.argv:
        node = json.load(open(sys.argv[sys.argv.index("--compare") + 1]))
        worst, bad = 0.0, []
        for k in RUNGS:
            for f, x in h[k].items():
                y = node["headline"][k][f]
                rel = abs(x - y) / max(1e-12, abs(x))
                worst = max(worst, rel)
                if rel > 1e-6:
                    bad.append((k, f, x, y))
        for k in ["mnarDropped", "mnarTotal", "mnarThreshold", "meanLife"]:
            if abs(h[k] - node["headline"][k]) > 1e-9:
                bad.append((k, h[k], node["headline"][k]))
        tri = triage(load_sample(repo))
        for a, b in zip(tri, node["triage"]):
            if a["ch"] != b["ch"] or abs(a["r"] - b["r"]) > 1e-9 or abs(a["noiseShare"] - b["noiseShare"]) > 1e-9:
                bad.append(("triage", a, b))
        hh = household()
        for f in ["accuracy", "leaveWithin30", "leaveMedianErrMin", "leaveErrMin"]:
            if hh[f] != node["household"][f]:
                bad.append(("household", f, hh[f], node["household"][f]))
        print(f"triage 14 channels and constructed household checked: household accuracy {hh['accuracy']:.4f}, "
              f"leave within 30 min {hh['leaveWithin30']} of 14")
        dmax = max(abs(a - b) for a, b in zip(res["smooth"]["preds"], node["smoothPreds"]))
        same_cuts = node["cuts"] == res["cuts"]
        print(f"compare: worst relative diff {worst:.3e}; max per-cut diff (smooth) {dmax:.3e}; cuts identical: {same_cuts}")
        ok = not bad and dmax < 1e-6 and same_cuts
        print("AGREE" if ok else "DISAGREE " + repr(bad[:5]))
        sys.exit(0 if ok else 1)
