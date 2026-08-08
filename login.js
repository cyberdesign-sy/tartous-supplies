// POST /api/login   body: {role:"manager", password} OR {role:"dept", n:1-5, password}
// Passwords are compared server-side against encrypted environment variables —
// they are never present anywhere in the HTML/JS shipped to the browser.
//
// Required environment variables (add as Encrypted in Cloudflare Pages
// project Settings -> Environment variables):
//   AUTH_SECRET        - any long random string, used to sign session tokens
//   MANAGER_PASSWORD
//   DEPT1_FULL, DEPT1_LIMITED
//   DEPT2_FULL, DEPT2_LIMITED
//   DEPT3_FULL, DEPT3_LIMITED
//   DEPT4_FULL, DEPT4_LIMITED
//   DEPT5_FULL, DEPT5_LIMITED

import { issueToken, corsJson, corsOptions } from "../_auth.js";

const SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function onRequestOptions() {
  return corsOptions();
}

// GET /api/login -> safe diagnostic: reports which env vars are configured
// (true/false only, never the actual secret values). Useful for debugging
// setup issues without exposing any credentials.
export async function onRequestGet(context) {
  const { env } = context;
  const report = {
    AUTH_SECRET: !!env.AUTH_SECRET,
    MANAGER_PASSWORD: !!env.MANAGER_PASSWORD
  };
  for (let n = 1; n <= 5; n++) {
    report[`DEPT${n}_FULL`] = !!env[`DEPT${n}_FULL`];
    report[`DEPT${n}_LIMITED`] = !!env[`DEPT${n}_LIMITED`];
  }
  return corsJson(report);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.AUTH_SECRET) {
    return corsJson({ error: "الخادم غير مُعدّ بعد (AUTH_SECRET مفقود)" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return corsJson({ error: "invalid body" }, 400);
  }

  const { role, password } = body || {};
  if (typeof password !== "string" || !password) {
    return corsJson({ error: "invalid credentials" }, 401);
  }

  let payload = null;

  if (role === "manager") {
    if (env.MANAGER_PASSWORD && password === env.MANAGER_PASSWORD) {
      payload = { role: "manager", exp: Date.now() + SESSION_MS };
    }
  } else if (role === "dept") {
    const n = Number(body.n);
    if (n >= 1 && n <= 5) {
      const fullPw = env[`DEPT${n}_FULL`];
      const limitedPw = env[`DEPT${n}_LIMITED`];
      if (fullPw && password === fullPw) {
        payload = { role: "dept", n, perm: "full", exp: Date.now() + SESSION_MS };
      } else if (limitedPw && password === limitedPw) {
        payload = { role: "dept", n, perm: "limited", exp: Date.now() + SESSION_MS };
      }
    }
  }

  if (!payload) {
    return corsJson({ error: "invalid credentials" }, 401);
  }

  const token = await issueToken(payload, env.AUTH_SECRET);
  return corsJson({ token, ...payload });
}
