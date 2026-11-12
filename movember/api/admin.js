// POST /api/admin {key, remove:[ids]} — organiser-only removal of false entries.
const crypto = require("node:crypto");
const { mutate, publicLift } = require("./_store");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const b = req.body && typeof req.body === "object" ? req.body : {};
  const want = Buffer.from(String(process.env.ADMIN_KEY || ""));
  const got = Buffer.from(String(b.key || ""));
  if (req.method !== "POST" || want.length < 24 || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    return res.status(404).json({ error: "Not found." });
  }
  try {
    const remove = new Set(Array.isArray(b.remove) ? b.remove.map(String) : []);
    const lifts = await mutate((all) => (all.some((l) => remove.has(l.id)) ? all.filter((l) => !remove.has(l.id)) : null));
    return res.status(200).json({ lifts: lifts.map(publicLift) });
  } catch (err) {
    console.error(err);
    return res.status(503).json({ error: "busy" });
  }
};
