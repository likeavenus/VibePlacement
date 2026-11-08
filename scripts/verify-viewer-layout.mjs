import { chromium } from "playwright";
import path from "node:path";
import assert from "node:assert/strict";
process.env.TEMP = process.env.TMP = process.env.TMPDIR = path.join(process.cwd(), ".tmp");
const browser = await chromium.launchPersistentContext(path.join(process.cwd(), ".cache", "viewer-layout"), { executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
const page = browser.pages()[0], errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://localhost:5186";
try {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.locator(".motion-preview").first().waitFor();
    await page.getByRole("progressbar").waitFor({ state: "detached" });
    await page.screenshot({ path: "artifacts/final-feed-" + width + ".png" });
    const typography = await page.locator("#main-content").evaluate((main) => [...main.querySelectorAll("*")].filter((el) => {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()) && parseFloat(style.fontSize) > 0 && parseFloat(style.fontSize) < 14 && style.visibility !== "hidden";
    }).map((el) => ({ tag: el.tagName, text: el.textContent.slice(0, 60), size: getComputedStyle(el).fontSize })));
    assert.deepEqual(typography, []);
    await page.goto(base + "/?category=writing");
    await page.getByRole("button", { name: "Читать сценарий" }).click();
    await page.getByRole("dialog").getByRole("heading", { name: "Последний поезд" }).waitFor();
    const reader = page.getByRole("dialog");
    assert.ok(await reader.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: "artifacts/final-story-" + width + ".png" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Опубликовать работу", exact: true }).first().click();
    let dialog = page.getByRole("dialog", { name: "Опубликовать работу" });
    await dialog.getByLabel("Направление работы").selectOption("3d");
    await dialog.getByLabel("Файлы работы").setInputFiles(".tmp/model-validation.fbx");
    await dialog.getByText("Файлы готовы", { exact: true }).waitFor({ timeout: 30000 });
    await dialog.locator("canvas").scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const canvas = dialog.locator("canvas");
    const bounds = await canvas.boundingBox();
    await page.screenshot({ path: "artifacts/framing-before-" + width + ".png" });
    const stats = await canvas.evaluate((canvas) => {
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl"), bytes = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      const colors = new Set(); let changed = 0, clipped = 0;
      for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) {
        const i=(y*canvas.width+x)*4;
        if(bytes[i]!==bytes[0]||bytes[i+1]!==bytes[1]||bytes[i+2]!==bytes[2]) {
          changed++;
          if(x<2||y<2||x>canvas.width-3||y>canvas.height-3) clipped++;
        }
        if(i%64===0) colors.add(bytes[i]+","+bytes[i+1]+","+bytes[i+2]);
      }
      return { colors: colors.size, changed, clipped, total: canvas.width*canvas.height };
    });
    assert.ok(stats.colors > 8 && stats.changed / stats.total > .03 && stats.clipped === 0, JSON.stringify(stats));
    const before = await canvas.evaluate((canvas) => canvas.toDataURL());
    const centerX = bounds.x + bounds.width / 2, centerY = Math.max(120, Math.min(850, bounds.y + bounds.height / 2));
    await page.mouse.move(centerX, centerY);
    await page.mouse.down(); await page.mouse.move(centerX + 40, centerY, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(200);
    assert.notEqual(before, await canvas.evaluate((canvas) => canvas.toDataURL()));
    await page.screenshot({ path: "artifacts/final-uploaded-model-" + width + ".png" });
    await page.keyboard.press("Escape");
    await page.goto(base + "/?category=writing");
    await page.getByRole("button", { name: "Опубликовать работу", exact: true }).first().click();
    dialog = page.getByRole("dialog", { name: "Опубликовать работу" });
    await dialog.getByLabel("Действие", { exact: true }).fill("На пустом перроне почтальон находит письмо.");
    await dialog.getByRole("button", { name: "Добавить сцену" }).click();
    await dialog.getByLabel("Действие", { exact: true }).nth(1).fill("Часы начинают идти назад.");
    await dialog.getByRole("button", { name: "Поднять сцену 2" }).click();
    assert.equal(await dialog.getByLabel("Действие", { exact: true }).first().inputValue(), "Часы начинают идти назад.");
    await dialog.getByRole("button", { name: "Удалить сцену 2" }).click();
    await dialog.getByRole("button", { name: "Проверить сценарий", exact: true }).click();
    await dialog.getByText("Файлы готовы", { exact: true }).waitFor();
    await dialog.getByLabel("Действие", { exact: true }).fill("Изменённый текст.");
    assert.equal(await dialog.getByText("Файлы готовы", { exact: true }).count(), 0);
    assert.ok(await dialog.getByRole("button", { name: "Опубликовать", exact: true }).isDisabled());
    assert.ok(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await dialog.getByLabel("Направление работы").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "artifacts/final-story-editor-" + width + ".png" });
    await page.keyboard.press("Escape");
    console.log("PASS typography, story reader/editor, framed and interactive imported FBX at", width);
  }
  assert.deepEqual(errors, []);
  console.log("PASS no browser errors");
} catch(error) {
  await page.screenshot({ path: "artifacts/viewer-layout-failure.png", fullPage: true });
  throw error;
} finally { await browser.close(); }
