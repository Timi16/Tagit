// Drives the real UI in Chrome through every flow, with real Testnet
// transactions signed by a throwaway wallet, and checks each result on chain.
//
//   npm run test:ui
//
// It builds with NEXT_PUBLIC_E2E=1 into .next-e2e, where the app accepts a
// test wallet (see lib/stellar/wallet.ts); normal builds compile that out.
// Uses @david and @bob from `npm run e2e`, and leaves no tag behind.

import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

import { toUnits } from "@/lib/stellar/assets";
import { config } from "@/lib/stellar/config";
import { getAccountInfo } from "@/lib/stellar/horizon";
import { lookupTag, setWallet } from "@/lib/stellar/registry";

import { actorFrom, ensureFunded, identity, type Actor } from "./actors.mjs";

const PORT = 3125;
const BASE = `http://localhost:${PORT}`;
const SHOTS = resolve(import.meta.dirname, "../.next-e2e/shots");
const TX = 90_000;

let passed = 0;
const failures: string[] = [];
const consoleErrors = new Set<string>();
/** The public RPC's refusals under load (CORS-less 429/5xx) are network weather, not app errors. */
const networkNoise = new Set<string>();
const NOISE = /soroban-testnet|horizon-testnet|friendbot|Failed to load resource: net::ERR_FAILED/;

async function check(name: string, fn: () => Promise<void>, page?: Page) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  ✘ ${name}\n      ${(e instanceof Error ? e.message : String(e)).split("\n")[0]}`);
    if (page) await page.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/\W+/g, "_")}.png`, fullPage: true });
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** The runner's own network calls retry on blips, so a flaky link isn't a failed test. */
async function retry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

async function balance(address: string): Promise<bigint> {
  const info = await retry(() => getAccountInfo(address));
  return info.exists ? (info.balances.XLM ?? 0n) : 0n;
}

async function noOverflow(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(extra <= 0, `page scrolls sideways by ${extra}px`);
}

async function startServer(): Promise<ChildProcess> {
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, NEXT_PUBLIC_E2E: "1" }, stdio: "pipe" });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error("next start did not come up");
}

async function launch(): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH;
  return executablePath ? chromium.launch({ executablePath }) : chromium.launch({ channel: "chrome" });
}

/**
 * Installs the test wallet before any page script runs. A string, not a
 * function: tsx decorates functions with helpers that don't exist in the page.
 */
const installWallet = (address: string) =>
  `window.__tagitTestWallet = { address: ${JSON.stringify(address)}, sign: (x) => window.__tagitSign(x) };`;

async function walletContext(browser: Browser, actor: Actor, viewport: { width: number; height: number }, gate: { reject: boolean }) {
  const context = await browser.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] });
  await context.exposeFunction("__tagitSign", async (xdr: string) => {
    if (gate.reject) throw new Error("The user rejected this request.");
    const tx = TransactionBuilder.fromXDR(xdr, config.networkPassphrase);
    tx.sign(actor.keypair);
    return tx.toXDR();
  });
  await context.addInitScript(installWallet(actor.address));
  return context;
}

