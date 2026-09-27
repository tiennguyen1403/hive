/*
 * One browser at a time across every builder of the style exploration.
 *
 * The machine is short of memory (a capture run was killed by the system on 26/09/2026) and several directions are
 * built in parallel, so every script that starts Chrome goes through withBrowser(): it takes a lock directory under
 * prototype/explore/_shots/, launches Chrome, runs your function, closes Chrome and releases the lock, even on error.
 *
 *   const { withBrowser } = require("../../tools/browser.cjs");   // path relative to your script
 *   await withBrowser(async (browser) => {
 *     const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
 *     ...
 *   });
 *
 * Keep each run short (a lock older than five minutes is treated as abandoned and broken).
 */
const fs = require("fs");
const path = require("path");

const NODE_MODULES = path.resolve(__dirname, "../../../node_modules");
const { chromium } = require(path.join(NODE_MODULES, "playwright"));

const LOCK = path.resolve(__dirname, "../_shots/.browser-lock");
const STALE_MS = 5 * 60 * 1000;
const WAIT_MS = 15 * 60 * 1000;

function tryTake() {
  try {
    fs.mkdirSync(path.dirname(LOCK), { recursive: true });
    fs.mkdirSync(LOCK);
    fs.writeFileSync(path.join(LOCK, "owner"), `${process.pid} ${new Date().toISOString()}`);
    return true;
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    try {
      const age = Date.now() - fs.statSync(LOCK).mtimeMs;
      if (age > STALE_MS) fs.rmSync(LOCK, { recursive: true, force: true });
    } catch (_) { /* raced with the owner releasing it */ }
    return false;
  }
}

function release() {
  try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch (_) { /* already gone */ }
}

async function withBrowser(fn) {
  const started = Date.now();
  let told = false;
  while (!tryTake()) {
    if (!told) { console.log("waiting for another builder's browser to finish..."); told = true; }
    if (Date.now() - started > WAIT_MS) throw new Error("gave up waiting for the browser lock");
    await new Promise((r) => setTimeout(r, 1500));
  }
  const onExit = () => release();
  process.once("exit", onExit);
  process.once("SIGINT", () => { release(); process.exit(130); });
  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: "chrome" });
    } catch (e) {
      browser = await chromium.launch();
    }
    return await fn(browser);
  } finally {
    if (browser) await browser.close().catch(() => {});
    release();
    process.removeListener("exit", onExit);
  }
}

module.exports = { withBrowser };
