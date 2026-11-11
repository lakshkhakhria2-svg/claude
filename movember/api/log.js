// GET /api/log — the squad log as plain text, for the Google Drive copy.
const { GOAL, read } = require("./_store");

const fmt = (n) => Math.round(n).toLocaleString("en-GB");
const when = (ms) => new Date(ms).toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

module.exports = async (req, res) => {
  try {
    const { lifts } = await read();
    const sorted = [...lifts].sort((a, b) => a.at - b.at);
    const total = sorted.reduce((s, l) => s + l.weight * l.reps, 0);
    const by = {};
    for (const l of sorted) {
      const k = l.name.toLowerCase();
      by[k] = by[k] || { name: l.name, kg: 0 };
      by[k].kg += l.weight * l.reps;
    }
    const board = Object.values(by).sort((a, b) => b.kg - a.kg);
    const lines = [
      "Johnson's Movember Challenge – Group Lift Log",
      "525,600kg lifted for the 525,600 men who lose their lives to suicide each year.",
      "Live counter: https://jladsmovemberchallenge.vercel.app",
      "Donate: https://movember.com/m/15352332?mc=60",
      "",
      `Group total: ${fmt(total)} kg of ${fmt(GOAL)} kg (${((total / GOAL) * 100).toFixed(1)}%)`,
      `Lifts logged: ${sorted.length}`,
      `Last copied from the live counter: ${when(Date.now())}`,
      "",
      "THE SQUAD",
      ...(board.length ? board.map((p, i) => `${i + 1}. ${p.name}: ${fmt(p.kg)} kg`) : ["Nobody on the board yet."]),
      "",
      "EVERY LIFT (date and time | who | lift | kg added)",
      ...(sorted.length ? sorted.map((l) => `${when(l.at)} | ${l.name} | ${l.weight}kg × ${l.reps} reps | +${fmt(l.weight * l.reps)} kg`) : ["No lifts logged yet."]),
    ];
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(lines.join("\n") + "\n");
  } catch (err) {
    console.error(err);
    res.status(503).send("unavailable");
  }
};
