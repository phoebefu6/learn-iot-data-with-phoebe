// Node canon for learn-iot-data-with-phoebe: loads the SHIPPED engine and sample, runs the whole
// ladder plus triage, the constructed household and edge budget, and the selfTest fault proofs.
// Usage: node materials/iot_canon.js <repo> <out.json>
// Then:  python3 -I materials/iot_reference.py <repo> --compare <out.json>
const path = require("path"), fs = require("fs");
const repo = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const out = process.argv[3] || "iot_canon.json";
const IOT = require(path.join(repo, "assets", "iot-live.js"));
const S = require(path.join(repo, "assets", "iot-sample.js"));

const st = IOT.selfTest();
const faults = IOT.FAULTS.map(f => {
  const r = IOT.selfTest(f);
  return { fault: f, pass: r.pass, failed: r.checks.filter(c => !c.pass).map(c => c.name) };
});
const t0 = Date.now();
const res = IOT.ladder(S);
const ms = Date.now() - t0;
const headline = {};
for (const k of IOT.RUNGS) {
  const r = res[k];
  headline[k] = { rmse: r.rmse, score: r.score, scorePerUnit: r.scorePerUnit, bias: r.bias, lateShare: r.lateShare, n: r.n };
}
headline.mnarDropped = res.mnar.dropped;
headline.mnarTotal = res.mnar.total;
headline.mnarThreshold = res.mnar.threshold;
headline.meanLife = res.mean.meanLife;
const tri = IOT.triage(S);
const hh = IOT.household();
const eb = IOT.edgeBudget();
const lives = S.units.map(u => u.n);
const canon = {
  generated: new Date().toISOString().slice(0, 10),
  selfTest: st, faultProofs: faults, ladderMs: ms,
  data: { units: S.units.length, rows: lives.reduce((a, b) => a + b, 0), minLife: Math.min(...lives),
          maxLife: Math.max(...lives), kept: S.channels, flat: S.flat.map(f => f.ch + " " + f.sym) },
  headline, cuts: res.cuts, testIds: res.testIds, smoothPreds: res.smooth.preds,
  triage: tri.kept.map(c => ({ ch: c.ch, sym: c.sym, r: +c.r.toFixed(4), noiseShare: +c.noiseShare.toFixed(4) })),
  household: { accuracy: hh.accuracy, leaveWithin30: hh.leaveWithin30, days: hh.days, leaveMedianErrMin: hh.leaveMedianErrMin, leaveErrMin: hh.leaveErrMin },
  edgeBudget: eb
};
fs.writeFileSync(out, JSON.stringify(canon, null, 1));
const f = (x, d) => x.toFixed(d);
for (const k of IOT.RUNGS) {
  const h = headline[k];
  console.log(k.padEnd(14), "RMSE", f(h.rmse, 3).padStart(8), " score", f(h.score, 2).padStart(10), " per-unit", f(h.scorePerUnit, 3).padStart(8), " bias", f(h.bias, 2).padStart(7), " late", f(h.lateShare, 3), " n", h.n);
}
console.log("mnar dropped", headline.mnarDropped, "of", headline.mnarTotal, "threshold T50 >=", headline.mnarThreshold, "meanLife", headline.meanLife);
console.log("selfTest", st.pass, "| fault proofs:", faults.map(x => x.fault + "=" + (x.pass ? "PASSED(bad)" : "failed:" + x.failed.join("/"))).join("; "));
console.log("ladder ms", ms, "| household acc", f(hh.accuracy, 4), "leave within 30 min", hh.leaveWithin30, "of", hh.days, "median err", hh.leaveMedianErrMin);
console.log("edge", JSON.stringify({ rawBps: eb.rawBps, rawUtil: eb.rawUtil, rawGBperDay: eb.rawGBperDay, edgeBps: eb.edgeBps, reduction: eb.reduction, cloudPathMs: eb.cloudPathMs, edgePathMs: eb.edgePathMs }));
console.log("triage", canon.triage.map(c => c.ch + "/" + c.sym + " r=" + c.r + " noise=" + c.noiseShare).join(" | "));
process.exit(st.pass && faults.every(x => !x.pass) ? 0 : 1);
