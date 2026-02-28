#!/usr/bin/env node
/**
 * test-auth.js — Local Auth endpoint tester
 *
 * Prerequisites (one-time setup):
 *   1. Enable "Password" grant in Auth0:
 *      Dashboard → Applications → LearnNova → Settings
 *      → Advanced Settings → Grant Types → check "Password" → Save
 *
 *   2. Set the default DB connection in Auth0:
 *      Dashboard → Applications → LearnNova → Settings
 *      → Scroll to "Default Directory" → type: Username-Password-Authentication → Save
 *
 *   3. Create a test user in Auth0:
 *      Dashboard → User Management → Users → Create User
 *      Fill email + password → Connection: Username-Password-Authentication
 *
 *   4. Add test credentials to your .env:
 *        TEST_USER_EMAIL=testuser@example.com
 *        TEST_USER_PASSWORD=TestPassword123!
 *        TEST_USER_ROLE=individual     (or: teacher)
 *
 *   5. Start the backend:  npm run dev
 *
 *   6. Run this script:   node scripts/test-auth.js
 */

require("dotenv").config();

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

// ── ANSI Colors ───────────────────────────────────────────────
const c = {
    green:  (s) => `\x1b[32m${s}\x1b[0m`,
    red:    (s) => `\x1b[31m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
    bold:   (s) => `\x1b[1m${s}\x1b[0m`,
    dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Summary Tracking ─────────────────────────────────────────
const results = [];
function pass(name) { results.push({ name, ok: true  }); console.log(`  ${c.green("✅ PASS")} ${name}`); }
function fail(name, detail) { results.push({ name, ok: false }); console.log(`  ${c.red("❌ FAIL")} ${name} ${c.dim("→")} ${c.red(detail)}`); }
function section(title) { console.log(`\n${c.cyan(c.bold(`── ${title} ` + "─".repeat(Math.max(0, 50 - title.length))))}`); }

// ── HTTP helpers ──────────────────────────────────────────────
async function req(method, path, { token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    return { status: res.status, data };
}

// ── Step 1: Get Auth0 token via Resource Owner Password Grant ──
async function getToken(email, password) {
    const domain = process.env.AUTH0_DOMAIN?.replace(/\/$/, "");
    const res = await fetch(`${domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grant_type:    "http://auth0.com/oauth/grant-type/password-realm",
            realm:         "Username-Password-Authentication",
            client_id:     process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience:      process.env.AUTH0_AUDIENCE,
            scope:         "openid profile email",
            username:      email,
            password:      password,
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error_description || data.error || "Token request failed");
    }
    return data.access_token;
}

// ─────────────────────────────────────────────────────────────
async function run() {
    console.log(c.bold("\n╔══════════════════════════════════════════════╗"));
    console.log(c.bold("║        NeuroAdapt Auth Local Test Suite       ║"));
    console.log(c.bold("╚══════════════════════════════════════════════╝\n"));
    console.log(`  Backend : ${c.cyan(BASE_URL)}`);
    console.log(`  Auth0   : ${c.cyan(process.env.AUTH0_DOMAIN)}`);
    console.log(`  Audience: ${c.cyan(process.env.AUTH0_AUDIENCE)}`);

    // ── Validate env ──────────────────────────────────────────
    const needed = ["AUTH0_DOMAIN","AUTH0_AUDIENCE","AUTH0_CLIENT_ID","AUTH0_CLIENT_SECRET",
                    "TEST_USER_EMAIL","TEST_USER_PASSWORD"];
    const missing = needed.filter((k) => !process.env[k]);
    if (missing.length) {
        console.log(c.red(`\n❌ Missing env vars: ${missing.join(", ")}`));
        console.log(c.yellow("   Add them to .env — see top of this file for instructions.\n"));
        process.exit(1);
    }

    const email    = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    const role     = process.env.TEST_USER_ROLE || "individual";

    // ── Section 1: Server reachability ───────────────────────
    section("1. Server Health");
    try {
        const { status, data } = await req("GET", "/api/health");
        if (status === 200 && data.status === "ok") pass("GET /api/health → 200 ok");
        else fail("GET /api/health", `status=${status}`);
    } catch (e) {
        fail("GET /api/health", `Server not reachable — is \`npm run dev\` running? (${e.message})`);
        console.log(c.red("\n⛔ Cannot reach server. Start it first: npm run dev\n"));
        process.exit(1);
    }

    // ── Section 2: Auth protection (no token) ────────────────
    section("2. Auth Protection (no token)");
    {
        const { status } = await req("GET", "/api/auth/me");
        if (status === 401) pass("GET /api/auth/me (no token) → 401 ✓");
        else fail("GET /api/auth/me (no token)", `expected 401, got ${status}`);
    }
    {
        const { status } = await req("POST", "/api/auth/sync", { body: {} });
        if (status === 401) pass("POST /api/auth/sync (no token) → 401 ✓");
        else fail("POST /api/auth/sync (no token)", `expected 401, got ${status}`);
    }

    // ── Section 3: Get real Auth0 token ──────────────────────
    section("3. Auth0 Token Acquisition");
    let token;
    try {
        console.log(`  ${c.dim("→ Requesting token for:")} ${email} ${c.dim("(role: " + role + ")")}`);
        token = await getToken(email, password);
        pass(`Token obtained (${token.slice(0, 30)}...)`);
    } catch (e) {
        fail("Auth0 token", e.message);
        console.log(c.yellow(`
  ┌─ Likely Causes ────────────────────────────────────────────┐
  │ 1. Password grant not enabled in Auth0 Application         │
  │    → Dashboard → Apps → LearnNova → Advanced → Grant Types │
  │    → Enable "Password" → Save                              │
  │                                                            │
  │ 2. "Default Directory" not set                             │
  │    → Dashboard → Apps → LearnNova → Settings              │
  │    → Default Directory: Username-Password-Authentication   │
  │                                                            │
  │ 3. Test user doesn't exist or wrong password               │
  │    → Dashboard → User Management → Users → Create User     │
  └────────────────────────────────────────────────────────────┘
`));
        process.exit(1);
    }

    // ── Section 4: Sync user ──────────────────────────────────
    section("4. POST /api/auth/sync");
    let user;
    {
        const { status, data } = await req("POST", "/api/auth/sync", {
            token,
            body: { role, email, name: "Test User" },
        });
        if (status === 200 && data.user) {
            pass(`User synced → id=${data.user.id}, role=${data.user.role}`);
            user = data.user;
        } else {
            fail("/sync", `status=${status}, body=${JSON.stringify(data)}`);
        }
    }

    // ── Section 5: Get profile ────────────────────────────────
    section("5. GET /api/auth/me");
    {
        const { status, data } = await req("GET", "/api/auth/me", { token });
        if (status === 200 && data.user) pass(`Profile fetched → email=${data.user.email}, onboarded=${data.user.onboarded}`);
        else fail("/me", `status=${status}, body=${JSON.stringify(data)}`);
    }

    // ── Section 6: Onboarding ─────────────────────────────────
    section("6. POST /api/auth/onboarding/individual");
    {
        const { status, data } = await req("POST", "/api/auth/onboarding/individual", {
            token,
            body: { neurodiversity: ["dyslexia"] },
        });
        if (status === 200 && data.success) pass(`Neurodiversity saved → ${data.user?.neurodiversity}`);
        else fail("/onboarding/individual", `status=${status}, body=${JSON.stringify(data)}`);
    }

    section("7. POST /api/auth/onboarding/assessment");
    {
        const answers = { q1: "a", q2: "a", q3: "a", q4: "a", q5: "b", q6: "c", q7: "a", q8: "b", q9: "c", q10: "a" };
        const { status, data } = await req("POST", "/api/auth/onboarding/assessment", { token, body: { answers } });
        if (status === 200 && data.detectedTypes) pass(`Assessment → detected: ${data.detectedTypes.join(", ")}`);
        else fail("/onboarding/assessment", `status=${status}, body=${JSON.stringify(data)}`);
    }

    // ── Section 7: Teacher-only routes (expected 403 for non-teacher) ──
    section(`8. Teacher-Only Routes (role=${role})`);
    {
        const { status } = await req("POST", "/api/auth/org/create", { token, body: { orgName: "Test Org" } });
        if (role === "teacher") {
            if (status === 200) pass("POST /org/create → 200 ✓ (teacher)");
            else fail("POST /org/create", `expected 200, got ${status}`);
        } else {
            if (status === 403) pass("POST /org/create → 403 ✓ (non-teacher correctly blocked)");
            else fail("POST /org/create", `expected 403 for non-teacher, got ${status}`);
        }
    }
    {
        const { status } = await req("GET", "/api/auth/org/my", { token });
        if (role === "teacher") {
            if (status === 200) pass("GET /org/my → 200 ✓");
            else fail("GET /org/my", `expected 200, got ${status}`);
        } else {
            if (status === 403) pass("GET /org/my → 403 ✓ (non-teacher correctly blocked)");
            else fail("GET /org/my", `expected 403, got ${status}`);
        }
    }

    // ── Section 8: 404 handler ────────────────────────────────
    section("9. 404 Handler");
    {
        const { status, data } = await req("GET", "/api/does-not-exist");
        if (status === 404) pass("GET /api/does-not-exist → 404 ✓");
        else fail("404 handler", `expected 404, got ${status}`);
    }

    // ── Summary ───────────────────────────────────────────────
    const passed = results.filter((r) => r.ok).length;
    const total  = results.length;
    const allOk  = passed === total;

    console.log(`\n${c.bold("══════════════════════════════════════════════")}`);
    console.log(c.bold(`  Results: ${allOk ? c.green(`${passed}/${total} PASSED ✅`) : c.red(`${passed}/${total} passed`)}`));
    if (!allOk) {
        console.log(c.red("\n  Failed tests:"));
        results.filter((r) => !r.ok).forEach((r) => console.log(`    ${c.red("•")} ${r.name}`));
    }
    console.log(c.bold("══════════════════════════════════════════════\n"));
    process.exit(allOk ? 0 : 1);
}

run().catch((err) => {
    console.error(c.red("\n❌ Unexpected error:"), err.message);
    process.exit(1);
});
