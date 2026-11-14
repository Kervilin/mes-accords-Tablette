import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const baseURL = process.env.APP_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--autoplay-policy=user-gesture-required"],
});
const errors = [];

async function contextFor(mobile) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: "light",
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    localStorage.setItem("mac_fsauto", "0");
    localStorage.setItem("mac_tierces", "0");
    // Observe the real Web Audio nodes rather than substituting a fake synth.
    const NativeContext = window.AudioContext;
    window.audioProbe = { contexts: [], voices: [] };
    window.AudioContext = class extends NativeContext {
      constructor(...args) {
        super(...args);
        window.audioProbe.contexts.push(this);
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        const record = { start: null, stop: null, ended: false };
        window.audioProbe.voices.push(record);
        const start = oscillator.start.bind(oscillator);
        const stop = oscillator.stop.bind(oscillator);
        oscillator.start = (when) => {
          record.start = when;
          start(when);
        };
        oscillator.stop = (when) => {
          record.stop = when;
          stop(when);
        };
        oscillator.addEventListener("ended", () => { record.ended = true; });
        return oscillator;
      }
    };
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.locator(".chord-card").waitFor();
  await page.waitForTimeout(700);
  return { context, page };
}

async function soundCount(page) {
  return page.evaluate(() => window.audioProbe.voices.filter((v) => v.start !== null && !v.ended).length);
}

async function noSound(page) {
  await page.waitForFunction(() => window.audioProbe.voices.every((v) => v.start === null || v.ended));
}

