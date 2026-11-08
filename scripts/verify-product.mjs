import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = process.cwd(),
  temp = path.join(root, ".tmp");
await mkdir(temp, { recursive: true });
await mkdir("artifacts", { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
process.env.TMPDIR = temp;
const context = await chromium.launchPersistentContext(
  path.join(root, ".cache", "product-verification"),
  {
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    viewport: { width: 1440, height: 1050 },
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
);
const page = context.pages()[0],
  errors = [],
  checks = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const base = "http://127.0.0.1:5186";
async function navigate(url) {
  await page.goto(url);
  await page.locator("#main-content h1").waitFor();
}
const check = (name, condition) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log("PASS", name);
};
async function readySpine(scope = page) {
  if (scope === page)
    await page.locator(".viewer-spine").first().scrollIntoViewIfNeeded();
  await scope.locator(".spine-stage canvas").first().waitFor();
  await scope
    .getByLabel("Анимация", { exact: true })
    .first()
    .locator("option")
    .nth(1)
    .waitFor({ state: "attached" });
  await page.waitForTimeout(700);
}
async function pixels(locator) {
  return locator.evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    const data = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
    const colors = new Set();
    let opaque = 0;
    for (let i = 0; i < data.length; i += 64) {
      if (data[i + 3] > 0) opaque++;
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return { colors: colors.size, opaque };
  });
}
try {
  await navigate(base);
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase("vibeplacement-assets");
  });
  await page.reload();
  await page.locator("#main-content h1").waitFor();
  await readySpine();
  await page.locator(".model-viewer canvas").waitFor();
  await page.waitForTimeout(600);
  check(
    "VibePlacement branding",
    (await page.title()) === "VibePlacement — твоя игра начинается здесь",
  );
  check(
    "Golos Text is loaded",
    await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('14px "Golos Text Variable"');
    }),
  );
  check(
    "No shader publications",
    !/шейдер/i.test(await page.locator("body").innerText()) &&
      (await page.locator('[data-work="shader"]').count()) === 0,
  );
  let stats = await pixels(page.locator(".spine-stage canvas").first());
  check(
    "Spine renders textured geometry",
    stats.colors > 80 && stats.opaque > 100,
  );
  const initialImage = await page
    .locator(".spine-stage canvas")
    .first()
    .evaluate((c) => c.toDataURL());
  await page.waitForTimeout(400);
  check(
    "Spine animates",
    initialImage !==
      (await page
        .locator(".spine-stage canvas")
        .first()
        .evaluate((c) => c.toDataURL())),
  );
  await page.screenshot({
    path: "artifacts/vibeplacement-desktop.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "artifacts/vibeplacement-desktop-viewport.png",
  });
  await navigate(base + "/games/little-station");
  await page.getByRole("heading", { name: "Станция за облаками" }).waitFor();
  await page.screenshot({
    path: "artifacts/game-workspace.png",
    fullPage: true,
  });
  await navigate(base + "/studio");
  await page.locator(".design-preview").waitFor();
  await page.screenshot({ path: "artifacts/studio.png", fullPage: true });
  if (!process.argv.includes("--screenshots-only")) {
    await navigate(base + "/?category=animation");
    await readySpine();
    await page.getByLabel("Анимация", { exact: true }).selectOption("run");
    await page.getByLabel("Скорость анимации").selectOption("0.5");
    await page
      .getByRole("button", { name: "Приостановить анимацию", exact: true })
      .click();
    await page.waitForTimeout(200);
    const paused = await page
      .locator(".spine-stage canvas")
      .evaluate((c) => c.toDataURL());
    await page.waitForTimeout(300);
    check(
      "Pause freezes animation",
      paused ===
        (await page
          .locator(".spine-stage canvas")
          .evaluate((c) => c.toDataURL())),
    );
    await page.getByLabel("Позиция анимации").fill("0.1");
    check(
      "Seeking changes pose",
      paused !==
        (await page
          .locator(".spine-stage canvas")
          .evaluate((c) => c.toDataURL())),
    );
    await page.getByRole("button", { name: "Открыть анимации" }).click();
    const dialog = page.getByRole("dialog");
    await readySpine(dialog);
    await dialog.getByRole("button", { name: "Показать кости" }).click();
    await dialog.getByLabel("Масштаб персонажа").fill("1.2");
    await dialog.getByLabel("Скин персонажа").selectOption("default");
    await page.screenshot({ path: "artifacts/spine-expanded.png" });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Подробнее: Разведчик / набор анимаций" })
      .click();
    await page
      .getByLabel("Комментарий", { exact: true })
      .fill("Нужна отдельная анимация приземления.");
    await page.getByRole("button", { name: "Отправить комментарий" }).click();
    await page
      .getByText("Нужна отдельная анимация приземления.", { exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.reload();
    await page.locator("#main-content h1").waitFor();
    await page
      .getByRole("button", { name: "Подробнее: Разведчик / набор анимаций" })
      .click();
    check(
      "Comments persist",
      await page
        .getByText("Нужна отдельная анимация приземления.", { exact: true })
        .isVisible(),
    );
    await page.keyboard.press("Escape");
    await navigate(base + "/games/little-station");
    await page
      .getByRole("button", { name: "Добавить задачу", exact: true })
      .click();
    await page.getByLabel("Сущность / название").fill("Анимация проводника");
    await page
      .getByLabel("Требования")
      .fill("Spine 4.2, вид сбоку, экспорт JSON, atlas и PNG.");
    await page.getByLabel("Нужные анимации").fill("idle, walk, wave");
    await page.getByLabel("Бюджет, ₽", { exact: true }).fill("8500");
    await page.getByLabel("Статус", { exact: true }).selectOption("open");
    await page.getByRole("button", { name: "Сохранить задачу" }).click();
    await page
      .getByRole("button", { name: "Анимация проводника", exact: true })
      .waitFor();
    await page.reload();
    await page.locator("#main-content h1").waitFor();
    check(
      "Game task persists",
      await page
        .getByRole("button", { name: "Анимация проводника", exact: true })
        .isVisible(),
    );
    await page
      .getByRole("button", { name: "Анимация проводника", exact: true })
      .click();
    await page.getByLabel("Статус", { exact: true }).selectOption("done");
    await page.getByRole("button", { name: "Сохранить задачу" }).click();
    check(
      "Completion requires assignee",
      (await page.getByRole("alert").innerText()) === "Назначьте исполнителя.",
    );
    await page.getByLabel("Исполнитель", { exact: true }).selectOption("kir");
    await page.getByRole("button", { name: "Сохранить задачу" }).click();
    check(
      "Completion requires deliverable",
      (await page.getByRole("alert").innerText()) ===
        "Прикрепите работу для проверки.",
    );
    await page.getByLabel("Прикреплённая работа").selectOption("spine-scout");
    await page.getByRole("button", { name: "Сохранить задачу" }).click();
    check(
      "Game task can be accepted with deliverable",
      await page
        .getByRole("row")
        .filter({ hasText: "Анимация проводника" })
        .innerText()
        .then((text) => text.includes("Принято")),
    );
    await navigate(base + "/?category=art");
    await page
      .getByRole("button", { name: "Подробнее: Твой следующий пиксельный мир" })
      .click();
    await page.getByRole("button", { name: "Купить ассет" }).click();
    await page.getByLabel("Добавить в игру").selectOption("little-station");
    await page.getByLabel("Понимаю, что это демо-покупка").check();
    await page
      .getByRole("button", { name: "Подтвердить демо-покупку" })
      .click();
    check(
      "Demo purchase unlocks library",
      await page.getByRole("button", { name: "Скачать файлы" }).isVisible(),
    );
    await page.keyboard.press("Escape");
    await navigate(base + "/library");
    check(
      "Purchased asset appears in library",
      (await page.locator('[data-work="pixel"]').count()) === 1,
    );
    await navigate(base + "/games/little-station");
    check(
      "Purchased asset added to game",
      await page
        .getByRole("button", {
          name: "Твой следующий пиксельный мир",
          exact: true,
        })
        .isVisible(),
    );
    await navigate(base + "/studio");
    await page
      .getByRole("button", { name: "Опубликовать работу", exact: true })
      .last()
      .click();
    let publish = page.getByRole("dialog");
    await publish
      .getByLabel("Название", { exact: true })
      .fill("Тестовый Spine-персонаж");
    await publish
      .getByLabel("Описание", { exact: true })
      .fill("Публикация для проверки воспроизведения и сохранения файлов.");
    await publish
      .getByLabel("Публикация", { exact: true })
      .selectOption("showcase");
    await publish
      .getByLabel("Файлы работы")
      .setInputFiles([
        "public/assets/spine/spineboy.json",
        "public/assets/spine/spineboy.atlas",
      ]);
    await publish.getByRole("alert").waitFor();
    check(
      "Missing Spine texture rejected",
      (await publish.getByRole("alert").innerText()).includes(
        "Не хватает текстуры",
      ),
    );
    await publish
      .getByLabel("Файлы работы")
      .setInputFiles([
        "public/assets/spine/spineboy.json",
        "public/assets/spine/spineboy.atlas",
        "public/assets/spine/spineboy.png",
      ]);
    await publish.getByText("Файлы готовы", { exact: true }).waitFor();
    await readySpine(publish);
    await publish
      .getByLabel(
        "У меня есть права на публикацию и выбранный способ использования.",
      )
      .check();
    await publish
      .getByRole("button", { name: "Опубликовать", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Тестовый Spine-персонаж", exact: true })
      .waitFor();
    await page.reload();
    await page.locator("#main-content h1").waitFor();
    await readySpine();
    check(
      "Published Spine files persist in IndexedDB",
      (await pixels(page.locator(".spine-stage canvas").first())).colors > 80,
    );
    await navigate(base + "/profile/denis");
    check(
      "Published work appears in profile",
      await page
        .getByRole("button", { name: "Тестовый Spine-персонаж", exact: true })
        .isVisible(),
    );
    await navigate(base + "/?category=ux");
    await page.getByRole("button", { name: "Карта", exact: true }).click();
    check(
      "UX preview switches screens",
      (await page.locator(".design-preview").innerText()).includes(
        "Северный остров",
      ),
    );
  }
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate(base + "/?category=animation");
    await readySpine();
    check(
      `Spine nonblank at ${width}px`,
      (await pixels(page.locator(".spine-stage canvas").first())).colors > 80,
    );
    check(
      `No overflow at ${width}px`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if (width === 390) {
      await page.screenshot({ path: "artifacts/spine-mobile.png" });
      await navigate(base);
      await readySpine();
      await page.screenshot({ path: "artifacts/vibeplacement-mobile.png" });
      await navigate(base + "/games/little-station");
      await page.screenshot({ path: "artifacts/game-mobile.png" });
      check(
        "Mobile workspace has no page overflow",
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await navigate(base);
    await page.locator('[data-work="panel"]').scrollIntoViewIfNeeded();
    const model = page.locator(".model-viewer canvas");
    await model.waitFor();
    await page.waitForTimeout(800);
    check(`3D model nonblank at ${width}px`, (await pixels(model)).colors > 40);
    const before = await model.evaluate((canvas) => canvas.toDataURL());
    await page.waitForTimeout(400);
    check(
      `3D model rotates at ${width}px`,
      before !== (await model.evaluate((canvas) => canvas.toDataURL())),
    );
    await page.screenshot({ path: `artifacts/model-${width}.png` });
  }
  check("No browser errors", errors.length === 0);
  await writeFile(
    "artifacts/product-verification.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: checks.length, errors }));
} catch (error) {
  await page
    .screenshot({ path: "artifacts/product-failure.png", fullPage: true })
    .catch(() => {});
  console.error(JSON.stringify({ checks, errors }, null, 2));
  throw error;
} finally {
  await page
    .evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("vibeplacement-assets");
    })
    .catch(() => {});
  await context.close();
}
