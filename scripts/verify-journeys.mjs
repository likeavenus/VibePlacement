import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
process.env.TEMP =
  process.env.TMP =
  process.env.TMPDIR =
    path.join(root, ".tmp");
await mkdir("artifacts", { recursive: true });
const base = process.env.VIBE_TEST_URL ?? "http://localhost:5186";
const remote = base.includes("/VibePlacement");
const url = (route) => base.replace(/\/$/, "") + (remote ? "/#" : "") + route;
const context = await chromium.launchPersistentContext(
  path.join(root, ".cache", remote ? "journeys-pages" : "journeys-local"),
  {
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
);
const page = context.pages()[0],
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.url().startsWith(base) && r.status() >= 400)
    errors.push(`${r.status()} ${r.url()}`);
});
const check = (name, value = true) => {
  assert.ok(value, name);
  checks.push(name);
  console.log("PASS", name);
};
const guide = page.locator(".guide-panel");
async function go(route) {
  await page.goto(url(route));
  await page.locator("#main-content h1").waitFor();
}
async function spotlight(name) {
  await page.locator(".guide-spotlight").waitFor();
  await page.waitForTimeout(250);
  const ring = await page.locator(".guide-spotlight").boundingBox();
  const panel = await guide.boundingBox();
  check(
    name,
    ring.width > 100 &&
      ring.y >= 0 &&
      ring.y + ring.height <= page.viewportSize().height &&
      (ring.y + ring.height <= panel.y ||
        ring.y >= panel.y + panel.height ||
        ring.x + ring.width <= panel.x ||
        ring.x >= panel.x + panel.width),
  );
}
async function noOverflow(name) {
  check(
    name,
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
}
async function viewerCheck(category, selector, name) {
  await go(`/market?category=${category}`);
  const canvas = page.locator(selector).first();
  await canvas.scrollIntoViewIfNeeded();
  await canvas.waitFor();
  await page.waitForTimeout(1300);
  const pixels = await canvas.evaluate((c) => {
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    const bytes = new Uint8Array(c.width * c.height * 4);
    gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const colors = new Set();
    for (let i = 0; i < bytes.length; i += 64)
      colors.add(`${bytes[i]},${bytes[i + 1]},${bytes[i + 2]}`);
    return colors.size;
  });
  check(`${name} renders nonblank textured canvas`, pixels > 50);
  const before = await canvas.evaluate((c) => c.toDataURL());
  await page.waitForTimeout(450);
  check(
    `${name} moves`,
    before !== (await canvas.evaluate((c) => c.toDataURL())),
  );
  await noOverflow(`${name} fits viewport`);
}
try {
  await go("/");
  await page.evaluate(() => {
    localStorage.removeItem("vibeplacement:guide-v1");
    localStorage.removeItem("vibeplacement:state-v2");
  });
  await page.reload();
  await guide.waitFor();
  await page.waitForTimeout(250);
  check(
    "First visit opens guide and makes background inert",
    await page.locator(".app-shell").evaluate((el) => el.inert),
  );
  await page.screenshot({ path: "artifacts/journey-guide-welcome.png" });
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await spotlight("Maker CTA highlighted without panel overlap");
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await spotlight("Asset discovery highlighted");
  await guide
    .getByRole("button", { name: "Создать игру", exact: true })
    .click();
  const newGame = page.getByRole("dialog", { name: "Новая игра" });
  await newGame.waitFor();
  check("Guide finishes on real game creation");
  await newGame.getByLabel("Название игры").fill("Тестовый остров");
  await newGame
    .getByLabel("Идея", { exact: true })
    .fill("Исследуем остров и восстанавливаем маяк.");
  await newGame.getByRole("button", { name: "Создать игру" }).click();
  await page.locator(".game-workspace-heading h1").waitFor();
  const workspace = page.url();
  check(
    "Created game has a task workspace and explicit next steps",
    (await page.locator(".game-next-steps > *").count()) === 3,
  );
  await page.locator(".game-next-steps").getByRole("button").first().click();
  const task = page.getByRole("dialog", { name: "Новая задача" });
  await task.getByLabel("Сущность / название").fill("Анимация героя");
  await task
    .getByLabel("Требования", { exact: true })
    .fill("Spine: idle, walk и jump.");
  await task.getByRole("button", { name: "Сохранить задачу" }).click();
  await page
    .getByRole("button", { name: "Анимация героя", exact: true })
    .waitFor();
  await page.locator(".game-next-steps").getByRole("button").last().click();
  const recruit = page.getByRole("dialog", { name: "Собрать команду" });
  check(
    "Recruitment prefills the existing game",
    (await recruit.getByLabel("Название проекта").inputValue()) ===
      "Тестовый остров",
  );
  await recruit.getByRole("button", { name: "Дальше" }).click();
  await recruit.locator("input[placeholder]").first().fill("Spine-аниматор");
  await recruit.getByRole("button", { name: "Создать проект" }).click();
  await page.locator(".project-page h1").waitFor();
  check(
    "Public recruitment links back to its game",
    (await page.locator(".back-link").getAttribute("href")).includes("/games/"),
  );
  await page.reload();
  await page.locator(".back-link").click();
  await page.getByRole("link", { name: /Открыть своё объявление/ }).waitFor();
  check(
    "Game and recruitment stay connected after reload",
    page.url() === workspace &&
      (await page
        .getByRole("link", { name: /Открыть своё объявление/ })
        .count()) === 1,
  );
  await page.screenshot({
    path: "artifacts/journey-game-workspace.png",
    fullPage: true,
  });
  await go("/");
  check("Tour completion persists", (await guide.count()) === 0);
  await page.screenshot({
    path: "artifacts/journey-start-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Открыть гайд" }).click();
  await page.getByRole("button", { name: "Я креатор", exact: true }).click();
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await spotlight("Creator publish action highlighted");
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
  await spotlight("Creator project search highlighted");
  await guide
    .getByRole("button", { name: "Опубликовать работу", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  check(
    "Creator tour opens publication form",
    (await page.locator(".guide-panel").count()) === 0,
  );
  await page.keyboard.press("Escape");
  await go("/discover");
  await page.getByLabel("Жанр игры", { exact: true }).selectOption("novel");
  await page.waitForFunction(
    () => document.querySelectorAll(".project-card").length === 1,
  );
  check(
    "Separate project search retains genre filters",
    (await page.locator(".project-card").count()) === 1,
  );
  await go("/?category=animation");
  await page.locator('[data-work="spine-scout"]').waitFor();
  check(
    "Existing catalog URLs redirect correctly",
    page.url().includes("/market?") &&
      (await page.locator('[data-work="spine-scout"]').count()) === 1,
  );
  await viewerCheck("3d", ".model-viewer canvas", "Desktop 3D");
  await viewerCheck("animation", ".spine-stage canvas", "Desktop Spine");
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await go("/");
    await noOverflow(`Start fits ${viewport.width}`);
    await page.screenshot({
      path: `artifacts/journey-start-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Открыть гайд" }).click();
    await page.getByRole("button", { name: "Я креатор", exact: true }).click();
    await page.getByRole("button", { name: "Дальше", exact: true }).click();
    await spotlight(`Mobile ${viewport.width} creator action visible`);
    await page.screenshot({
      path: `artifacts/journey-guide-${viewport.width}.png`,
    });
    await page.getByRole("button", { name: "Дальше", exact: true }).click();
    await spotlight(`Mobile ${viewport.width} project action visible`);
    await noOverflow(`Guide fits ${viewport.width}`);
    await page.keyboard.press("Escape");
    check(
      `Escape restores page ${viewport.width}`,
      (await guide.count()) === 0 &&
        !(await page.locator(".app-shell").evaluate((el) => el.inert)),
    );
  }
  await page.getByRole("button", { name: "Открыть гайд" }).click();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  check(
    "Keyboard focus stays inside guide",
    await guide.evaluate((el) => el.contains(document.activeElement)),
  );
  await guide.getByRole("button", { name: "Пропустить", exact: true }).click();
  await page.reload();
  check("Skip persists across reload", (await guide.count()) === 0);
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page
    .getByRole("link", { name: "Ассеты и услуги", exact: true })
    .click();
  await page.waitForURL((value) => value.href.includes("/market"));
  check(
    "Mobile menu exposes marketplace destination",
    page.url().includes("/market") &&
      !(
        (await page
          .getByRole("button", { name: "Открыть меню" })
          .getAttribute("aria-expanded")) === "true"
      ),
  );
  await viewerCheck("3d", ".model-viewer canvas", "Mobile 3D");
  await viewerCheck("animation", ".spine-stage canvas", "Mobile Spine");
  check("No application or asset errors", errors.length === 0);
  await writeFile(
    `artifacts/journeys-${remote ? "pages" : "local"}.json`,
    JSON.stringify({ checks, errors }, null, 2),
  );
} catch (error) {
  await page
    .screenshot({ path: "artifacts/journey-failure.png", fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await context.close();
}
