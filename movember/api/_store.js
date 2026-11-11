// The whole squad log lives in one small JSON blob. Vercel's free tier allows
// 2,000 Blob writes/lists a month, so every save is exactly one write and
// reads never list: a save reads the file fresh, appends, and writes it back
// only if nobody else wrote in between (ETag check), retrying if they did.
const crypto = require("node:crypto");
const { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } = require("@vercel/blob");

const PATH = "squad-log.json";
// Private store: only this API can read or write it, and reads with
// useCache:false come straight from storage, so a save never builds on a stale copy.
const token = process.env.SQUADLOG_READ_WRITE_TOKEN;
const GOAL = 525600;

const hash = (s) => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
const cleanName = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 30);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The ETag used to guard a save comes from the file's metadata (head), which is
// always exact. The download can report a different-looking ETag once the file
// is big enough to be compressed in transit, so the two are compared loosely
// and only the metadata one is ever sent back with a save.
const core = (etag) => String(etag || "").replace(/^W\//, "").replace(/"/g, "").replace(/-(gzip|br|zstd)$/, "");

async function readOnce() {
  const notFound = (e) => { if (e instanceof BlobNotFoundError || /does not exist|not found/i.test(String(e && e.message))) return null; throw e; };
  const meta = await head(PATH, { token }).catch(notFound);
  if (!meta) return null;
  const res = await get(PATH, { access: "private", useCache: false, token }).catch(notFound);
  if (!res) return null;
  if (res.statusCode !== 200) throw new Error("unexpected blob status " + res.statusCode);
  const text = await new Response(res.stream).text();
  if (core(res.blob.etag) !== core(meta.etag) && Buffer.byteLength(text) !== meta.size) {
    console.warn("squad log changed mid-read", meta.etag, res.blob.etag);
    return null;
  }
  const data = JSON.parse(text);
  return { lifts: Array.isArray(data.lifts) ? data.lifts : [], etag: meta.etag };
}

// A missing file is only believed after it is missing three times in a row:
// storage can briefly report "not found" while a save is landing, and an
// empty answer here would show the squad a total of zero.
async function read() {
  for (let i = 0; i < 3; i++) {
    const hit = await readOnce();
    if (hit) return hit;
    if (i < 2) await sleep(300);
  }
  return { lifts: [], etag: null, missing: true };
}

// change(lifts) returns the new array, or null to leave the log untouched.
async function mutate(change) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { lifts, etag } = await read();
    const next = await change(lifts);
    if (!next) return lifts;
    try {
      await put(PATH, JSON.stringify({ lifts: next }), {
        access: "private", token, addRandomSuffix: false, contentType: "application/json",
        cacheControlMaxAge: 60, allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {}),
      });
      return next;
    } catch (e) {
      console.warn("save attempt", attempt, e && e.name, String(e && e.message).slice(0, 160), etag);
      const raced = e instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(String(e && e.message));
      if (!raced) throw e;
      await sleep(80 + Math.random() * 200 * (attempt + 1));
    }
  }
  throw new Error("busy");
}

const publicLift = ({ id, at, weight, reps, name }) => ({ id, at, weight, reps, kg: weight * reps, name });

module.exports = { GOAL, hash, cleanName, read, mutate, publicLift };