function watch(page: Page) {
  page.on("pageerror", (e) => consoleErrors.add(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    (NOISE.test(m.text()) ? networkNoise : consoleErrors).add(m.text());
  });
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const user = actorFrom("ui", Keypair.random());
  const tag = `ui_${Date.now().toString(36)}`;
  const david = identity("david");
  const bob = identity("bob");

  console.log(`Test wallet ${user.address}\nTest tag    @${tag}\n`);
  await ensureFunded(user);
  const [d, b] = await Promise.all([lookupTag("david"), lookupTag("bob")]);
  assert(d.status === "found" && b.status === "found", "run `npm run e2e` first: @david/@bob missing");
  if (d.record.wallet !== david.address) await retry(() => setWallet(david.signer, "david", david.address));

  const server = await startServer();
  const browser = await launch();
  const gate = { reject: false };
  const contexts: BrowserContext[] = [];

  try {
    // Not connected: the Welcome screen and the connect sheet.
    console.log("Welcome");
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
    contexts.push(anon);
    const a = await anon.newPage();
    watch(a);
    await check("no wallet: welcome screen, then the wallet sheet", async () => {
      await a.goto(BASE + "/send", { waitUntil: "load" });
      await a.getByText("Send money to a name.").waitFor({ timeout: 20_000 });
      await a.getByRole("button", { name: /Connect wallet/ }).click();
      const sheet = a.getByRole("dialog", { name: "Connect a wallet" });
      await sheet.getByText("Freighter").waitFor({ timeout: 10_000 });
      for (const w of ["xBull", "LOBSTR", "Albedo"]) await sheet.getByText(w).waitFor();
      await sheet.getByRole("button", { name: "Close" }).click();
      await a.screenshot({ path: `${SHOTS}/welcome.png` });
    }, a);

    const context = await walletContext(browser, user, { width: 390, height: 844 }, gate);
    contexts.push(context);
    const page = await context.newPage();
    watch(page);
    // "load", not "networkidle": history keeps a page busy for a few seconds,
    // and every check waits for the exact content it needs anyway.
    const go = async (path: string) => {
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.waitForTimeout(400);
      await noOverflow(page);
    };

    console.log("Home, first visit");
    await check("welcome, claim banner, balance and empty history", async () => {
      await go("/app");
      await page.getByText("Welcome", { exact: true }).waitFor({ timeout: 20_000 });
      await page.getByText("Claim your @tag").waitFor({ timeout: 20_000 });
      await page.getByText("10,000.00").waitFor({ timeout: 20_000 });
      await page.getByText("No Transaction Yet").waitFor({ timeout: 30_000 });
      await page.screenshot({ path: `${SHOTS}/home-empty.png` });
    }, page);

    await check("copy address shows a toast", async () => {
      await page.getByRole("button", { name: "Copy wallet address" }).click();
      await page.getByText("Address copied").waitFor();
      assert((await page.evaluate(() => navigator.clipboard.readText())) === user.address, "clipboard has the wrong address");
    }, page);

    console.log("Claim");
    const field = page.locator("#tag");
    const msg = page.locator("#tagmsg");
    await check("taken tag: blocked, with free suggestions", async () => {
      await go("/claim");
      await field.fill("david");
      await msg.getByText("@david is taken").waitFor({ timeout: 20_000 });
      assert(await page.getByRole("button", { name: "Pick an available tag" }).isDisabled(), "claim enabled for a taken tag");
      await page.getByText("Try one").waitFor({ timeout: 30_000 });
    }, page);

    await check("invalid, short and reserved tags explain why", async () => {
      await field.fill("da!");
      await msg.getByText("Only lowercase letters, numbers and _").waitFor();
      await field.fill("ab");
      await msg.getByText("Use 3 to 20 characters").waitFor();
      await field.fill("send");
      await msg.getByText("reserved for TagIt's own pages").waitFor({ timeout: 20_000 });
    }, page);

    await check(`claim @${tag}: success screen, and it's on chain`, async () => {
      await field.fill(tag);
      await msg.getByText(`@${tag} is available`).waitFor({ timeout: 20_000 });
      await page.getByText(`/@${tag}`).first().waitFor();
      await page.getByRole("button", { name: `Claim @${tag}` }).click();
      await page.getByText(`@${tag} is yours!`).waitFor({ timeout: TX });
      await page.screenshot({ path: `${SHOTS}/claimed.png` });
      const onChain = await retry(() => lookupTag(tag));
      assert(onChain.status === "found" && onChain.record.owner === user.address, "tag not owned on chain");
      await page.getByRole("link", { name: "Go to home" }).click();
      await page.getByText("Welcome back").waitFor({ timeout: 20_000 });
      await page.locator(".frame").getByText(`@${tag}`).first().waitFor();
    }, page);

    await check("one tag per wallet", async () => {
      await go("/claim");
      await page.getByText("This wallet already owns").waitFor({ timeout: 20_000 });
    }, page);

    console.log("Send");
    const search = page.getByLabel("Search tags");
    await check("unknown tag: not-found screen, Continue disabled", async () => {
      await go("/send");
      await search.fill("davd");
      await page.getByText("No one has @davd").waitFor({ timeout: 20_000 });
      assert(await page.getByRole("button", { name: "Continue" }).isDisabled(), "continue enabled for unknown tag");
    }, page);

    await check("found tag goes to the amount screen, verified", async () => {
      await search.fill("david");
      await page.getByText("Found").waitFor({ timeout: 20_000 });
      await page.getByRole("button", { name: /@david/ }).click();
      await page.getByText("Verified").waitFor({ timeout: 20_000 });
    }, page);

    await check("keypad limits, Max, and keyboard entry", async () => {
      for (const k of ["9", "9", "9", "9", "9", "9"]) await page.getByRole("button", { name: k, exact: true }).click();
      await page.getByRole("button", { name: "Not enough XLM" }).first().waitFor({ timeout: 20_000 });
      await page.getByRole("button", { name: "Max" }).click();
      await page.getByRole("button", { name: "Review payment" }).waitFor();
      for (let i = 0; i < 14; i++) await page.keyboard.press("Backspace");
      await page.getByRole("button", { name: "Enter an amount" }).waitFor();
      await page.keyboard.type("1.5");
      await page.getByLabel("Amount: 1.5 XLM").waitFor();
    }, page);

    const sheet = page.getByRole("dialog", { name: "Check before you send" });
    await check("review sheet shows the exact resolved wallet", async () => {
      await page.getByRole("button", { name: "Review payment" }).click();
      await sheet.getByText("Check before you send").waitFor({ timeout: 30_000 });
      await sheet.getByText("1.5 XLM", { exact: true }).waitFor();
      await sheet.getByLabel(david.address).waitFor();
      await sheet.getByText(`@${tag}`).waitFor();
      await page.screenshot({ path: `${SHOTS}/review.png` });
    }, page);

    await check("rejecting in the wallet sends nothing", async () => {
      const before = await balance(david.address);
      gate.reject = true;
      await sheet.getByRole("button", { name: /Confirm in wallet/ }).click();
      await sheet.getByText("You cancelled in your wallet. Nothing was sent.").waitFor({ timeout: 30_000 });
      gate.reject = false;
      assert((await balance(david.address)) === before, "balance moved after a rejection");
    }, page);

    await check("send 1.5 XLM: Sent! with timeline, confirmed on chain", async () => {
      const before = await balance(david.address);
      await sheet.getByRole("button", { name: /Confirm in wallet/ }).click();
      await page.getByText("Sent!").waitFor({ timeout: TX });
      await page.getByText("Signed in your wallet").waitFor();
      await page.getByText(/Ledger [\d,]+/).waitFor();
      const link = await page.getByRole("link", { name: /View on Stellar Expert/ }).getAttribute("href");
      assert(link && /\/tx\/[0-9a-f]{64}$/.test(link), `bad tx link ${link}`);
      const got = (await balance(david.address)) - before;
      assert(got === toUnits("1.5"), `david got ${got} stroops`);
      await page.screenshot({ path: `${SHOTS}/sent.png` });
    }, page);

    await check("tag re-pointed after review: stopped, then pays the new wallet", async () => {
      await page.getByRole("button", { name: "Send again" }).click();
      await search.fill("david");
      await page.getByRole("button", { name: /@david/ }).first().click();
      await page.getByText("Verified").waitFor({ timeout: 20_000 });
      await page.keyboard.type("1");
      await page.getByRole("button", { name: "Review payment" }).click();
      await sheet.getByLabel(david.address).waitFor({ timeout: 30_000 });

      const moved = await retry(() => setWallet(david.signer, "david", bob.address));
      assert(moved.ok, "set_wallet failed");
      const davidBefore = await balance(david.address);
      const bobBefore = await balance(bob.address);

      await sheet.getByRole("button", { name: /Confirm in wallet/ }).click();
      await sheet.getByText("@david just changed wallets").waitFor({ timeout: 30_000 });
      await page.screenshot({ path: `${SHOTS}/changed.png` });
      assert((await balance(david.address)) === davidBefore, "old wallet was paid");
      await sheet.getByRole("button", { name: "Review the new address" }).click();
      await sheet.getByLabel(bob.address).waitFor();
      await sheet.getByText("New wallet: check it before sending").waitFor();
      await sheet.getByRole("button", { name: /Confirm in wallet/ }).click();
      await page.getByText("Sent!").waitFor({ timeout: TX });
      assert((await balance(bob.address)) - bobBefore === toUnits("1"), "new wallet not paid");
    }, page);
    await retry(() => setWallet(david.signer, "david", david.address));

    await check("?to= an unknown tag lands on the not-found screen", async () => {
      await go("/send?to=nobody_here");
      await page.getByText("No one has @nobody_here").waitFor({ timeout: 20_000 });
    }, page);

    console.log("History, home, receive, pay links");
    await check("history counts and filters payments", async () => {
      await go("/history");
      for (let i = 0; i < 15; i++) {
        if ((await page.locator("a.tx").count()) >= 2) break;
        await page.waitForTimeout(2000);
        await page.getByRole("button", { name: "Refresh" }).click();
      }
      assert((await page.locator("a.tx").count()) >= 2, "expected 2 payments");
      await page.locator("a.tx").filter({ hasText: "1.5 XLM" }).first().waitFor();
      await page.getByRole("tab", { name: "Received" }).click();
      await page.getByText("No Transaction Yet").waitFor();
      await page.getByRole("tab", { name: "All" }).click();
      await page.screenshot({ path: `${SHOTS}/history.png` });
    }, page);

    await check("home: send again and recent payments", async () => {
      await go("/app");
      await page.getByRole("region", { name: "Send again" }).getByRole("link", { name: /@david/ }).waitFor({ timeout: 20_000 });
      await page.locator("a.tx").first().waitFor({ timeout: 20_000 });
    }, page);

    await check("receive: QR and pay link for the tag", async () => {
      await go("/receive");
      await page.getByRole("img", { name: `QR code for @${tag}` }).waitFor({ timeout: 20_000 });
      await page.getByRole("button", { name: "Copy link" }).click();
      await page.getByText("Link copied").waitFor();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      assert(copied === `${BASE}/@${tag}`, `copied ${copied}`);
    }, page);

    await check("pay links: mine, someone else's, and nobody's", async () => {
      await go(`/@${tag}`);
      await page.getByText("That's you").waitFor({ timeout: 20_000 });
      await go("/@david");
      await page.getByRole("link", { name: /Pay @david/ }).click();
      await page.getByText("Verified").waitFor({ timeout: 20_000 });
      await go("/@nobody_here");
      await page.getByRole("link", { name: "Claim @nobody_here" }).waitFor({ timeout: 20_000 });
    }, page);

    console.log("My tag");
    await check("change receiving wallet and back", async () => {
      await go("/tag");
      await page.getByRole("button", { name: /Change receiving wallet/ }).click();
      const s = page.getByRole("dialog", { name: "Change receiving wallet" });
      await s.locator("#new-wallet").fill("GABC");
      await s.getByText("That isn't a Stellar address.").waitFor();
      await s.locator("#new-wallet").fill(bob.address);
      await s.getByRole("button", { name: `Point @${tag} here` }).click();
      await s.getByText("now pays this wallet").waitFor({ timeout: TX });
      let onChain = await retry(() => lookupTag(tag));
      assert(onChain.status === "found" && onChain.record.wallet === bob.address, "not re-pointed on chain");
      await s.getByRole("button", { name: "Use this wallet" }).click();
      // The first change's message is still up, so wait on the chain, not the text.
      const deadline = Date.now() + TX;
      do {
        await page.waitForTimeout(2000);
        onChain = await retry(() => lookupTag(tag));
      } while (!(onChain.status === "found" && onChain.record.wallet === user.address) && Date.now() < deadline);
      assert(onChain.status === "found" && onChain.record.wallet === user.address, "not restored on chain");
      await s.getByRole("button", { name: "Use this wallet" }).waitFor({ state: "detached", timeout: 20_000 });
      await s.getByRole("button", { name: "Close" }).click();
    }, page);

    await check("release needs the tag typed, then frees it", async () => {
      await page.getByRole("button", { name: new RegExp(`Release @${tag}`) }).click();
      const s = page.getByRole("dialog", { name: `Release @${tag}` });
      const release = s.getByRole("button", { name: `Release @${tag}` });
      await s.getByLabel(`Type ${tag} to confirm`).fill("wrong");
      assert(await release.isDisabled(), "release armed without confirmation");
      await s.getByLabel(`Type ${tag} to confirm`).fill(tag);
      await release.click();
      await page.locator(".frame").getByText("No tag yet").waitFor({ timeout: TX });
      assert((await retry(() => lookupTag(tag))).status === "not-found", "tag still registered");
    }, page);

    await check("menu links, then disconnect back to welcome", async () => {
      await go("/app");
      await page.getByRole("button", { name: "Open menu" }).click();
      const nav = page.getByRole("navigation", { name: "Menu" });
      for (const l of ["Home", "Send", "Receive", "History", "My tag"]) await nav.getByRole("link", { name: l }).waitFor();
      await nav.getByRole("button", { name: "Disconnect wallet" }).click();
      await page.getByRole("button", { name: /Connect wallet/ }).waitFor({ timeout: 20_000 });
    }, page);

    console.log("Layouts");
    for (const path of ["/", "/app", "/claim", "/send", "/receive", "/history", "/tag", "/@bob"]) {
      await check(`phone ${path} fits the screen`, async () => {
        await page.goto(BASE + path, { waitUntil: "load" });
        await page.waitForTimeout(600);
        await noOverflow(page);
      }, page);
    }

    console.log("Desktop");
    const desk = await walletContext(browser, user, { width: 1440, height: 900 }, gate);
    contexts.push(desk);
    const dp = await desk.newPage();
    watch(dp);
    const dgo = async (path: string) => {
      await dp.goto(BASE + path, { waitUntil: "load" });
      await dp.waitForTimeout(500);
      await noOverflow(dp);
    };
    await check("desktop: sidebar with nav, and the highlight follows the page", async () => {
      await dgo("/app");
      const side = dp.getByRole("complementary", { name: "TagIt" });
      for (const l of ["Home", "Send", "Receive", "History", "My tag"]) await side.getByRole("link", { name: l, exact: true }).waitFor({ timeout: 20_000 });
      assert((await side.getByRole("link", { name: "Home", exact: true }).getAttribute("aria-current")) === "page", "Home not current");
      await side.getByRole("link", { name: "History", exact: true }).click();
      await dp.waitForURL(/\/history$/);
      assert((await side.getByRole("link", { name: "History", exact: true }).getAttribute("aria-current")) === "page", "History not current");
      await side.getByRole("img", { name: "QR code to open this page on your phone" }).waitFor();
    }, dp);

    await check("desktop home: two columns, wallet left, balances right", async () => {
      await dgo("/app");
      await dp.getByRole("region", { name: "Balance" }).waitFor({ timeout: 20_000 });
      const hero = await dp.getByRole("region", { name: "Your wallet" }).boundingBox();
      const bal = await dp.getByRole("region", { name: "Balance" }).boundingBox();
      assert(hero && bal && bal.x > hero.x + hero.width - 1 && Math.abs(bal.y - hero.y) < 4, `hero ${JSON.stringify(hero)} balance ${JSON.stringify(bal)}`);
      await dp.screenshot({ path: `${SHOTS}/desktop-home.png` });
    }, dp);

    await check("desktop send: keyboard amount, Enter opens a centered modal", async () => {
      await dgo("/send?to=david");
      await dp.getByText("Verified").first().waitFor({ timeout: 30_000 });
      await dp.getByRole("region", { name: "Payment preview" }).getByText("@david", { exact: true }).waitFor();
      assert(!(await dp.getByRole("button", { name: "5", exact: true }).isVisible()), "phone keypad showing on desktop");
      await dp.keyboard.type("2");
      await dp.getByRole("region", { name: "Payment preview" }).getByText("2 XLM").waitFor();
      await dp.keyboard.press("Enter");
      const modal = dp.getByRole("dialog", { name: "Check before you send" });
      await modal.getByText("Check before you send").waitFor({ timeout: 30_000 });
      await dp.waitForTimeout(500);
      const box = await modal.boundingBox();
      assert(box && Math.abs(box.x + box.width / 2 - 720) < 3 && Math.abs(box.y + box.height / 2 - 450) < 3, `modal not centered ${JSON.stringify(box)}`);
      const scrim = await dp.locator(".scrim").boundingBox();
      assert(scrim && scrim.x === 0 && scrim.width === 1440, `scrim doesn't cover the screen ${JSON.stringify(scrim)}`);
      await dp.screenshot({ path: `${SHOTS}/desktop-review.png` });
      await dp.locator(".scrim").click({ position: { x: 20, y: 20 } });
      await modal.waitFor({ state: "detached" });
    }, dp);

    for (const path of ["/claim", "/receive", "/history", "/tag", "/@bob", "/"]) {
      await check(`desktop ${path} fits`, async () => {
        await dgo(path);
      }, dp);
    }

    const anonDesk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    contexts.push(anonDesk);
    const ad = await anonDesk.newPage();
    watch(ad);
    await check("desktop welcome: split screen with the wallets inline", async () => {
      await ad.goto(BASE + "/app", { waitUntil: "load" });
      await ad.getByText("Send money to a name.").waitFor({ timeout: 20_000 });
      await ad.getByRole("button", { name: /Freighter/ }).waitFor({ timeout: 10_000 });
      assert(!(await ad.getByRole("button", { name: /Connect wallet/ }).isVisible()), "phone connect button showing on desktop");
      await noOverflow(ad);
      await ad.screenshot({ path: `${SHOTS}/desktop-welcome.png` });
    }, ad);
  } finally {
    for (const c of contexts) await c.close().catch(() => {});
    await browser.close();
    server.kill();
    const d2 = await lookupTag("david");
    if (d2.status === "found" && d2.record.wallet !== david.address) await setWallet(david.signer, "david", david.address);
  }

  const errors = [...consoleErrors];
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (errors.length) console.log(`Console errors:\n  ${errors.join("\n  ")}`);
  if (networkNoise.size) console.log(`(${networkNoise.size} RPC refusals under load, retried by the app)`);
  console.log(`Screenshots: ${SHOTS}`);
  if (failures.length || errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
