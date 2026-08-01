// GET  /api/dept/:n   -> returns saved rows for department n
// POST /api/dept/:n   -> saves rows for department n (body: JSON array)
//
// Requires a KV namespace bound to this Pages project with the
// variable name "SUPPLIES" (see Cloudflare dashboard > Pages project >
// Settings > Functions > KV namespace bindings).

const VALID_DEPTS = ["1", "2", "3", "4", "5"];

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function onRequestOptions() {
  return cors(new Response(null, { status: 204 }));
}

export async function onRequestGet(context) {
  const { params, env } = context;
  const n = params.n;
  if (!VALID_DEPTS.includes(n)) {
    return cors(new Response(JSON.stringify({ error: "invalid department" }), { status: 400 }));
  }
  const raw = await env.SUPPLIES.get(`dept:${n}`);
  return cors(new Response(raw || "[]", {
    headers: { "Content-Type": "application/json" }
  }));
}

export async function onRequestPost(context) {
  const { params, env, request } = context;
  const n = params.n;
  if (!VALID_DEPTS.includes(n)) {
    return cors(new Response(JSON.stringify({ error: "invalid department" }), { status: 400 }));
  }
  let body;
  try {
    body = await request.text();
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch (e) {
    return cors(new Response(JSON.stringify({ error: "invalid data" }), { status: 400 }));
  }
  await env.SUPPLIES.put(`dept:${n}`, body);
  return cors(new Response(JSON.stringify({ ok: true, updatedAt: Date.now() }), {
    headers: { "Content-Type": "application/json" }
  }));
}