try {
  const { context, page } = await contextFor(true);
  const round = page.locator(".chord-card");
  const dialog = page.getByRole("dialog", { name: "Choisir un accord" });
  await round.tap();
  await dialog.waitFor();
  assert.equal(await soundCount(page), 0, "A tap must not make any sound");

  const roots = dialog.getByRole("group", { name: "Fondamentale de l'accord" });
  const modes = dialog.getByRole("group", { name: "Mode de l'accord", exact: true });
  const quality = dialog.getByRole("group", { name: "Majeur, mineur et tierces" });
  assert.equal(await dialog.getByRole("group").count(), 3);
  assert.deepEqual(await roots.locator("button").allTextContents(),
    ["Do", "Do#", "Ré", "Mi♭", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Si♭", "Si"]);
  assert.deepEqual(await modes.locator("button").allTextContents(),
    ["Parfait", "7", "9", "5", "sus2", "sus4", "6", "7M", "add9"]);
  assert.deepEqual(await quality.locator("button").allTextContents(), ["Maj", "Min", "Sans tierce"]);
  for (const row of [roots, modes, quality]) {
    const tops = await row.locator("button").evaluateAll((buttons) => buttons.map((b) => b.offsetTop));
    assert.equal(new Set(tops).size, 1, "All buttons in a group stay on one line");
  }
  assert.equal(await dialog.getByRole("button", { name: "Poussé", exact: true }).count(), 0);
  console.log("PASS three exact rows, no extra P/T row, no sound on tap");

  await roots.getByRole("button", { name: "Fa", exact: true }).tap();
  await modes.getByRole("button", { name: "7", exact: true }).tap();
  await quality.getByRole("button", { name: "Min", exact: true }).tap();
  await quality.getByRole("button", { name: "Sans tierce", exact: true }).tap();
  assert.equal(await quality.getByRole("button", { name: "Avec tierce" }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".cc-name").textContent(), "Fam7");
  assert.equal(await page.evaluate(() => localStorage.getItem("mac_tierces")), "1");
  await modes.getByRole("button", { name: "sus4", exact: true }).tap();
  assert.equal(await quality.getByRole("button", { name: "Min", exact: true }).isDisabled(), true);
  await modes.getByRole("button", { name: "Parfait", exact: true }).tap();
  await quality.getByRole("button", { name: "Maj", exact: true }).tap();
  await quality.getByRole("button", { name: "Avec tierce" }).tap();
  assert.equal(await page.locator(".cc-name").textContent(), "Fa");
  console.log("PASS root, mode, Maj/Min and tierces update the actual chord");

  await mkdir("artifacts", { recursive: true });
  await page.waitForTimeout(250);
  await dialog.screenshot({ path: "artifacts/chord-picker-mobile.png" });
  await dialog.getByRole("button", { name: "Fermer", exact: true }).tap();
  await dialog.waitFor({ state: "hidden" });

  const client = await context.newCDPSession(page);
  const center = async () => {
    await round.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await round.boundingBox();
    assert.ok(box);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  };
  const start = (point) => client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  const end = () => client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  let point = await center();
  await start(point);
  await page.waitForTimeout(120);
  assert.equal(await soundCount(page), 0, "No sound before the long-press threshold");
  await page.waitForTimeout(350);
  assert.ok(await soundCount(page) > 0, "Holding starts the chord");
  assert.ok(await page.evaluate(() => window.audioProbe.contexts.every((c) => c.state === "running")));
  await page.waitForTimeout(2200);
  assert.ok(await soundCount(page) > 0, "The chord must continue beyond the usual 1.9 seconds");
  assert.ok(await page.evaluate(() => window.audioProbe.voices.filter((v) => !v.ended).every((v) => v.stop === null)));
  await end();
  await noSound(page);
  assert.equal(await dialog.count(), 0, "Releasing a hold must not open the picker");
  console.log("PASS real touch hold sustains real audio and release stops it");

  point = await center();
  await start(point);
  await page.waitForTimeout(450);
  await client.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await noSound(page);
  assert.equal(await dialog.count(), 0);
  console.log("PASS cancelled touch stops audio without opening the picker");

  point = await center();
  await start(point);
  await page.waitForTimeout(450);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [{ ...point, x: point.x + 160 }],
  });
  await noSound(page);
  await end();
  assert.equal(await dialog.count(), 0);
  console.log("PASS moving off the round stops the held chord");

  point = await center();
  await start(point);
  await page.waitForTimeout(450);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [point, { ...point, x: point.x + 160, id: 2 }],
  });
  await noSound(page);
  await end();
  assert.equal(await dialog.count(), 0);
  console.log("PASS a second finger cancels sound before pinching the keyboard");

  point = await center();
  await start(point);
  await page.waitForTimeout(450);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await noSound(page);
  await end();
  assert.equal(await dialog.count(), 0);
  console.log("PASS app losing focus stops the sustained chord");

  point = await center();
  await start(point);
  await page.waitForTimeout(80);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [{ ...point, x: point.x + 40 }],
  });
  await end();
  await page.waitForTimeout(450);
  assert.equal(await soundCount(page), 0);
  assert.equal(await dialog.count(), 0);
  console.log("PASS scrolling is not interpreted as a tap or a hold");

  for (const width of [320, 600]) {
    await page.setViewportSize({ width, height: 800 });
    await round.tap();
    await dialog.waitFor();
    const box = await dialog.boundingBox();
    assert.ok(box.width <= width && box.x >= 0 && box.x + box.width <= width + 1);
    for (const row of [roots, modes, quality]) {
      const tops = await row.locator("button").evaluateAll((buttons) => buttons.map((b) => b.offsetTop));
      assert.equal(new Set(tops).size, 1);
    }
    await dialog.getByRole("button", { name: "Fermer", exact: true }).tap();
  }
  console.log("PASS three-row layout fits 320px phones and 600px tablets");
  await context.close();

  const desktop = await contextFor(false);
  const pc = desktop.page;
  const pcRound = pc.locator(".chord-card");
  const pcDialog = pc.getByRole("dialog", { name: "Choisir un accord" });
  await pcRound.click();
  await pcDialog.waitFor();
  await pcDialog.getByRole("group", { name: "Fondamentale de l'accord" }).getByRole("button", { name: "Sol", exact: true }).click();
  await pc.keyboard.press("Escape");
  assert.equal(await pcDialog.count(), 0);
  assert.equal(await pc.locator(".cc-name").textContent(), "Sol", "Closing must not reset the selected chord");
  await pcRound.focus();
  await pc.keyboard.press("Space");
  await pcDialog.waitFor();
  assert.equal(await soundCount(pc), 0, "Space on the focused round opens the dialog, not the global audio shortcut");
  await pc.keyboard.press("Escape");
  await pcRound.scrollIntoViewIfNeeded();
  const pcBox = await pcRound.boundingBox();
  await pc.mouse.move(pcBox.x + pcBox.width / 2, pcBox.y + pcBox.height / 2);
  await pc.mouse.down();
  await pc.waitForTimeout(470);
  assert.ok(await soundCount(pc) > 0);
  await pc.mouse.up();
  await noSound(pc);
  assert.equal(await pcDialog.count(), 0);
  console.log("PASS desktop click, keyboard activation, Escape and held audio");
  await desktop.context.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("ALL CHORD CONTROL TESTS PASSED");
} finally {
  await browser.close();
}