// GET    /api/lifts            the squad log (cached at the edge for 45s)
// POST   /api/lifts            {key, lifts:[{id,name,weight,reps,at}]} saves a batch
// DELETE /api/lifts            {key, id} removes a lift logged from the same phone
const { hash, cleanName, nameProblem, liftProblem, read, mutate, publicLift } = require("./_store");

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) {} }
  return {};
}
const send = (res, status, data, cache = "no-store") => {
  res.setHeader("Cache-Control", cache);
  res.status(status).json(data);
};

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const { lifts, missing } = await read();
      const cache = missing ? "no-store" : "public, max-age=0, s-maxage=45, stale-while-revalidate=30";
      return send(res, 200, { lifts: lifts.map(publicLift) }, cache);
    }

    if (req.method === "POST") {
      const b = body(req);
      const key = String(b.key || "");
      if (key.length < 16) return send(res, 400, { error: "Missing device key." });
      const incoming = Array.isArray(b.lifts) ? b.lifts.slice(0, 50) : [];
      const now = Date.now();
      const fresh = [];
      let rejected = "";
      for (const l of incoming) {
        const id = String(l.id || "");
        const name = cleanName(l.name);
        const weight = Math.round(Number(l.weight) * 2) / 2;
        const reps = Math.round(Number(l.reps));
        if (!/^[a-z0-9]{8,40}$/.test(id)) continue;
        const problem = nameProblem(name) || liftProblem(weight, reps);
        if (problem) { rejected = problem; continue; }
        const at = Number(l.at) > now - 7 * 86400000 && Number(l.at) <= now + 60000 ? Math.round(Number(l.at)) : now;
        fresh.push({ id, at, weight, reps, name, k: hash(key) });
      }
      if (!fresh.length) return send(res, 400, { error: rejected || "Add your name, a weight and reps to log a lift." });
      const lifts = await mutate((all) => {
        const have = new Set(all.map((l) => l.id));
        const add = fresh.filter((l) => !have.has(l.id));
        return add.length ? all.concat(add) : null;
      });
      return send(res, 200, { lifts: lifts.map(publicLift) });
    }

    if (req.method === "DELETE") {
      const b = body(req);
      const id = String(b.id || "");
      let status = 200;
      const lifts = await mutate((all) => {
        const hit = all.find((l) => l.id === id);
        if (!hit) return null;
        if (hit.k !== hash(b.key || "")) { status = 403; return null; }
        return all.filter((l) => l.id !== id);
      });
      if (status === 403) return send(res, 403, { error: "Only the phone that logged a lift can remove it." });
      return send(res, 200, { lifts: lifts.map(publicLift) });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Method not allowed." });
  } catch (err) {
    console.error(err);
    return send(res, 503, { error: "The squad log is busy right now. Your lift is kept on this phone and will save shortly." });
  }
};
