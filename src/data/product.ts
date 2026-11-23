import { z } from "zod";
import { categoryIds } from "./categories";
export const categorySchema = z.enum(["all", ...categoryIds]);
export const taskStatus = {
  draft: "Черновик",
  open: "Поиск креатора",
  progress: "В работе",
  review: "На проверке",
  done: "Принято",
} as const;
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: categorySchema,
  direction: z.string().max(80).optional(),
  payment: z.enum(["fixed", "revshare"]).optional(),
  shareTerms: z.string().max(500).optional(),
  brief: z.string(),
  budget: z.number().finite().nonnegative(),
  status: z.enum(["draft", "open", "progress", "review", "done"]),
  assignee: z.string(),
  workId: z.string().optional(),
  storyNodeId: z.string().optional(),
  animations: z.array(z.string()),
  deadline: z.string(),
});
export const gameStoryEntitySchema = z.object({
  id: z.string(),
  type: z.enum(["character", "location", "item"]),
  name: z.string().min(1).max(80),
  description: z.string().max(600).default(""),
});
export type GameStoryEntity = z.infer<typeof gameStoryEntitySchema>;
export type DocumentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: { type: string; attrs?: Record<string, string | number | boolean | null> }[];
  content?: DocumentNode[];
};
const documentNodeSchema: z.ZodType<DocumentNode> = z.lazy(() => z.object({
  type: z.string(), text: z.string().optional(),
  attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  marks: z.array(z.object({ type: z.string(), attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional() })).optional(),
  content: z.array(documentNodeSchema).optional(),
}));
export const gameDocumentSchema = z.object({
  id: z.string(), title: z.string().min(1).max(80),
  content: z.object({ type: z.literal("doc"), content: z.array(documentNodeSchema) }),
});
export type GameDocument = z.infer<typeof gameDocumentSchema>;
export const teamSlotSchema = z.object({
  id: z.string(), role: z.string().min(1).max(80), assignee: z.string(),
});
export type TeamSlot = z.infer<typeof teamSlotSchema>;
export const gameSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  engine: z.string(),
  genre: z.string(),
  genres: z.array(z.string()).optional(),
  payment: z.enum(["fixed", "revshare", "mixed"]).optional(),
  team: z.array(teamSlotSchema).max(30).optional(),
  budget: z.number().finite().nonnegative(),
  tasks: z.array(taskSchema),
  documents: z.array(gameDocumentSchema).optional(),
  graph: z.object({
    phase: z.enum(["survey", "editor"]).default("survey"),
    answers: z.record(z.string(), z.string()).default({}),
    nodes: z.array(z.object({
      id: z.string(),
      type: z.enum(["root", "chapter", "scene", "ending", "story", "asset", "sticky", "rectangle", "ellipse", "diamond", "image"]),
      title: z.string(),
      description: z.string().default(""),
      parentId: z.string().optional(),
      taskId: z.string().optional(),
      workId: z.string().optional(),
      entityIds: z.array(z.string()).optional(),
      image: z.string().max(600_000).optional(),
      position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
    })).default([]),
    edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), label: z.string().optional() })).default([]),
    hiddenTaskIds: z.array(z.string()).default([]),
  }).optional(),
  storyEntities: z.array(gameStoryEntitySchema).optional(),
});
export type GameGraphNode = NonNullable<Game["graph"]>["nodes"][number];
export const commentSchema = z.object({
  id: z.string(),
  workId: z.string(),
  authorId: z.string(),
  body: z.string().min(1).max(1000),
  createdAt: z.string(),
});
export const purchaseSchema = z.object({
  id: z.string(),
  workId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  amount: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  createdAt: z.string(),
  gameId: z.string().optional(),
});
export type GameTask = z.infer<typeof taskSchema>;
export type Game = z.infer<typeof gameSchema>;
export type WorkComment = z.infer<typeof commentSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;
export const seedGames: Game[] = [
  {
    id: "little-station",
    title: "Станция за облаками",
    description:
      "Уютное приключение о почтальоне, который доставляет письма между летающими островами.",
    engine: "Godot 4",
    genre: "Cozy adventure",
    budget: 65000,
    tasks: [
      {
        id: "hero",
        title: "Герой-почтальон",
        category: "animation",
        brief:
          "Spine 4.2, вид сбоку. Персонаж с сумкой. Плавные переходы, экспорт JSON + atlas + PNG.",
        budget: 18000,
        status: "draft",
        assignee: "",
        animations: ["idle", "walk", "run", "jump"],
        deadline: "",
        workId: "spine-scout",
      },
      {
        id: "village",
        title: "Остров и дом смотрителя",
        category: "art",
        brief: "Тайлсет 16 × 16, тёплая палитра, слои для параллакса.",
        budget: 12000,
        status: "open",
        assignee: "",
        animations: [],
        deadline: "",
      },
      {
        id: "ambience",
        title: "Вечер на станции",
        category: "audio",
        brief:
          "Зацикленная атмосфера на 60 секунд: ветер, перрон, дальний поезд.",
        budget: 5000,
        status: "progress",
        assignee: "lera",
        animations: [],
        deadline: "",
        workId: "sound",
      },
      {
        id: "inventory-task",
        title: "Сумка и инвентарь писем",
        category: "ux",
        brief:
          "Макеты инвентаря: 12 слотов, состояния предметов, адаптация под геймпад.",
        budget: 15000,
        status: "review",
        assignee: "denis",
        animations: [],
        deadline: "",
        workId: "game-ui",
      },
    ],
  },
];
export const seedComments: WorkComment[] = [
  {
    id: "comment-scout",
    workId: "spine-scout",
    authorId: "misha",
    body: "Классно читается силуэт в беге. Для платформера пригодился бы ещё переход из прыжка в приземление.",
    createdAt: "2026-11-08T12:00:00Z",
  },
];
