export type Category =
  | "all"
  | "3d"
  | "video"
  | "motion"
  | "ux"
  | "audio"
  | "art"
  | "writing"
  | "animation";
export type ViewerKind =
  | "model"
  | "image"
  | "design"
  | "motion"
  | "audio"
  | "pixel"
  | "script"
  | "video"
  | "spine";
export interface Creator {
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
  payment: "fixed" | "revshare";
  budget: number;
  members: number;
  slots: number;
  creatorId: string;
  art: "station" | "landscape" | "code";
}
