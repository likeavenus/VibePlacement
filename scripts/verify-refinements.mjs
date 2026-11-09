import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = process.cwd();
process.env.TEMP =
  process.env.TMP =
  process.env.TMPDIR =
    path.join(root, ".tmp");
await mkdir("artifacts", { recursive: true });
const context = await chromium.launchPersistentContext(
  path.join(root, ".cache", "refinements-verification"),
  {
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    viewport: { width: 1440, height: 1050 },
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
);
const page = context.pages()[0],
  base = "http://127.0.0.1:5186",
  errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const check = (name, condition = true) => {
  assert.ok(condition, name);
  checks.push(name);
  console.log("PASS", name);
};
const png = await readFile("public/assets/spine/spineboy.png");
const jpg = await readFile("public/assets/flower-poster.jpg");
const cube = Buffer.from(
  "o Cube\nv -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 4 8 7 3\nf 1 5 8 4\nf 2 3 7 6\n",
);
const wav = Buffer.alloc(44 + 16000);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24);
wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(16000, 40);
for (let i = 0; i < 8000; i++)
  wav.writeInt16LE(
    Math.round(Math.sin((i * 2 * Math.PI * 440) / 8000) * 1000),
    44 + i * 2,
  );
const vertices = Buffer.alloc(36);
[-1, -1, 0, 1, -1, 0, 0, 1, 0].forEach((n, i) =>
  vertices.writeFloatLE(n, i * 4),
);
let json = JSON.stringify({
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  buffers: [{ byteLength: 36 }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      count: 3,
      type: "VEC3",
      min: [-1, -1, 0],
      max: [1, 1, 0],
    },
  ],
});
json += " ".repeat((4 - (Buffer.byteLength(json) % 4)) % 4);
const jsonBytes = Buffer.from(json),
  glb = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + vertices.length);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonBytes.length, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
