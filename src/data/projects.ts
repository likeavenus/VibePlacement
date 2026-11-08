import { z } from "zod";
import type { Project } from "./types";

export const genres = {
  adventure: "Приключение",
  rpg: "RPG",
  platformer: "Платформер",
  strategy: "Стратегия",
  novel: "Визуальная новелла",
  puzzle: "Головоломка",
  simulation: "Симулятор",
  action: "Экшен",
  other: "Другой жанр",
} as const;
export const stages = {
  idea: "Идея",
  prototype: "Прототип",
  production: "В разработке",
  release: "Подготовка к релизу",
} as const;
export type Genre = keyof typeof genres;
export type Stage = keyof typeof stages;
export const projectMetaSchema = z.object({
  genre: z.enum(Object.keys(genres) as [Genre, ...Genre[]]),
  stage: z.enum(Object.keys(stages) as [Stage, ...Stage[]]),
  engine: z.string().max(80),
  platform: z.string().max(80),
  goal: z.string().max(1500),
});
export const projectLinkSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(60),
  url: z
    .url()
    .max(500)
    .refine((value) => {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    }, "Укажите HTTPS-ссылку без логина и пароля."),
});
export type ProjectLink = z.infer<typeof projectLinkSchema>;
const seededMeta: Record<string, z.infer<typeof projectMetaSchema>> = {
  "last-train": {
    genre: "adventure",
    stage: "prototype",
    engine: "Godot 4",
    platform: "PC",
    goal: "Вертикальный срез на 15 минут: станция, знакомство со смотрителем и первый маршрут. Сначала собираем небольшую команду, затем работаем в общем репозитории и чате.",
  },
  orbit: {
    genre: "adventure",
    stage: "production",
    engine: "Unreal Engine 5",
    platform: "PC",
    goal: "Подготовить две исследуемые зоны станции для фестивальной демоверсии. Основной упор на историю через окружение и звук.",
  },
  "pocket-rpg": {
    genre: "rpg",
    stage: "prototype",
    engine: "Godot 4",
    platform: "PC / Steam Deck",
    goal: "Собрать первую игровую петлю: путешествие, диалоги и задания. Требуются интерфейсы, которые удобно использовать с геймпадом.",
  },
};
export function projectMeta(project: Project) {
  return (
    project.meta ??
    seededMeta[project.id] ?? {
      genre: "other" as Genre,
      stage: "idea" as Stage,
      engine: "Не выбран",
      platform: "Не выбрана",
      goal: project.description,
    }
  );
}
export const termsFields = [
  ["scope", "Объём и результат", "Что участник передаёт команде"],
  ["schedule", "Сроки и приёмка", "Этапы, правки и критерии готовности"],
  [
    "payment",
    "Оплата и расчёты",
    "Сумма или доля, база расчёта, сроки и отчётность",
  ],
  [
    "rights",
    "Права на результат",
    "Лицензия или передача прав, исходники, портфолио",
  ],
  [
    "exit",
    "Выход из проекта",
    "Уже выполненная работа, доступы, доли после выхода",
  ],
  [
    "disputes",
    "Разногласия и стороны",
    "Стороны, применимое право и порядок урегулирования",
  ],
] as const;
export const termsSchema = z.object({
  scope: z.string().trim().min(1).max(4000),
  schedule: z.string().trim().min(1).max(4000),
  payment: z.string().trim().min(1).max(4000),
  rights: z.string().trim().min(1).max(4000),
  exit: z.string().trim().min(1).max(4000),
  disputes: z.string().trim().min(1).max(4000),
});
export type Terms = z.infer<typeof termsSchema>;
export const agreementSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  version: z.number().int().positive(),
  authorId: z.string(),
  createdAt: z.string(),
  source: z.enum(["template", "custom"]),
  terms: termsSchema,
});
export type Agreement = z.infer<typeof agreementSchema>;
export const responseSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  applicantId: z.string(),
  role: z.string().min(1).max(80),
  message: z.string().trim().min(1).max(1500),
  createdAt: z.string(),
  agreement: agreementSchema,
  digest: z.string(),
});
export type ProjectResponse = z.infer<typeof responseSchema>;
export function templateTerms(project: Project): Terms {
  return {
    scope: `Проект «${project.title}». Роль, объём, форматы исходников и критерии результата согласуются в отдельном задании до начала работы.`,
    schedule:
      "До старта указать даты этапов, число правок и срок ответа на сдачу. Приёмка подтверждается сторонами письменно; молчание не считается приёмкой.",
    payment:
      project.payment === "revshare"
        ? `Предлагаемый общий пул команды: до ${project.budget}% выручки. Индивидуальная доля, определение выручки, допустимые вычеты, периодичность отчётов, доступ к ним и сроки выплат должны быть согласованы отдельно. Доход и релиз не гарантируются.`
        : `Общий бюджет набора: ${project.budget.toLocaleString("ru-RU")} ₽. Сумму участника, аванс, этапы оплаты, налоги и срок окончательного расчёта стороны согласуют до начала работы.`,
    rights:
      "Указать вид лицензии или передачи прав, территорию, срок, момент перехода прав, состав исходников и условия использования в портфолио. Сторонние материалы перечислить вместе с лицензиями.",
    exit: "Указать срок уведомления о выходе, порядок оплаты принятой работы, передачу файлов и закрытие доступов. Для RevShare отдельно согласовать сохранение или прекращение доли после выхода.",
    disputes:
      "Заполнить реквизиты сторон, применимое право, порядок претензий и разрешения споров. Этот текст является черновиком для обсуждения и не проверен юристом.",
  };
}
export function initialAgreement(project: Project): Agreement {
  return {
    id: `initial:${project.id}`,
    projectId: project.id,
    version: 1,
    authorId: project.creatorId,
    createdAt: "2026-11-08T12:00:00Z",
    source: "template",
    terms: templateTerms(project),
  };
}
export async function agreementDigest(agreement: Agreement) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(agreement)),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function downloadText(
  filename: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
