import { z } from "zod";

const sceneSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  location: z.string().max(160),
  action: z.string().max(12000),
  speaker: z.string().max(80),
  dialogue: z.string().max(12000),
  next: z.string().max(80),
});
export const storySchema = z
  .object({
    version: z.literal(1),
    logline: z.string().max(500),
    genre: z.string().max(80),
    scenes: z.array(sceneSchema).min(1).max(30),
  })
  .superRefine((story, ctx) => {
    const ids = new Set(story.scenes.map((s) => s.id));
    if (ids.size !== story.scenes.length)
      ctx.addIssue({
        code: "custom",
        message: "Идентификаторы сцен должны быть уникальны.",
      });
    if (JSON.stringify(story).length > 100000)
      ctx.addIssue({
        code: "custom",
        message: "Сценарий: максимум 100 000 знаков.",
      });
    for (const scene of story.scenes) {
      if (!scene.action.trim() && !scene.dialogue.trim())
        ctx.addIssue({
          code: "custom",
          message: `Добавьте действие или реплику: ${scene.title}.`,
        });
      if (scene.next && !ids.has(scene.next))
        ctx.addIssue({
          code: "custom",
          message: `Не найдена следующая сцена: ${scene.title}.`,
        });
    }
  });
export type Story = z.infer<typeof storySchema>;
export type Scene = Story["scenes"][number];
export const newScene = (): Scene => ({
  id: crypto.randomUUID(),
  title: "Новая сцена",
  location: "",
  action: "",
  speaker: "",
  dialogue: "",
  next: "",
});
export const blankStory = (): Story => ({
  version: 1,
  logline: "",
  genre: "",
  scenes: [newScene()],
});
export const demoStory: Story = {
  version: 1,
  genre: "Тихая фантастика",
  logline:
    "Почтальон находит письмо, которое отправил сам себе тридцать лет назад.",
  scenes: [
    {
      id: "platform",
      title: "Последний поезд",
      location: "ЭКСТ. ПЕРРОН · СУМЕРКИ",
      action:
        "На пустой перрон падает первый снег. Поезд уходит без звука. В сумке почтальона остаётся одно письмо: знакомый почерк, незнакомая дата.",
      speaker: "СМОТРИТЕЛЬ",
      dialogue:
        "Ты ведь не за билетом пришёл? Здесь все сначала спрашивают расписание. А потом достают письмо.",
      next: "letter",
    },
    {
      id: "letter",
      title: "Чужой почерк",
      location: "ИНТ. ЗАЛ ОЖИДАНИЯ · ВЕЧЕР",
      action:
        "Почтальон кладёт конверт на стол. Часы идут назад. Под маркой проступает его детская подпись.",
      speaker: "ПОЧТАЛЬОН",
      dialogue: "Если это моё письмо, почему я не помню, что в нём?",
      next: "departure",
    },
    {
      id: "departure",
      title: "Обратный адрес",
      location: "ЭКСТ. ПЕРРОН · РАССВЕТ",
      action:
        "Вместо адреса на конверте появляется название станции. Почтальон оставляет сумку на скамье и делает шаг к открытой двери.",
      speaker: "СМОТРИТЕЛЬ",
      dialogue:
        "Некоторые письма доставляют не по адресу. Они доставляют домой.",
      next: "",
    },
  ],
};
export async function readStory(file: File): Promise<Story> {
  if (file.size > 400000) throw new Error("Сценарий: максимум 100 000 знаков.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true })
      .decode(await file.arrayBuffer())
      .replace(/^\uFEFF/, "");
  } catch {
    throw new Error("Сценарий должен быть текстом UTF-8.");
  }
  if (
    !text.trim() ||
    text.length > 100000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text)
  )
    throw new Error("Файл не содержит допустимый текст сценария.");
  if (file.name.toLowerCase().endsWith(".json")) {
    try {
      return storySchema.parse(JSON.parse(text));
    } catch {
      throw new Error(
        "JSON не соответствует формату редактора сцен (version, logline, genre, scenes).",
      );
    }
  }
  const paragraphs = text.split(/\n\s*\n/);
  const scenes: Scene[] = [];
  let content = "";
  const flush = () => {
    if (!content.trim()) return;
    scenes.push({
      ...newScene(),
      title: `Фрагмент ${scenes.length + 1}`,
      action: content.trim(),
    });
    content = "";
  };
  for (const paragraph of paragraphs) {
    for (let offset = 0; offset < paragraph.length; offset += 10000) {
      const part = paragraph.slice(offset, offset + 10000);
      if (content.length + part.length > 12000) flush();
      content += (content ? "\n\n" : "") + part;
    }
  }
  flush();
  return storySchema.parse({ version: 1, genre: "", logline: "", scenes });
}
