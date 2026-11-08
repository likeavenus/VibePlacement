export const ru = {
  brand: "VibePlacement",
  marketplace: "Маркетплейс",
  projects: "Проекты",
  creators: "Креаторы",
  services: "Работы и услуги",
  teams: "Проекты и сбор команд",
  favorites: "Избранное",
  profile: "Мой профиль",
  publish: "Создать",
  search: "Навык, работа или автор",
  all: "Все направления",
  "3d": "3D и окружение",
  video: "ИИ-видео",
  motion: "Моушн-дизайн",
  ux: "UX/UI-дизайн",
  audio: "Звук и озвучка",
  art: "2D и пиксель-арт",
  writing: "Сценарии",
  animation: "2D / Spine-анимация",
  soon: "Скоро",
  empty: "Пока ничего не нашлось",
  clear: "Сбросить фильтры",
  closed: "закрытых проектов",
  online: "Открыт к предложениям",
};
export type Messages = typeof ru;
export const dictionaries: Record<"ru" | "en", Messages | null> = {
  ru,
  en: null,
};
export const t = (key: keyof Messages) => ru[key];
