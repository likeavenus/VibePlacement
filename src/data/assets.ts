import { openDB } from "idb";
export interface AssetBundle {
  id: string;
  kind: "spine" | "image" | "audio" | "video" | "model" | "script";
  files: File[];
}
const database = () =>
  openDB("vibeplacement-assets", 1, {
    upgrade(db) {
      db.createObjectStore("bundles", { keyPath: "id" });
    },
  });
export async function saveBundle(bundle: AssetBundle) {
  const db = await database();
  await db.put("bundles", bundle);
  db.close();
}
export async function getBundle(id: string): Promise<AssetBundle | undefined> {
  const db = await database();
  const result = await db.get("bundles", id);
  db.close();
  return result;
}
export async function removeBundle(id: string) {
  const db = await database();
  await db.delete("bundles", id);
  db.close();
}
export function checkFileSize(files: File[]) {
  if (!files.length) throw new Error("Добавьте файлы работы.");
  if (
    files.length > 20 ||
    files.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024
  )
    throw new Error("До 20 файлов и 30 МБ на публикацию.");
  if (new Set(files.map((file) => file.name)).size !== files.length)
    throw new Error("Имена файлов должны быть уникальными.");
}
