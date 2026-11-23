import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Check,
  FileCheck2,
  ImagePlus,
  Gamepad2,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { Modal } from "../../components/Modal";
import { UiSelect } from "../../components/UiSelect";
import { useStore } from "../../app/store";
import { removeBundle, saveBundle, type AssetBundle } from "../../data/assets";
import { directions, directionFor } from "../../data/categories";
import { validateUpload } from "../../data/validateUpload";
import { youtubeEmbedUrl } from "../../data/gameRelease";
import { blankStory, storySchema, type Story } from "../../data/story";
import type { Category } from "../../data/types";
import { BundleViewer } from "../../components/viewers/BundleViewer";
import { StoryEditor } from "./StoryEditor";
import { t } from "../../i18n";
import "./game-release.css";
const SpineViewer = lazy(() => import("../../components/viewers/SpineViewer"));

export function PublishWork({ onClose }: { onClose: () => void }) {
  const store = useStore(),
    [params] = useSearchParams();
  const [category, setCategory] = useState<Category>(
      () =>
        directions.find((d) => d.id === params.get("category"))?.id ??
        "animation",
    ),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [price, setPrice] = useState("6000"),
    [saleType, setSaleType] = useState<"asset" | "service" | "showcase">(
      "asset",
    ),
    [draft, setDraft] = useState<AssetBundle>(),
    [animations, setAnimations] = useState<string[]>([]),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [rights, setRights] = useState(false),
    [writingMode, setWritingMode] = useState<"editor" | "upload">("editor"),
    [story, setStory] = useState<Story>(blankStory),
    [dragging, setDragging] = useState(false),
    [platform, setPlatform] = useState("Windows"),
    [version, setVersion] = useState("0.1.0"),
    [videoUrl, setVideoUrl] = useState(""),
    [coverFile, setCoverFile] = useState<File>(),
    [coverUrl, setCoverUrl] = useState("");
  const generation = useRef(0),
    direction = directionFor(category),
    fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  useEffect(() => {
    if (!coverFile) {
      setCoverUrl("");
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const invalidate = () => {
    generation.current++;
    setDraft(undefined);
    setAnimations([]);
    setReady(false);
    setBusy(false);
    setError("");
    setCoverFile(undefined);
    if (fileInput.current) fileInput.current.value = "";
  };
  async function selectFiles(files: File[]) {
    const version = ++generation.current;
    setError("");
    setDraft(undefined);
    setReady(false);
    setBusy(true);
    try {
      const result = await validateUpload(category, files);
      if (version !== generation.current) return;
      setAnimations(result.animations);
      if (result.story) setStory(result.story);
      setDraft({ id: crypto.randomUUID(), kind: result.kind, files });
      setReady(result.kind !== "spine");
    } catch (error) {
      if (version === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : "Не удалось прочитать файлы.",
        );
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  async function selectCover(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Обложка должна быть не больше 5 МБ.");
      return;
    }
    try {
      await validateUpload("art", [file]);
      setCoverFile(file);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось проверить обложку.");
    }
  }
  async function prepareStory() {
    const parsed = storySchema.safeParse(story);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    await selectFiles([
      new File([JSON.stringify(parsed.data, null, 2)], "scenario.json", {
        type: "application/json",
      }),
    ]);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !ready || !rights || busy) return;
    const amount = Number(price);
    if (
      !title.trim() ||
      !description.trim() ||
      !Number.isFinite(amount) ||
      (saleType !== "showcase" && (amount <= 0 || amount > 10000000))
    ) {
      setError("Заполните название, описание и стоимость.");
      return;
    }
    const videoEmbed = category === "game" ? youtubeEmbedUrl(videoUrl) : undefined;
    if (category === "game" && (!platform.trim() || !version.trim() || (videoUrl.trim() && !videoEmbed))) {
      setError("Проверьте платформу, версию и HTTPS-ссылку на YouTube.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveBundle({ ...draft, ...(category === "game" && coverFile ? { cover: coverFile } : {}) });
      const saved = store.publish({
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        category,
        viewer: draft.kind,
        creatorId: "denis",
        price: saleType === "showcase" ? 0 : amount,
        tags:
          draft.kind === "spine"
            ? ["Spine 4.2", `${animations.length} анимаций`]
            : [
                t(category),
                draft.kind === "script"
                  ? `${story.scenes.length} сцен`
                  : draft.files.length > 1
                    ? `${draft.files.length} файлов`
                    : draft.files[0].name.split(".").pop()!.toUpperCase(),
              ],
        label: t(category),
        color: "mint",
        assetId: draft.id,
        saleType,
        animations,
        ...(category === "game" ? { gamePage: { platform: platform.trim(), version: version.trim(), ...(videoEmbed ? { videoUrl: videoUrl.trim() } : {}) } } : {}),
      });
      if (!saved) {
        await removeBundle(draft.id);
        setError(
          "Не удалось сохранить публикацию. Освободите место в браузере.",
        );
        return;
      }
      store.setToast("Работа сохранена в браузере");
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Не удалось сохранить файлы.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Опубликовать работу" wide onClose={onClose}>
      <form className="publish-form" onSubmit={submit}>
        <div className="publish-fields">
          <label>
            Направление
            <UiSelect
              ariaLabel="Направление работы"
              value={category}
              onChange={(value) => {
                invalidate();
                const next = value as Category;
                setCategory(next);
                if (next === "game" && saleType === "service") setSaleType("asset");
              }}
              options={directions.map((d) => ({ value: d.id, label: t(d.id) }))}
            />
          </label>
          <label>
            Название
            <input
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                category === "writing"
                  ? "История, в которую хочется войти"
                  : "Название работы"
              }
            />
          </label>
          <label>
            Описание
            <textarea
              required
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Состав работы и условия использования"
            />
          </label>
          {category === "game" && <>
            <label>
              Платформа
              <input aria-label="Платформа игры" required maxLength={80} value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Windows, macOS, Linux" />
            </label>
            <label>
              Версия
              <input aria-label="Версия игры" required maxLength={32} value={version} onChange={(event) => setVersion(event.target.value)} placeholder="0.1.0" />
            </label>
            <label>
              Видео на YouTube
              <input aria-label="Видео игры на YouTube" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtu.be/..." />
            </label>
          </>}
          <label>
            Публикация
            <UiSelect
              ariaLabel="Публикация"
              value={saleType}
              onChange={(value) => setSaleType(value as typeof saleType)}
              options={[
                { value: "asset", label: category === "game" ? "Игра для скачивания" : "Готовый ассет на продажу" },
                ...(category !== "game" ? [{ value: "service", label: "Услуга на заказ" }] : []),
                { value: "showcase", label: category === "game" ? "Страница игры" : "Портфолио / обратная связь" },
              ]}
            />
          </label>
          {saleType !== "showcase" && (
            <label>
              Стоимость, ₽
              <input
                type="number"
                required
                min="1"
                max="10000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          )}
          <label className="rights-check">
            <input
              type="checkbox"
              required
              checked={rights}
              onChange={(e) => setRights(e.target.checked)}
            />
            У меня есть права на публикацию и выбранный способ использования.
          </label>
        </div>
        <div className="publish-preview">
          {category === "game" && <>
            <label className="game-cover-upload">
              {coverUrl ? <img src={coverUrl} alt="Обложка игры" /> : <><ImagePlus size={24} /><span>Обложка игры</span></>}
              <input aria-label="Обложка игры" type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(event) => void selectCover(event.target.files?.[0])} />
            </label>
            <p className="game-upload-notice"><Gamepad2 size={16} />Сборка хранится только в этом браузере. Сайт не запускает и не проверяет файлы на вирусы.</p>
          </>}
          {category === "writing" && (
            <div className="segmented" aria-label="Способ создания сценария">
              <button
                type="button"
                className={writingMode === "editor" ? "active" : ""}
                aria-pressed={writingMode === "editor"}
                onClick={() => {
                  invalidate();
                  setWritingMode("editor");
                }}
              >
                Редактор сцен
              </button>
              <button
                type="button"
                className={writingMode === "upload" ? "active" : ""}
                aria-pressed={writingMode === "upload"}
                onClick={() => {
                  invalidate();
                  setWritingMode("upload");
                }}
              >
                Загрузить файл
              </button>
            </div>
          )}
          {(category !== "writing" || writingMode === "upload") && (
            <label
              className={`upload-area ${dragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void selectFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <Upload size={28} />
              <strong>{direction.formats}</strong>
              <span>{direction.hint}</span>
              <span>Выбрать или перетащить файлы</span>
              <input
                ref={fileInput}
                key={category}
                aria-label="Файлы работы"
                type="file"
                multiple={["animation", "art", "ux", "game"].includes(category)}
                accept={direction.accept}
                onChange={(e) => {
                  if (e.target.files?.length)
                    void selectFiles(Array.from(e.target.files));
                }}
              />
            </label>
          )}
          {category === "writing" && writingMode === "editor" && (
            <>
              <StoryEditor
                value={story}
                onChange={(value) => {
                  invalidate();
                  setStory(value);
                }}
              />
              <button
                type="button"
                className="secondary-btn"
                disabled={busy}
                onClick={prepareStory}
              >
                <BookOpen size={18} /> Проверить сценарий
              </button>
            </>
          )}
          {busy && (
            <div className="upload-validation" role="status">
              <LoaderCircle className="spin" size={20} /> Проверяем файлы
            </div>
          )}
          {draft && (
            <>
              <div className="file-chips">
                {draft.files.map((file) => (
                  <span key={file.name}>
                    <FileCheck2 size={16} />
                    {file.name}
                  </span>
                ))}
              </div>
              <div
                className={
                  draft.kind === "spine" ? "publish-spine" : "draft-viewer"
                }
              >
                {draft.kind === "spine" ? (
                  <Suspense fallback={<LoaderCircle className="spin" />}>
                    <SpineViewer
                      key={draft.id}
                      draft={draft}
                      onReady={setReady}
                    />
                  </Suspense>
                ) : (
                  <BundleViewer key={draft.id} bundle={draft} />
                )}
              </div>
              <span className="ready-badge">
                {ready ? (
                  <Check size={17} />
                ) : (
                  <LoaderCircle size={17} className="spin" />
                )}
                {ready ? "Файлы готовы" : "Проверяем персонажа"}
              </span>
            </>
          )}
          {!draft && !busy && category !== "writing" && (
            <div className="upload-empty">
              <ImagePlus size={40} />
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </div>
        <div className="publish-footer">
          <p className="form-note">
            Сохранится в браузере. Оплата не подключена.
          </p>
          <button
            type="submit"
            className="primary-btn"
            disabled={!ready || !rights || busy}
          >
            {busy ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Upload size={18} />
            )}
            Опубликовать
          </button>
        </div>
      </form>
    </Modal>
  );
}
