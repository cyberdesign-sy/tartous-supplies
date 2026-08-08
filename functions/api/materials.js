// GET  /api/materials   -> returns the unified materials list (requires any valid login)
// POST /api/materials   -> saves the unified materials list (requires manager login)
//
// Requires the same KV namespace binding "SUPPLIES" used by /api/dept/:n,
// and the AUTH_SECRET environment variable (see functions/api/login.js).

import { getAuth, corsJson, corsOptions } from "../_auth.js";

export async function onRequestOptions() {
  return corsOptions();
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const user = await getAuth(request, env);
  if (!user) {
    return corsJson({ error: "unauthorized" }, 401);
  }
  const raw = await env.SUPPLIES.get("materials");
  return new Response(raw || "[]", {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const user = await getAuth(request, env);
  if (!user || user.role !== "manager") {
    return corsJson({ error: "unauthorized" }, 401);
  }
  let body;
  try {
    body = await request.text();
    const parsed = JSON.parse(body);
    if (!Array.isArray(parsed)) throw new Error("not an array");
  } catch (e) {
    return corsJson({ error: "invalid data" }, 400);
  }
  await env.SUPPLIES.put("materials", body);
  return corsJson({ ok: true, updatedAt: Date.now() });
}
