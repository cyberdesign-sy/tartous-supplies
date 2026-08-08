// GET  /api/dept/:n   -> returns saved rows for department n (requires auth)
// POST /api/dept/:n   -> saves rows for department n (requires auth)
//
// Requires a KV namespace bound to this Pages project with the
// variable name "SUPPLIES" (Settings -> Bindings), and the AUTH_SECRET
// environment variable (see functions/api/login.js for the full list).
//
// Access rules:
//   - manager token: can read/write any department
//   - dept token:    can read/write ONLY its own department number (n)

import { getAuth, corsJson, corsOptions } from "../../_auth.js";

const VALID_DEPTS = ["1", "2", "3", "4", "5"];

export async function onRequestOptions() {
  return corsOptions();
}

function authorizeFor(user, n) {
  if (!user) return false;
  if (user.role === "manager") return true;
  if (user.role === "dept" && String(user.n) === n) return true;
  return false;
}

export async function onRequestGet(context) {
  const { params, env, request } = context;
  const n = params.n;
  if (!VALID_DEPTS.includes(n)) {
    return corsJson({ error: "invalid department" }, 400);
  }
  const user = await getAuth(request, env);
  if (!authorizeFor(user, n)) {
    return corsJson({ error: "unauthorized" }, 401);
  }
  const raw = await env.SUPPLIES.get(`dept:${n}`);
  return new Response(raw || "[]", {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function onRequestPost(context) {
  const { params, env, request } = context;
  const n = params.n;
  if (!VALID_DEPTS.includes(n)) {
    return corsJson({ error: "invalid department" }, 400);
  }
  const user = await getAuth(request, env);
  if (!authorizeFor(user, n)) {
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
  await env.SUPPLIES.put(`dept:${n}`, body);
  return corsJson({ ok: true, updatedAt: Date.now() });
}
