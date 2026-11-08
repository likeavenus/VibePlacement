import {
  Box3,
  LoadingManager,
  Mesh,
  type Object3D,
  type Material,
  Texture,
} from "three";

export function disposeModel(model: Object3D) {
  const textures = new Set<Texture>();
  model.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    for (const material of (Array.isArray(node.material)
      ? node.material
      : [node.material]) as Material[]) {
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) {
    texture.dispose();
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      texture.image.close();
  }
}

export async function loadModel(file: File): Promise<Object3D> {
  const data = await file.arrayBuffer(),
    bytes = new Uint8Array(data),
    ext = file.name.split(".").pop()?.toLowerCase();
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (
      url.startsWith("blob:") ||
      /^data:image\/(png|jpeg|webp);base64,/i.test(url)
    )
      return url;
    throw new Error(
      "Внешние текстуры не поддержаны. Встройте текстуры в GLB / FBX.",
    );
  });
  let model: Object3D;
  if (ext === "glb") {
    if (bytes.length < 20) throw new Error("Повреждённый GLB.");
    const view = new DataView(data);
    if (
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== data.byteLength ||
      view.getUint32(16, true) !== 0x4e4f534a
    )
      throw new Error("Файл не является GLB 2.0.");
    const jsonLength = view.getUint32(12, true);
    if (20 + jsonLength > data.byteLength) throw new Error("Повреждённый GLB.");
    const json = JSON.parse(
      new TextDecoder().decode(bytes.slice(20, 20 + jsonLength)),
    );
    for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])])
      if (resource.uri && !/^data:/.test(resource.uri))
        throw new Error("GLB должен содержать встроенные ресурсы.");
    const { GLTFLoader } =
      await import("three/examples/jsm/loaders/GLTFLoader.js");
    model = (await new GLTFLoader(manager).parseAsync(data, "")).scene;
  } else if (ext === "fbx") {
    const header = new TextDecoder().decode(bytes.slice(0, 4096));
    if (
      !header.startsWith("Kaydara FBX Binary  \0") &&
      !(/FBXHeaderExtension\s*:/.test(header) && /FBXVersion\s*:/.test(header))
    )
      throw new Error(
        "Файл не является FBX. Переименование расширения не меняет формат.",
      );
    const { FBXLoader } =
      await import("three/examples/jsm/loaders/FBXLoader.js");
    model = new FBXLoader(manager).parse(data, "");
  } else if (ext === "obj") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    if (
      /\x00/.test(text) ||
      !/^v\s+[-+\d.]+\s+[-+\d.]+\s+[-+\d.]+/m.test(text) ||
      !/^f\s+\S+\s+\S+\s+\S+/m.test(text)
    )
      throw new Error("OBJ должен содержать вершины и грани.");
    if (/^mtllib\s/m.test(text))
      throw new Error(
        "Для материалов экспортируйте GLB. OBJ принимается без внешнего MTL.",
      );
    const { OBJLoader } =
      await import("three/examples/jsm/loaders/OBJLoader.js");
    model = new OBJLoader(manager).parse(text);
  } else throw new Error("Выберите модель GLB, FBX или OBJ.");
  try {
    let vertices = 0;
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const position = node.geometry.getAttribute("position");
      if (!position) return;
      vertices += position.count;
      if (vertices > 1000000)
        throw new Error("В превью поддерживается до 1 млн вершин.");
      for (const value of position.array)
        if (!Number.isFinite(value))
          throw new Error("Модель содержит некорректные координаты.");
    });
    const bounds = new Box3().setFromObject(model);
    if (
      vertices < 3 ||
      bounds.isEmpty() ||
      ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)
    )
      throw new Error("В модели не найдена видимая геометрия.");
    return model;
  } catch (error) {
    disposeModel(model);
    throw error;
  }
}
