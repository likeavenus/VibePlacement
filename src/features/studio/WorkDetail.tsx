import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Download,
  MessageCircle,
  Send,
  ShoppingBag,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Work } from "../../data/types";
import { money } from "../../data/mock";
import { useStore } from "../../app/store";
import { Viewer } from "../../components/viewers/Viewer";
import { Modal } from "../../components/Modal";
import { UiSelect } from "../../components/UiSelect";
import { getBundle } from "../../data/assets";
import { youtubeEmbedUrl } from "../../data/gameRelease";
import "./game-release.css";
export function WorkDetail({
  work,
  onClose,
}: {
  work: Work;
  onClose: () => void;
}) {
  const store = useStore(),
    creator = store.creatorById(work.creatorId);
  const [body, setBody] = useState(""),
    [checkout, setCheckout] = useState(false),
    [gameId, setGameId] = useState(""),
    [downloadError, setDownloadError] = useState(""),
    [releaseFiles, setReleaseFiles] = useState<File[]>([]);
  const comments = store.comments.filter((c) => c.workId === work.id),
    purchased = store.purchases.some(
      (p) => p.workId === work.id && p.buyerId === "denis",
    ),
    own = work.creatorId === "denis",
    requested = store.applications.includes("work:" + work.id);
  useEffect(() => {
    let active = true;
    if (work.viewer !== "game" || !work.assetId) {
      setReleaseFiles([]);
      return;
    }
    getBundle(work.assetId).then((bundle) => {
      if (active) setReleaseFiles(bundle?.kind === "game" ? bundle.files : []);
    }).catch(() => { if (active) setReleaseFiles([]); });
    return () => { active = false; };
  }, [work.assetId, work.viewer]);
  async function download(selectedFile?: File) {
    setDownloadError("");
    try {
      if (work.assetId) {
        const bundle = await getBundle(work.assetId);
        if (!bundle) throw new Error("Файлы не найдены в браузере.");
        for (const file of selectedFile ? [selectedFile] : bundle.files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      } else if (work.viewer === "pixel") {
        const canvas = document.querySelector<HTMLCanvasElement>(
          "dialog .pixel-scene",
        );
        if (!canvas) throw new Error("Дождитесь превью.");
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "woodland-demo.png";
        a.click();
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Не удалось скачать файлы.",
      );
    }
  }
  return (
    <Modal title={work.title} wide onClose={onClose}>
      <div className="work-detail-layout">
        <div className="work-detail-main">
          <Viewer kind={work.viewer} assetId={work.assetId} />
          <div className="detail-description">
            <p>{work.description}</p>
            <div className="tags">
              {work.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          {work.gamePage && <section className="game-release-info">
            <h3>Об игре</h3>
            <dl><div><dt>Платформа</dt><dd>{work.gamePage.platform}</dd></div><div><dt>Версия</dt><dd>{work.gamePage.version}</dd></div></dl>
            {work.gamePage.videoUrl && <iframe title={`Трейлер: ${work.title}`} src={youtubeEmbedUrl(work.gamePage.videoUrl)} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />}
          </section>}
          <section className="comments-section">
            <h3>
              <MessageCircle size={17} />
              Обсуждение <span>{comments.length}</span>
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (body.trim() && store.addComment(work.id, body)) setBody("");
              }}
            >
              <textarea
                aria-label="Комментарий"
                required
                maxLength={1000}
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Что думаешь о работе?"
              />
              <button
                className="primary-btn"
                type="submit"
                disabled={!body.trim()}
                aria-label="Отправить комментарий"
              >
                <Send size={16} />
              </button>
            </form>
            {comments.map((comment) => (
              <article key={comment.id} className="comment">
                <div>
                  <Link to={`/profile/${comment.authorId}`}>
                    {store.creatorById(comment.authorId).name}
                  </Link>
                  <time>
                    {new Date(comment.createdAt).toLocaleDateString("ru-RU")}
                  </time>
                  {comment.authorId === "denis" && (
                    <button
                      className="icon-btn"
                      title="Удалить комментарий"
                      aria-label="Удалить комментарий"
                      onClick={() => store.deleteComment(comment.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p>{comment.body}</p>
              </article>
            ))}
            {!comments.length && (
              <p className="muted">Пока без комментариев.</p>
            )}
          </section>
        </div>
        <aside className="work-detail-aside">
          <Link className="author-link" to={`/profile/${creator.id}`}>
            <span className="avatar" style={{ background: creator.color }}>
              {creator.avatar ? <img src={creator.avatar} alt="" /> : <UserRound size={18} strokeWidth={1.5} />}
            </span>
            <div>
              <strong>{creator.name}</strong>
              <span>{creator.role}</span>
            </div>
            <ArrowUpRight size={16} />
          </Link>
          <span className="offer-kind">
            {work.viewer === "game" ? "ИГРА / СБОРКА" : work.saleType === "asset"
              ? "ГОТОВЫЙ АССЕТ"
              : work.saleType === "showcase"
                ? "ПОРТФОЛИО"
                : "УСЛУГА НА ЗАКАЗ"}
          </span>
          <strong className="offer-price">
            {work.saleType === "showcase"
              ? "Открыто к отзывам"
              : money(work.price)}
          </strong>
          <span className="muted">
            {creator.rating.toFixed(1)} ({creator.completed} закрытых проектов)
          </span>
          {work.saleType === "asset" && work.viewer === "game" && (own || purchased) ? (
            <div className="game-release-downloads">
              <p>Сайт не запускает файлы. Перед запуском проверьте их антивирусом.</p>
              {releaseFiles.map((file) => <button key={file.name} className="secondary-btn" onClick={() => download(file)}><Download size={15} />{file.name}</button>)}
              {!releaseFiles.length && <span className="muted">Файлы доступны только в браузере, где их загрузили.</span>}
            </div>
          ) : work.saleType === "asset" ? (
            own || purchased ? (
              <button className="primary-btn" onClick={() => void download()}>
                <Download size={16} />
                Скачать файлы
              </button>
            ) : (
              <button className="primary-btn" onClick={() => setCheckout(true)}>
                <ShoppingBag size={16} />
                Добавить в покупки
              </button>
            )
          ) : (
            work.saleType !== "showcase" && (
              <button
                className="primary-btn"
                disabled={requested || own}
                onClick={() => {
                  if (store.apply("work:" + work.id))
                    store.setToast("Запрос сохранён в браузере");
                }}
              >
                {requested ? <Check size={16} /> : <ArrowUpRight size={16} />}{" "}
                {own
                  ? "Ваша работа"
                  : requested
                    ? "Запрос сохранён"
                    : "Запросить услугу"}
              </button>
            )
          )}
          {checkout && !purchased && (
            <form
              className="checkout-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (store.purchase(work.id, gameId || undefined)) {
                  setCheckout(false);
                  store.setToast("Добавлено в библиотеку");
                }
              }}
            >
              <h3>Добавить в библиотеку</h3>
              <label>
                Добавить в игру
                <UiSelect
                  ariaLabel="Добавить в игру"
                  value={gameId}
                  onChange={setGameId}
                  options={[{ value: "", label: "Только в библиотеку" }, ...store.games.map((game) => ({ value: game.id, label: game.title }))]}
                />
              </label>
              <div className="checkout-total">
                <span>Итого</span>
                <strong>{money(work.price)}</strong>
              </div>
              <p className="form-note">
                Тестовый режим. Оплата и лицензия не оформляются.
              </p>
              <button
                className="secondary-btn"
                type="submit"
              >
                Добавить в покупки
              </button>
            </form>
          )}
          {purchased && (
            <span className="ready-badge">
              <Check size={14} />В вашей библиотеке
            </span>
          )}
          {downloadError && (
            <p role="alert" className="form-error">
              {downloadError}
            </p>
          )}
        </aside>
      </div>
    </Modal>
  );
}
