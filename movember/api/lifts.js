// Squad lift log for the Movember challenge, kept in Vercel Blob.
// Each lift is one tiny blob whose path carries its data, so a single
// list call returns the whole log and concurrent saves never collide:
//   lifts/<at>~<rand>~<weight>~<reps>~<name, base64url>~<delete-key hash>.txt
const crypto = require("node:crypto");
const { put, list, del } = require("@vercel/blob");

const PREFIX = "lifts/";
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
const b64 = (s) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s) => Buffer.from(s, "base64url").toString("utf8");
const cleanName = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 30);

function parse(blob) {
  const base = blob.pathname.slice(PREFIX.length).replace(/\.txt$/, "");
  const [at, rand, weight, reps, name, keyHash] = base.split("~");
  const w = Number(weight), r = Number(reps), t = Number(at);
  if (!t || !rand || !(w > 0) || !(r > 0)) return null;
  let n = "";
  try { n = cleanName(unb64(name || "")); } catch (_) {}
  return { id: `${at}~${rand}`, at: t, weight: w, reps: r, kg: w * r, name: n, keyHash, url: blob.url };
}

async function listAll(prefix = PREFIX) {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const b of page.blobs) { const l = parse(b); if (l) out.push(l); }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  return {};
}

const send = (res, status, data) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
};
const publicLift = ({ id, at, weight, reps, kg, name }) => ({ id, at, weight, reps, kg, name });

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const lifts = await listAll();
      return send(res, 200, { lifts: lifts.map(publicLift) });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const name = cleanName(body.name);
      const weight = Math.round(Number(body.weight) * 2) / 2;
      const reps = Math.round(Number(body.reps));
      const key = String(body.key || "");
      if (!name) return send(res, 400, { error: "Add your name before logging a lift." });
      if (!(weight > 0 && weight <= 1000)) return send(res, 400, { error: "Weight must be between 0.5kg and 1,000kg." });
      if (!(reps >= 1 && reps <= 500)) return send(res, 400, { error: "Reps must be between 1 and 500." });
      if (key.length < 16) return send(res, 400, { error: "Missing device key." });
      const at = Date.now();
      const rand = crypto.randomBytes(5).toString("hex");
      const pathname = `${PREFIX}${at}~${rand}~${weight}~${reps}~${b64(name)}~${hash(key)}.txt`;
      await put(pathname, "1", { access: "public", addRandomSuffix: false, contentType: "text/plain" });
      return send(res, 201, { lift: { id: `${at}~${rand}`, at, weight, reps, kg: weight * reps, name } });
    }

    if (req.method === "DELETE") {
      const body = await readBody(req);
      const id = String(body.id || "");
      if (!/^\d+~[0-9a-f]+$/.test(id)) return send(res, 400, { error: "Unknown lift." });
      const [match] = await listAll(`${PREFIX}${id}~`);
      if (!match) return send(res, 404, { error: "That lift is already gone." });
      if (match.keyHash !== hash(body.key || "")) return send(res, 403, { error: "Only the phone that logged a lift can remove it." });
      await del(match.url);
      return send(res, 200, { removed: id });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Method not allowed." });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: "The squad log is unavailable right now. Try again in a moment." });
  }
};
