export type Category =
  | "all"
  | "3d"
  | "video"
  | "motion"
  | "ux"
  | "audio"
  | "art"
  | "writing"
  | "animation"
  | "game";
export type ViewerKind =
  | "model"
  | "image"
  | "design"
  | "motion"
  | "audio"
  | "pixel"
  | "script"
  | "video"
  | "spine"
  | "game";
export interface Creator {
  avatar?: string;
  cover?: string;
  availability?: "open" | "limited" | "busy";
  location?: string;
  specialties?: import("./people").Specialty[];
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  role: string;
  skills: string[];
  rating: number;
  completed: number;
  bio: string;
}
export interface Work {
  assetId?: string;
  saleType?: "service" | "asset" | "showcase";
  animations?: string[];
  gamePage?: {
    videoUrl?: string;
    platform: string;
    version: string;
  };
  id: string;
  title: string;
  category: Category;
  viewer: ViewerKind;
  creatorId: string;
  price: number;
  tags: string[];
  label: string;
  color: string;
  description: string;
}
export interface Project {
  gameId?: string;
  meta?: import("zod").infer<typeof import("./projects").projectMetaSchema>;
  links?: import("./projects").ProjectLink[];
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  roles: string[];
  filledRoles?: { role: string; assignee: string }[];
  roleOffers?: { role: string; amount: number }[];
  payment: "fixed" | "revshare" | "mixed";
  budget: number;
  members: number;
  slots: number;
  creatorId: string;
  art: "station" | "landscape" | "code";
}
