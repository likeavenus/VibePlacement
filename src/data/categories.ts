import {
  AudioLines,
  Bone,
  Box,
  Film,
  LayoutTemplate,
  Clapperboard,
  ScrollText,
  Shapes,
} from "lucide-react";
import type { Category } from "./types";

export const directions = [
  {
    id: "3d",
    icon: Box,
    accept: ".glb,.fbx,.obj",
    formats: "GLB / FBX / OBJ",
    hint: "Одна модель · встроенные текстуры · до 30 МБ",
    kind: "model",
  },
  {
    id: "art",
    icon: Shapes,
    accept: ".png,.jpg,.jpeg,.webp",
    formats: "PNG / JPG / WebP",
    hint: "До 8 изображений · до 30 МБ",
    kind: "image",
  },
  {
    id: "animation",
    icon: Bone,
    accept: ".json,.atlas,.png",
    formats: "JSON + atlas + PNG",
    hint: "Экспорт Spine 4.2 · до 30 МБ",
    kind: "spine",
  },
  {
    id: "motion",
    icon: Clapperboard,
    accept: ".mp4,.webm,.gif",
    formats: "MP4 / WebM / GIF",
    hint: "Ролик или анимация · до 30 МБ",
    kind: "video",
  },
  {
    id: "ux",
    icon: LayoutTemplate,
    accept: ".png,.jpg,.jpeg,.webp",
    formats: "PNG / JPG / WebP",
    hint: "До 8 экранов интерфейса · до 30 МБ",
    kind: "image",
  },
  {
    id: "video",
    icon: Film,
    accept: ".mp4,.webm",
    formats: "MP4 / WebM",
    hint: "Один видеоролик · до 30 МБ",
    kind: "video",
  },
  {
    id: "audio",
    icon: AudioLines,
    accept: ".wav,.mp3,.ogg,.flac",
    formats: "WAV / MP3 / OGG / FLAC",
    hint: "Одна дорожка · до 30 МБ",
    kind: "audio",
  },
  {
    id: "writing",
    icon: ScrollText,
    accept: ".txt,.md,.json",
    formats: "TXT / Markdown / JSON",
    hint: "UTF-8 · до 100 000 знаков · JSON из редактора сцен",
    kind: "script",
  },
] as const;
export const categoryIds = directions.map(({ id }) => id);
export const directionFor = (category: Category) =>
  directions.find(({ id }) => id === category) ?? directions[0];
