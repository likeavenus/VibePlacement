import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

process.env.TEMP = process.env.TMP = process.env.TMPDIR = path.join(process.cwd(), ".tmp", "story-map");
await mkdir(process.env.TEMP, { recursive: true });
await mkdir("artifacts", { recursive: true });
const base = process.env.VIBE_TEST_URL ?? "http://localhost:5184";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(5000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem("vibeplacement:guide-v1", "done"));

try {
  await page.goto(`${base}/games/little-station`);
  await page.getByRole("heading", { name: "Станция за облаками" }).waitFor();
  await page.getByRole("tab", { name: "Описание и лор" }).click();
  await page.getByRole("tab", { name: "Мир" }).waitFor();
  assert.equal(await page.locator(".document-story-map").isVisible(), true);

  await page.getByRole("tab", { name: "Мир" }).click();
  await page.getByLabel("Тип сущности", { exact: true }).selectOption("character");
  await page.getByLabel("Название сущности", { exact: true }).fill("Мира");
  await page.getByRole("button", { name: "Добавить в справочник" }).click();
  await page.getByRole("tab", { name: "Карта" }).click();

  await page.locator(".document-map-add summary").click();
  await page.locator(".document-map-add").getByRole("button", { name: "Глава", exact: true }).click();
  await page.getByLabel("Название части сюжета").fill("Северный остров");
  await page.getByLabel("Название части сюжета").blur();

  await page.locator(".document-map-add summary").click();
  await page.locator(".document-map-add").getByRole("button", { name: "Сцена", exact: true }).click();
  await page.getByLabel("Название части сюжета").fill("Встреча у маяка");
  await page.getByLabel("Описание части сюжета").fill("Мира передаёт письмо смотрителю.");
  await page.getByLabel("Описание части сюжета").blur();
  await page.getByLabel("Привязать персонажа, локацию или предмет").selectOption({ label: "Персонаж: Мира" });

  await page.getByRole("tab", { name: "План игры" }).click();
  const sceneNode = page.locator(".react-flow__node").filter({ has: page.locator('input[aria-label="Название: Встреча у маяка"]') });
  const beforeDrag = await sceneNode.boundingBox();
  assert.ok(beforeDrag);
  await page.mouse.move(beforeDrag.x + 40, beforeDrag.y + 15);
  await page.mouse.down();
  await page.mouse.move(beforeDrag.x + 65, beforeDrag.y + 65, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const afterDrag = await sceneNode.boundingBox();
  assert.ok(afterDrag && afterDrag.y > beforeDrag.y + 30, "Dragged scene stays visible at its new position");
  await sceneNode.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Продолжить сценой" }).click();
  await sceneNode.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Добавить развилку" }).click();
  await page.getByRole("button", { name: "Структура" }).click();
  assert.equal(await page.getByText("Северный остров", { exact: true }).isVisible(), true);
  const structureTitles = await page.locator(".gf-outline-content strong").allTextContents();
  assert.ok(structureTitles.indexOf("Северный остров") < structureTitles.indexOf("Встреча у маяка"), "Structure follows story connections");
  await page.getByRole("button", { name: "Добавить задачу" }).click();
  await page.getByLabel("Сущность / название").fill("Портрет смотрителя");
  await page.getByLabel("Требования").fill("Нарисовать портрет персонажа для сцены у маяка.");
  await page.getByLabel("Этап сюжета").selectOption({ label: "Встреча у маяка" });
  await page.getByRole("button", { name: "Сохранить задачу" }).click();

  await page.reload();
  await page.getByRole("heading", { name: "Станция за облаками" }).waitFor();
  const saved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("vibeplacement:state-v2") ?? "{}");
    return state.games?.find((game) => game.id === "little-station");
  });
  const scene = saved.graph.nodes.find((node) => node.title === "Встреча у маяка");
  assert.equal(scene.type, "scene");
  assert.match(scene.description, /передаёт письмо/);
  assert.equal(scene.entityIds.length, 1);
  assert.equal(saved.storyEntities[0].name, "Мира");
  assert.equal(saved.tasks.find((task) => task.title === "Портрет смотрителя").storyNodeId, scene.id);
  assert.equal(saved.graph.nodes.some((node) => node.type === "asset"), false);
  assert.equal(saved.graph.edges.some((edge) => edge.label === "Новый выбор"), true);
  const branches = saved.graph.edges.filter((edge) => edge.source === scene.id).map((edge) => saved.graph.nodes.find((node) => node.id === edge.target));
  assert.equal(branches.length, 2);
  assert.notEqual(branches[0].position.y, branches[1].position.y);
  await page.getByRole("tab", { name: "Описание и лор" }).click();
  await page.locator(".document-story-map").waitFor({ state: "visible" });
  await page.locator('.document-story-map .react-flow__node[data-id="root"]').waitFor({ state: "visible" });
  await page.locator('.document-story-map .react-flow__edge-path').first().waitFor({ state: "attached" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "artifacts/story-workspace-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.locator(".document-story-map").isVisible(), true);
  await page.screenshot({ path: "artifacts/story-workspace-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("Story workspace passed: chapters, scenes, labeled branch, entity links, separate creator tasks, persistence, mobile width.");
} finally {
  await browser.close();
}
