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
  brief: z.string(),
  budget: z.number().finite().nonnegative(),
  status: z.enum(["draft", "open", "progress", "review", "done"]),
  assignee: z.string(),
  workId: z.string().optional(),
  animations: z.array(z.string()),
  deadline: z.string(),
});
export const gameSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  engine: z.string(),
  genre: z.string(),
  budget: z.number().finite().nonnegative(),
  tasks: z.array(taskSchema),
});
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
        title: "Главный герой — почтальон",
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
