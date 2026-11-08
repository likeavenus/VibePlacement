import { checkFileSize, type AssetBundle } from "./assets";
import { directionFor } from "./categories";
import type { Category } from "./types";
import { readStory, type Story } from "./story";

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  new TextDecoder().decode(bytes.slice(offset, offset + length));
async function validateImage(file: File, ext: string) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signature =
    ext === "png"
      ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
      : ["jpg", "jpeg"].includes(ext)
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : ext === "webp"
          ? ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP"
          : /^GIF8[79]a$/.test(ascii(bytes, 0, 6));
  if (!signature)
    throw new Error(
      `Содержимое ${file.name} не соответствует расширению .${ext}.`,
    );
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`Не удалось открыть изображение ${file.name}.`);
  });
  const valid =
    bitmap.width > 0 &&
    bitmap.height > 0 &&
    bitmap.width <= 8192 &&
    bitmap.height <= 8192 &&
    bitmap.width * bitmap.height <= 32000000;
  bitmap.close();
  if (!valid)
    throw new Error("Изображение: до 8192 px по стороне и 32 млн пикселей.");
}
async function validateMedia(file: File, kind: "audio" | "video", ext: string) {
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const valid =
    ext === "wav"
      ? ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE"
      : ext === "mp3"
        ? ascii(bytes, 0, 3) === "ID3" ||
          (bytes[0] === 255 && (bytes[1] & 224) === 224)
        : ext === "flac"
          ? ascii(bytes, 0, 4) === "fLaC"
          : ext === "ogg"
            ? ascii(bytes, 0, 4) === "OggS" &&
              /OpusHead|vorbis|fLaC/.test(ascii(bytes, 0, 4096))
            : ext === "mp4"
              ? ascii(bytes, 4, 4) === "ftyp"
              : [26, 69, 223, 163].every((n, i) => bytes[i] === n);
  if (!valid)
    throw new Error(
      `Содержимое ${file.name} не соответствует формату .${ext}.`,
    );
  const url = URL.createObjectURL(file);
  const media = document.createElement(kind);
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => finish(new Error("Файл не удалось прочитать за 15 секунд.")),
        15000,
      );
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        media.onloadedmetadata = null;
        media.onerror = null;
        error ? reject(error) : resolve();
      };
      media.preload = "metadata";
      media.onloadedmetadata = () =>
        finish(
          !Number.isFinite(media.duration) ||
            media.duration <= 0 ||
            (kind === "video" && !(media as HTMLVideoElement).videoWidth)
            ? new Error("Нет воспроизводимой дорожки нужного типа.")
            : undefined,
        );
      media.onerror = () =>
        finish(
          new Error(
            "Файл повреждён или его кодек не поддерживается браузером.",
          ),
        );
      media.src = url;
    });
  } finally {
    media.removeAttribute("src");
    media.load();
    URL.revokeObjectURL(url);
  }
}
export async function validateUpload(
  category: Category,
  files: File[],
): Promise<{ kind: AssetBundle["kind"]; animations: string[]; story?: Story }> {
  checkFileSize(files);
  const direction = directionFor(category),
    allowed = direction.accept.split(",");
  for (const file of files) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!file.size) throw new Error(`Файл ${file.name} пуст.`);
    if (!allowed.includes(ext))
      throw new Error(
        `Для этого направления: ${direction.formats}. Файл ${file.name} не подходит.`,
      );
  }
  if (category === "animation") {
    const { validateSpineFiles } =
      await import("../components/viewers/spineAssets");
    // Verify PNG bytes and decoding as well as atlas references.
    for (const file of files.filter((f) => /\.png$/i.test(f.name)))
      await validateImage(file, "png");
    return { kind: "spine", animations: await validateSpineFiles(files) };
  }
  if (category === "art" || category === "ux") {
    if (files.length > 8)
      throw new Error("В одной работе может быть до 8 изображений.");
    for (const file of files)
      await validateImage(file, file.name.split(".").pop()!.toLowerCase());
    return { kind: "image", animations: [] };
  }
  if (files.length !== 1) throw new Error("Выберите один основной файл.");
  const file = files[0],
    ext = file.name.split(".").pop()!.toLowerCase();
  if (category === "3d") {
    const { loadModel, disposeModel } =
      await import("../components/viewers/modelAssets");
    const model = await loadModel(file);
    disposeModel(model);
    return { kind: "model", animations: [] };
  }
  if (category === "writing")
    return { kind: "script", animations: [], story: await readStory(file) };
  if (category === "motion" && ext === "gif") {
    await validateImage(file, ext);
    return { kind: "image", animations: [] };
  }
  const kind = category === "audio" ? "audio" : "video";
  await validateMedia(file, kind, ext);
  return { kind, animations: [] };
}
