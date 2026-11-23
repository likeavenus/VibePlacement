const maxDataUrlLength = 550_000;

export async function readGameImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Выберите файл изображения");
  if (file.size > 20_000_000) throw new Error("Файл больше 20 МБ");

  const source = URL.createObjectURL(file);
  const image = new Image();
  image.src = source;
  try {
  await image.decode().catch(() => { throw new Error("Браузер не смог открыть фото. Попробуйте PNG или JPEG."); });
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Не удалось определить размер изображения");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Браузер не смог обработать изображение");
  // Safari can decode WebP while canvas exports PNG instead. Detect the encoder.
  canvas.width = canvas.height = 1;
  const supportsWebP = canvas.toDataURL("image/webp").startsWith("data:image/webp;");
  let scale = Math.min(1, 1440 / image.naturalWidth, 1440 / image.naturalHeight);
  for (let sizePass = 0; sizePass < 10; sizePass++, scale *= 0.75) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    if (!supportsWebP) {
      const png = canvas.toDataURL("image/png");
      if (png.length <= maxDataUrlLength) return png;
      // Keep transparent PNGs transparent by reducing dimensions, not converting to JPEG.
      if (file.type !== "image/jpeg") {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        continue;
      }
    }
    for (const quality of [0.86, 0.7, 0.54]) {
      const result = canvas.toDataURL(supportsWebP ? "image/webp" : "image/jpeg", quality);
      if (result.startsWith("data:image/") && result.length <= maxDataUrlLength) return result;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Не удалось подготовить изображение. Попробуйте уменьшить его размер.");
  } finally { URL.revokeObjectURL(source); }
}
