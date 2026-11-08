import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const temp = path.join(process.cwd(), ".tmp");
await mkdir(temp, { recursive: true });
process.env.TEMP = temp;
process.env.TMP = temp;
process.env.TMPDIR = temp;
const context = await chromium.launchPersistentContext(
  path.join(process.cwd(), ".cache", "poster-browser"),
  {
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  },
);
try {
  const page = context.pages()[0];
  await page.goto("http://127.0.0.1:5186/?category=video");
  const poster = await page.locator("video").evaluate(async (video) => {
    if (video.readyState < 2)
      await new Promise((resolve) =>
        video.addEventListener("loadeddata", resolve, { once: true }),
      );
    await new Promise((resolve) => {
      video.addEventListener("seeked", resolve, { once: true });
      video.currentTime = 0.5;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = Math.round((720 * video.videoHeight) / video.videoWidth);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  });
  await writeFile(
    "public/assets/flower-poster.jpg",
    Buffer.from(poster, "base64"),
  );
  console.log("Video poster generated.");
} finally {
  await context.close();
}