jsonBytes.copy(glb, 20);
glb.writeUInt32LE(vertices.length, 20 + jsonBytes.length);
glb.writeUInt32LE(0x004e4942, 24 + jsonBytes.length);
vertices.copy(glb, 28 + jsonBytes.length);
const file = (name, buffer, mimeType = "application/octet-stream") => ({
  name,
  buffer,
  mimeType,
});
let dialog;
async function direction(id) {
  await dialog.getByLabel("Направление работы").selectOption(id);
  await page.waitForTimeout(50);
}
async function rejectUpload(payload, pattern) {
  await dialog.getByLabel("Файлы работы").setInputFiles(payload);
  await dialog.getByRole("alert").waitFor();
  check(
    "Reject " + payload.name,
    pattern.test(await dialog.getByRole("alert").innerText()),
  );
  check(
    "Invalid upload disables publication",
    await dialog
      .getByRole("button", { name: "Опубликовать", exact: true })
      .isDisabled(),
  );
}
async function acceptUpload(payload, name) {
  await dialog.getByLabel("Файлы работы").setInputFiles(payload);
  await dialog
    .getByText("Файлы готовы", { exact: true })
    .waitFor({ timeout: 30000 });
  check(name);
}
async function pixels(locator) {
  return locator.evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      bytes = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(
      0,
      0,
      canvas.width,
      canvas.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bytes,
    );
    const colors = new Set();
    for (let i = 0; i < bytes.length; i += 64)
      colors.add(bytes[i] + "," + bytes[i + 1] + "," + bytes[i + 2]);
    return colors.size;
  });
}
try {
  await page.goto(base + "/market");
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("vibeplacement:guide-v1", "done");
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("vibeplacement-assets");
      request.onsuccess = resolve;
      request.onerror = resolve;
    });
  });
  await page.reload();
  await page.getByRole("heading", { name: "Ассеты и услуги." }).waitFor();
  await page.locator(".sidebar-directions summary").click();
  check(
    "New directions in navigation",
    (await page
      .getByRole("navigation", { name: "Категории" })
      .getByText("Моушн-дизайн")
      .isVisible()) &&
      (await page
        .getByRole("navigation", { name: "Категории" })
        .getByText("UX/UI-дизайн")
        .isVisible()),
  );
  check(
    "Code direction retired",
    !/Код и вайбкодинг|КОД \/ ВАЙБКОДИНГ/.test(
      await page.locator("body").innerText(),
    ),
  );
  await page.route("**/src/features/profile/Profile.tsx*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.getByRole("link", { name: "Креаторы", exact: true }).click();
  await page.getByRole("progressbar", { name: "Загрузка страницы" }).waitFor();
  check("Progress visible while route loads");
  await page.getByRole("heading", { name: "Креаторы." }).waitFor();
  await page.getByRole("progressbar").waitFor({ state: "detached" });
  check("Progress completes after route ready");
  await page.unroute("**/src/features/profile/Profile.tsx*");
  await page.goBack();
  await page.getByRole("heading", { name: "Ассеты и услуги." }).waitFor();
  await page
    .getByRole("button", { name: "Опубликовать работу", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog", { name: "Опубликовать работу" });
  check(
    "All eight directions publishable",
    (await dialog
      .getByLabel("Направление работы")
      .locator("option")
      .count()) === 8,
  );
  await direction("3d");
  check(
    "3D accept is isolated",
    (await dialog.getByLabel("Файлы работы").getAttribute("accept")) ===
      ".glb,.fbx,.obj",
  );
  await rejectUpload(file("picture.png", png, "image/png"), /не подходит/);
  await rejectUpload(file("renamed.fbx", png), /не является FBX/);
  await rejectUpload(file("broken.glb", Buffer.from("glTFbroken")), /GLB/);
  await acceptUpload(file("cube.obj", cube), "OBJ parses and previews");
  await dialog.locator("canvas").waitFor();
  await page.waitForTimeout(500);
  check(
    "Uploaded OBJ renders geometry",
    (await pixels(dialog.locator("canvas"))) > 3,
  );
  const before = await dialog.locator("canvas").evaluate((c) => c.toDataURL());
  const box = await dialog.locator("canvas").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 20,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.waitForTimeout(150);
  check(
    "Uploaded model can rotate",
    before !== (await dialog.locator("canvas").evaluate((c) => c.toDataURL())),
  );
  await page.screenshot({
    path: "artifacts/publication-model.png",
    fullPage: true,
  });
  await acceptUpload(file("triangle.glb", glb), "GLB parses successfully");
  await acceptUpload(
    ".tmp/model-validation.fbx",
    "Real FBX parses successfully",
  );
  await dialog.locator("canvas").waitFor();
  await page.waitForTimeout(600);
  check("FBX visible in viewer", (await pixels(dialog.locator("canvas"))) > 8);
  await page.screenshot({ path: "artifacts/publication-fbx.png" });
  await direction("ux");
  check(
    "Direction switch clears old preview",
    (await dialog.getByText("Файлы готовы").count()) === 0,
  );
  await rejectUpload(
    file("broken.png", Buffer.from("not a png"), "image/png"),
    /не соответствует/,
  );
  await acceptUpload(
    [
      file("screen-a.png", png, "image/png"),
      file("screen-b.jpg", jpg, "image/jpeg"),
    ],
    "UX screens accept multiple images",
  );
  await dialog.getByRole("button", { name: "Следующий экран" }).click();
  check(
    "UX gallery navigates",
    await dialog
      .locator(".gallery-controls")
      .innerText()
      .then((value) => value.includes("2 / 2")),
  );
  await dialog
    .getByLabel("Название", { exact: true })
    .fill("Интерфейс тестовой игры");
  await dialog
    .getByLabel("Описание", { exact: true })
    .fill("Два экрана интерфейса для проверки галереи.");
  await dialog
    .getByLabel("Публикация", { exact: true })
    .selectOption("showcase");
  await dialog
    .getByLabel(
      "У меня есть права на публикацию и выбранный способ использования.",
    )
    .check();
  await dialog
    .getByRole("button", { name: "Опубликовать", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  await page.goto(base + "/?category=ux");
  await page
    .getByRole("button", { name: "Интерфейс тестовой игры", exact: true })
    .waitFor();
  await page.reload();
  await page.locator(".gallery-controls").waitFor();
  check("UX upload survives reload in correct section");
  await page
    .getByRole("button", { name: "Опубликовать работу", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog", { name: "Опубликовать работу" });
  await direction("motion");
  await rejectUpload(file("music.mp3", wav, "audio/mpeg"), /не подходит/);
  await rejectUpload(file("fake.mp4", png, "video/mp4"), /не соответствует/);
  await acceptUpload("public/assets/flower.mp4", "Motion video decodes");
  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  );
  await acceptUpload(file("title.gif", gif, "image/gif"), "Motion GIF decodes");
  await direction("video");
  await rejectUpload(file("title.gif", gif, "image/gif"), /не подходит/);
  await acceptUpload("public/assets/flower.mp4", "Video direction decodes MP4");
  await direction("audio");
  await rejectUpload(file("renamed.wav", png, "audio/wav"), /не соответствует/);
  await acceptUpload(file("tone.wav", wav, "audio/wav"), "WAV audio decodes");
  await direction("art");
  await acceptUpload(file("art.png", png, "image/png"), "Art image decodes");
  await direction("animation");
  await rejectUpload(file("only.png", png, "image/png"), /JSON|json|atlas/);
  await acceptUpload(
    [
      "public/assets/spine/spineboy.json",
      "public/assets/spine/spineboy.atlas",
      "public/assets/spine/spineboy.png",
    ],
    "Spine bundle validates and renders",
  );
  await direction("writing");
  await dialog
    .getByRole("button", { name: "Загрузить файл", exact: true })
    .click();
  await rejectUpload(
    file("wrong.json", Buffer.from('{"hello":"world"}'), "application/json"),
    /редактора сцен/,
  );
  await rejectUpload(file("binary.txt", png, "text/plain"), /UTF-8|текст/);
  await acceptUpload(
    file(
      "chapter.md",
      Buffer.from("# Станция\n\nПоезд остановился у пустого перрона."),
      "text/markdown",
    ),
    "Markdown imports as manuscript",
  );
  await dialog
    .getByRole("button", { name: "Редактор сцен", exact: true })
    .click();
  await dialog
    .getByLabel("Название", { exact: true })
    .fill("Письмо из будущего");
  await dialog
    .getByLabel("Описание", { exact: true })
    .fill("Короткая история о письме и станции.");
  await dialog
    .getByLabel("Публикация", { exact: true })
    .selectOption("showcase");
  await dialog
    .getByLabel("Логлайн", { exact: true })
    .fill("Почтальон встречает себя на пустом перроне.");
  await dialog.getByLabel("Название сцены").fill("Прибытие");
  await dialog
    .getByLabel("Действие", { exact: true })
    .fill("На перроне лежит забытый конверт.");
  await dialog.getByLabel("Персонаж", { exact: true }).fill("ПОЧТАЛЬОН");
  await dialog.getByLabel("Реплика", { exact: true }).fill("Я здесь уже был.");
  await dialog.getByRole("button", { name: "Добавить сцену" }).click();
  await dialog.getByLabel("Название сцены").nth(1).fill("Встреча");
  await dialog
    .getByLabel("Действие", { exact: true })
    .nth(1)
    .fill("Из тени выходит смотритель.");
  const nextId = await dialog
    .getByLabel("Переход", { exact: true })
    .first()
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await dialog
    .getByLabel("Переход", { exact: true })
    .first()
    .selectOption(nextId);
  await dialog
    .getByRole("button", { name: "Проверить сценарий", exact: true })
    .click();
  await dialog.getByText("Файлы готовы", { exact: true }).waitFor();
  await dialog
    .getByLabel(
      "У меня есть права на публикацию и выбранный способ использования.",
    )
    .check();
  await dialog
    .getByRole("button", { name: "Опубликовать", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  await page.goto(base + "/?category=writing");
  await page
    .getByRole("button", { name: "Письмо из будущего", exact: true })
    .waitFor();
  await page.reload();
  const storyCard = page
    .locator(".work-card")
    .filter({
      has: page.getByRole("button", {
        name: "Письмо из будущего",
        exact: true,
      }),
    });
  await storyCard.getByRole("button", { name: "Читать сценарий" }).click();
  const reader = page.getByRole("dialog", { name: "Сценарий", exact: true });
  await reader.getByRole("heading", { name: "Прибытие" }).waitFor();
  check("Authored story persists and opens as manuscript");
  await reader.getByRole("button", { name: "Следующая сцена" }).click();
  await reader.getByRole("heading", { name: "Встреча" }).waitFor();
  check("Reader navigates between scenes");
  await reader.getByRole("button", { name: "Связи сцен" }).click();
  check(
    "Scene links resolve",
    await reader
      .locator(".story-map")
      .innerText()
      .then((text) => text.includes("Встреча") && text.includes("Финал")),
  );
  await reader.getByRole("button", { name: "Связи сцен" }).click();
  await page.screenshot({ path: "artifacts/story-reader.png" });
  await page.keyboard.press("Escape");
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/favorites",
      "/games/little-station",
      "/studio",
      "/?category=writing",
      "/?category=motion",
      "/?category=ux",
    ]) {
      await page.goto(base + route);
      await page.locator("#main-content h1").waitFor();
      await page.waitForTimeout(300);
      check(
        "No overflow " + width + " " + route,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page
      .getByRole("button", { name: "Опубликовать работу", exact: true })
      .first()
      .click();
    dialog = page.getByRole("dialog", { name: "Опубликовать работу" });
    check(
      "Publication has no overflow at " + width,
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    check(
      "Publication input uses 16px at " + width,
      await dialog
        .getByLabel("Название", { exact: true })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
    );
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: "artifacts/publication-" + width + ".png",
      });
    await page.keyboard.press("Escape");
    await page.goto(base);
    await page.waitForTimeout(700);
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: "artifacts/refinements-" + width + ".png",
        fullPage: width === 1440,
      });
  }
  check("No browser errors", errors.length === 0);
  await writeFile(
    "artifacts/refinements-verification.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: checks.length, errors }));
} catch (error) {
  await page
    .screenshot({ path: "artifacts/refinements-failure.png", fullPage: true })
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
