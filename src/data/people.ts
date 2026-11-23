import { z } from "zod";
import type { Creator, Work } from "./types";

export const specialties = {
  "3d": "3D-моделирование", art: "2D и пиксель-арт", animation: "Анимация",
  audio: "Музыка и звук", writing: "Сценарии и нарратив", ux: "UX/UI-дизайн",
  motion: "Моушн-дизайн", video: "Видео", programming: "Программирование",
  "level-design": "Левел-дизайн", "game-design": "Геймдизайн", game: "Разработка игр",
} as const;
export type Specialty = keyof typeof specialties;
export const availabilityLabels = { open: "Открыт к предложениям", limited: "Обсуждаю отдельные задачи", busy: "Пока занят" } as const;
export const profileSettingsSchema = z.object({
  name: z.string().trim().min(1).max(60),
  handle: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  role: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(800),
  skills: z.array(z.string().trim().min(1).max(40)).max(16),
  specialties: z.array(z.enum(Object.keys(specialties) as [Specialty, ...Specialty[]])).max(12),
  availability: z.enum(["open", "limited", "busy"]),
  location: z.string().trim().max(80),
  avatar: z.string().max(550_000).regex(/^data:image\/(png|jpeg|webp);base64,/).optional(),
  cover: z.string().max(550_000).regex(/^data:image\/(png|jpeg|webp);base64,/).optional(),
});
export type ProfileSettings = z.infer<typeof profileSettingsSchema>;
export function normalizeSearch(value: string) { return value.toLocaleLowerCase("ru").replace(/ё/g, "е").trim(); }
export function matchesSearch(text: string, query: string) {
  const normalized = normalizeSearch(text);
  return normalizeSearch(query).split(/\s+/).every((word) => normalized.includes(word));
}
const rolePatterns: Record<Specialty, RegExp> = {
  "3d": /3d|3д|модел|model|скульпт/i,
  art: /2d|2д|пиксел|pixel|концепт|concept|иллюстр|худож|artist/i,
  animation: /аним|anim|spine|риг|rigg/i,
  audio: /звук|саунд|музык|композ|озвуч|sound|audio|compos|sfx/i,
  writing: /сценар|нарратив|narrat|writer|диалог|лор/i,
  ux: /ux|ui|интерфейс/i, motion: /моушн|motion/i, video: /видео|video|монтаж/i,
  programming: /программ|разработчик|кодер|developer|programmer|unity|godot|unreal/i,
  "level-design": /левел|level|уровн/i, "game-design": /геймдиз|game.?design|механик/i,
  game: /разработ|гейм|game/i,
};
export function roleMatchesSpecialty(role: string, specialty: string) {
  if (!Object.hasOwn(rolePatterns, specialty)) return false;
  if (specialty === "art" && /3d|3д/i.test(role)) return false;
  return rolePatterns[specialty as Specialty].test(role);
}
export function creatorSpecialties(creator: Creator, works: Work[]): Specialty[] {
  if (creator.specialties) return creator.specialties;
  return [...new Set([
    ...works.filter((work) => work.creatorId === creator.id && work.category in specialties).map((work) => work.category as Specialty),
    ...(Object.keys(specialties) as Specialty[]).filter((key) => roleMatchesSpecialty(creator.role, key)),
  ])];
}
