import {
  AtlasAttachmentLoader,
  SkeletonJson,
  TextureAtlas,
  SpineTexture,
} from "@esotericsoftware/spine-pixi-v8";
import { Texture } from "pixi.js";
import { publicAsset } from "../../data/urls";
import { checkFileSize, getBundle, type AssetBundle } from "../../data/assets";
export async function validateSpineFiles(files: File[]) {
  checkFileSize(files);
  const jsonFiles = files.filter((f) => f.name.endsWith(".json")),
    atlases = files.filter((f) => f.name.endsWith(".atlas"));
  if (jsonFiles.length !== 1 || atlases.length !== 1)
    throw new Error(
      "Нужны один JSON-экспорт Spine 4.2, один .atlas и все PNG-страницы атласа.",
    );
  if (files.some((f) => !/\.(json|atlas|png)$/i.test(f.name)))
    throw new Error("Поддерживаются только JSON, atlas и PNG.");
  const json = JSON.parse(await jsonFiles[0].text());
  if (!String(json.skeleton?.spine).startsWith("4.2."))
    throw new Error(
      "Нужен экспорт Spine 4.2. Пересохраните персонажа в этой версии.",
    );
  if (
    !Array.isArray(json.bones) ||
    json.bones.length > 500 ||
    !json.animations ||
    Object.keys(json.animations).length > 100
  )
    throw new Error("Некорректный скелет: до 500 костей и 100 анимаций.");
  const atlas = new TextureAtlas(await atlases[0].text());
  try {
    if (!atlas.pages.length || atlas.pages.length > 8)
      throw new Error("Атлас должен содержать от 1 до 8 страниц.");
    for (const page of atlas.pages) {
      if (!/^[\w .()-]+\.png$/i.test(page.name))
        throw new Error(
          "Имя PNG в атласе должно быть простым именем файла, без пути.",
        );
      const file = files.find((f) => f.name === page.name);
      if (!file) throw new Error(`Не хватает текстуры ${page.name}.`);
      const bitmap = await createImageBitmap(file);
      const tooLarge = bitmap.width > 4096 || bitmap.height > 4096;
      bitmap.close();
      if (tooLarge)
        throw new Error("Размер страницы атласа — не более 4096 × 4096.");
    }
    const animations = Object.keys(json.animations);
    if (!animations.length) throw new Error("В файле нет анимаций.");
    return animations;
  } finally {
    atlas.dispose();
  }
}
export async function loadSpineAsset(assetId?: string, draft?: AssetBundle) {
  const bundle = draft ?? (assetId ? await getBundle(assetId) : undefined);
  if (assetId && !bundle)
    throw new Error("Файлы персонажа не найдены в этом браузере.");
  const urls: string[] = [],
    textures: Texture[] = [];
  let atlas: TextureAtlas | undefined;
  const dispose = () => {
    textures.forEach((texture) => texture.destroy(true));
    urls.forEach((url) => URL.revokeObjectURL(url));
  };
  try {
    const json = bundle
      ? JSON.parse(
          await bundle.files.find((f) => f.name.endsWith(".json"))!.text(),
        )
      : await fetch(publicAsset("assets/spine/spineboy.json")).then((r) => {
          if (!r.ok) throw new Error("Не удалось загрузить скелет.");
          return r.json();
        });
    const atlasText = bundle
      ? await bundle.files.find((f) => f.name.endsWith(".atlas"))!.text()
      : await fetch(publicAsset("assets/spine/spineboy.atlas")).then((r) => {
          if (!r.ok) throw new Error("Не удалось загрузить атлас.");
          return r.text();
        });
    atlas = new TextureAtlas(atlasText);
    for (const page of atlas.pages) {
      const file = bundle?.files.find((f) => f.name === page.name);
      if (bundle && !file) throw new Error(`Не найдена текстура ${page.name}.`);
      const url = file
        ? URL.createObjectURL(file)
        : publicAsset(`assets/spine/${encodeURIComponent(page.name)}`);
      if (file) urls.push(url);
      const image = new Image();
      image.src = url;
      await image.decode();
      const texture = Texture.from(image);
      texture.source.alphaMode = page.pma
        ? "premultiplied-alpha"
        : "premultiply-alpha-on-upload";
      textures.push(texture);
      page.setTexture(SpineTexture.from(texture.source));
    }
    const skeletonData = new SkeletonJson(
      new AtlasAttachmentLoader(atlas),
    ).readSkeletonData(json);
    if (
      skeletonData.animations.some(
        (animation) =>
          !Number.isFinite(animation.duration) || animation.duration > 120,
      )
    )
      throw new Error("Длительность одной анимации — не более 120 секунд.");
    return { skeletonData, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
