// GET  /api/materials   -> returns the unified materials list
// POST /api/materials   -> saves the unified materials list (body: JSON array of strings)
//
// Requires the same KV namespace binding "SUPPLIES" used by /api/dept/:n

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
  const { env } = context;
  const raw = await env.SUPPLIES.get("materials");
  return cors(new Response(raw || "[]", {
    headers: { "Content-Type": "application/json" }
  }));
}

export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try {
    body = await request.text();
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch (e) {
    return cors(new Response(JSON.stringify({ error: "invalid data" }), { status: 400 }));
  }
  await env.SUPPLIES.put("materials", body);
  return cors(new Response(JSON.stringify({ ok: true, updatedAt: Date.now() }), {
    headers: { "Content-Type": "application/json" }
  }));
}
