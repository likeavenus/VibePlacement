import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  History,
  Link2,
  Pencil,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useStore } from "../../app/store";
import { Avatar } from "../../components/Cards";
import { PixelScene } from "../../components/viewers/PixelScene";
import { Modal } from "../../components/Modal";
import { creatorById, money } from "../../data/mock";
import {
  agreementDigest,
  downloadText,
  genres,
  initialAgreement,
  projectLinkSchema,
  projectMeta,
  stages,
  templateTerms,
  termsFields,
  termsSchema,
  type Agreement,
  type ProjectLink,
  type ProjectResponse,
  type Terms,
} from "../../data/projects";
import type { Project } from "../../data/types";

function exportAgreement(
  project: Project,
  agreement: Agreement,
  response?: ProjectResponse,
) {
  downloadText(
    `vibeplacement-${project.id}-v${agreement.version}.json`,
    JSON.stringify(
      {
        format: "vibeplacement-agreement-draft/1",
        notice:
          "Локальный черновик. Не подписан сторонами. Даты и SHA-256 не подтверждают личность, момент заключения договора или достоверность записи.",
        project: { id: project.id, title: project.title },
        agreement,
        response: response ?? null,
      },
      null,
      2,
    ),
    "application/json",
  );
}
export function ProjectPage() {
  const { id } = useParams(),
    store = useStore();
  const project = store.projectList.find((p) => p.id === id);
  const [tab, setTab] = useState("overview"),
    [editing, setEditing] = useState(false),
    [responding, setResponding] = useState(false),
    [linksOpen, setLinksOpen] = useState(false),
    [role, setRole] = useState("");
  if (!project)
    return (
      <div className="empty-state">
        <h1>Проект не найден</h1>
        <Link className="secondary-btn" to="/discover">
          К поиску команд
        </Link>
      </div>
    );
  const meta = projectMeta(project),
    owner = creatorById(project.creatorId),
    own = project.creatorId === "denis";
  const versions = [
    initialAgreement(project),
    ...store.agreements.filter((a) => a.projectId === project.id),
  ];
  const current = versions.at(-1)!;
  const responses = store.projectResponses.filter(
    (r) => r.projectId === project.id,
  );
  const response = responses.filter((r) => r.applicantId === "denis").at(-1);
  const latestResponse = response?.agreement.id === current.id;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      store.setToast("Ссылка на проект скопирована");
    } catch {
      store.setToast(
        "Не удалось скопировать. Ссылка находится в адресной строке.",
      );
    }
  }
  return (
    <div className="project-page">
      <Link
        to={own && project.gameId ? `/games/${project.gameId}` : "/discover"}
        className="back-link"
      >
        <ArrowLeft size={17} />{" "}
        {own && project.gameId ? "К задачам игры" : "Найти проект"}
      </Link>
      <div className="project-page-heading">
        <div>
          <div className="tags">
            <span>{genres[meta.genre]}</span>
            <span>{stages[meta.stage]}</span>
            <span>{meta.engine}</span>
          </div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
        <button
          className="icon-btn"
          title="Скопировать ссылку"
          aria-label="Скопировать ссылку на проект"
          onClick={copyLink}
        >
          <Copy size={20} />
        </button>
      </div>
      <div className="project-summary">
        <Link to={`/profile/${owner.id}`}>
          <Avatar creator={owner} />
          <span>
            {owner.name}
            <small>Автор проекта</small>
          </span>
        </Link>
        <div>
          <span>Платформа</span>
          <strong>{meta.platform}</strong>
        </div>
        <div>
          <span>
            {project.payment === "revshare" ? "Пул команды" : "Бюджет набора"}
          </span>
          <strong>
            {project.payment === "revshare"
              ? `до ${project.budget}% RevShare`
              : money(project.budget)}
          </strong>
        </div>
        <div>
          <span>Команда</span>
          <strong>
            {project.members} / {project.slots}
          </strong>
        </div>
      </div>
      <div
        className="project-page-tabs"
        role="tablist"
        aria-label="Разделы проекта"
      >
        {[
          ["overview", "Об игре"],
          ["terms", "Договорённости"],
          ["workspace", "Рабочая среда"],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="project-overview">
          <section>
            <div className="project-scene">
              <PixelScene station={project.art === "station"} />
            </div>
            <h2>Ближайшая цель</h2>
            <p>{meta.goal}</p>
            <div className="tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>
          <section className="project-roles">
            <h2>
              Открытые роли <span>{project.roles.length}</span>
            </h2>
            {project.roles.map((item) => (
              <div key={item}>
                <span>
                  <Users size={18} />
                  {item}
                </span>
                <button
                  className="text-action"
                  onClick={() => {
                    setRole(item);
                    setTab("terms");
                  }}
                >
                  Условия <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
            <p className="form-note">
              {project.payment === "revshare"
                ? "Доля каждого участника обсуждается отдельно. Доход и релиз не гарантированы."
                : "Индивидуальная стоимость и этапы оплаты обсуждаются до начала работы."}
            </p>
          </section>
        </div>
      )}
      {tab === "terms" && (
        <section className="project-agreements">
          <div className="section-toolbar">
            <div>
              <h2>Условия участия</h2>
              <span className="form-note">
                Версия {current.version} ·{" "}
                {current.source === "template"
                  ? "Базовый шаблон"
                  : "Текст автора"}
              </span>
            </div>
            <div className="agreement-actions">
              <button
                className="secondary-btn"
                onClick={() => exportAgreement(project, current)}
              >
                <Download size={17} /> JSON
              </button>
              <button
                className="secondary-btn"
                onClick={() =>
                  downloadText(
                    `conditions-v${current.version}.txt`,
                    `ЧЕРНОВИК. НЕ ПОДПИСАН.\n${project.title}\nВерсия ${current.version}\n\n` +
                      termsFields
                        .map(
                          ([key, label]) => `${label}\n${current.terms[key]}`,
                        )
                        .join("\n\n"),
                  )
                }
              >
                <FileText size={17} /> Текст
              </button>
              {own && (
                <button
                  className="primary-btn"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={17} /> Изменить
                </button>
              )}
            </div>
          </div>
          <p className="agreement-notice">
            Черновик для обсуждения, не проверен юристом. Подписание и
            подтверждение личности не подключены.
          </p>
          <div className="terms-sections">
            {termsFields.map(([key, label], i) => (
              <section key={key}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{label}</h3>
                  <p>{current.terms[key]}</p>
                </div>
              </section>
            ))}
          </div>
          <div className="response-actions">
            {own ? (
              <span className="form-note">
                Вы автор проекта. Отклики других людей появятся после
                подключения сервера.
              </span>
            ) : (
              <button
                className="primary-btn"
                disabled={latestResponse}
                onClick={() => setResponding(true)}
              >
                {latestResponse ? <Check size={18} /> : <Send size={18} />}
                {latestResponse ? "Отклик сохранён" : "Откликнуться на роль"}
              </button>
            )}
            {response && (
              <button
                className="secondary-btn"
                onClick={() =>
                  exportAgreement(project, response.agreement, response)
                }
              >
                <Download size={17} /> Мой отклик · v
                {response.agreement.version}
              </button>
            )}
          </div>
          {response && (
            <p className="form-note">
              {latestResponse
                ? "Отклик и копия условий сохранены в этом браузере. Автору не отправлены."
                : "Условия обновились после вашего отклика. Старая версия сохранена в экспорте."}
            </p>
          )}
          <details className="agreement-history">
            <summary>
              <History size={18} /> История версий · {versions.length}
            </summary>
            {versions
              .slice()
              .reverse()
              .map((version) => (
                <div key={version.id}>
                  <span>
                    Версия {version.version} ·{" "}
                    {version.id.startsWith("initial:")
                      ? "Исходный шаблон"
                      : new Date(version.createdAt).toLocaleString("ru-RU")}
                  </span>
                  <button
                    className="text-action"
                    onClick={() => exportAgreement(project, version)}
                  >
                    <Download size={16} /> Экспорт
                  </button>
                </div>
              ))}
          </details>
        </section>
      )}
      {tab === "workspace" && (
        <section className="project-workspace">
          <div className="section-toolbar">
            <div>
              <h2>Рабочая среда команды</h2>
              <p>Репозиторий, чат, документы и сборки.</p>
            </div>
            {own && (
              <button
                className="secondary-btn"
                onClick={() => setLinksOpen(true)}
              >
                <Link2 size={18} /> Настроить ссылки
              </button>
            )}
          </div>
          {project.links?.length ? (
            <div className="project-links">
              {project.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Link2 size={20} />
                  <span>
                    <strong>{link.title}</strong>
                    <small>{new URL(link.url).hostname}</small>
                  </span>
                  <ExternalLink size={17} />
                </a>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <Link2 size={30} />
              <p>Автор пока не добавил рабочие ссылки.</p>
            </div>
          )}
          <p className="form-note">
            Ссылки проекта публичные. Доступы к закрытым ресурсам команда выдаёт
            отдельно.
          </p>
          {own && (
            <Link className="text-action" to="/games">
              Мои игровые задачи <ArrowUpRight size={17} />
            </Link>
          )}
        </section>
      )}
      {editing && (
        <TermsEditor
          project={project}
          previous={current}
          onClose={() => setEditing(false)}
        />
      )}
      {responding && (
        <ResponseForm
          project={project}
          agreement={current}
          selectedRole={role}
          onClose={() => setResponding(false)}
        />
      )}
      {linksOpen && (
        <LinksEditor project={project} onClose={() => setLinksOpen(false)} />
      )}
    </div>
  );
}
function TermsEditor({
  project,
  previous,
  onClose,
}: {
  project: Project;
  previous: Agreement;
  onClose: () => void;
}) {
  const store = useStore(),
    [terms, setTerms] = useState<Terms>(previous.terms),
    [source, setSource] = useState<Agreement["source"]>(previous.source),
    [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const result = termsSchema.safeParse(terms);
    if (!result.success) {
      setError("Заполните все разделы условий, до 4000 знаков каждый.");
      return;
    }
    if (
      store.saveAgreement({
        id: crypto.randomUUID(),
        projectId: project.id,
        version: previous.version + 1,
        authorId: "denis",
        createdAt: new Date().toISOString(),
        source,
        terms: result.data,
      })
    ) {
      store.setToast("Новая версия условий сохранена локально");
      onClose();
    } else
      setError(
        "Не удалось сохранить версию. Откройте актуальные условия и повторите.",
      );
  }
  return (
    <Modal title="Условия участия" wide onClose={onClose}>
      <form className="project-form terms-editor" onSubmit={submit}>
        <div className="segmented">
          <button
            type="button"
            className={source === "template" ? "active" : ""}
            onClick={() => setSource("template")}
          >
            Базовый шаблон
          </button>
          <button
            type="button"
            className={source === "custom" ? "active" : ""}
            onClick={() => setSource("custom")}
          >
            Свой текст
          </button>
        </div>
        <button
          type="button"
          className="text-action"
          onClick={() => {
            if (window.confirm("Заменить текущий текст базовым шаблоном?")) {
              setTerms(templateTerms(project));
              setSource("template");
            }
          }}
        >
          Восстановить шаблон
        </button>
        <p className="form-note">
          Новая версия сохранится отдельно. Уже сохранённые отклики останутся
          привязаны к прежним условиям.
        </p>
        {termsFields.map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <textarea
              aria-label={label}
              required
              maxLength={4000}
              rows={4}
              value={terms[key]}
              placeholder={placeholder}
              onChange={(e) => setTerms({ ...terms, [key]: e.target.value })}
            />
          </label>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary-btn">
          <Check size={18} /> Сохранить версию {previous.version + 1}
        </button>
      </form>
    </Modal>
  );
}
function ResponseForm({
  project,
  agreement,
  selectedRole,
  onClose,
}: {
  project: Project;
  agreement: Agreement;
  selectedRole: string;
  onClose: () => void;
}) {
  const store = useStore(),
    [role, setRole] = useState(selectedRole || project.roles[0]),
    [message, setMessage] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed || busy || !message.trim()) return;
    setBusy(true);
    try {
      const response = {
        id: crypto.randomUUID(),
        projectId: project.id,
        applicantId: "denis",
        role,
        message: message.trim(),
        createdAt: new Date().toISOString(),
        agreement,
        digest: await agreementDigest(agreement),
      };
      if (!store.respondToProject(response)) {
        setError(
          "Отклик уже сохранён или условия изменились. Откройте актуальную версию.",
        );
        return;
      }
      store.setToast("Отклик и версия условий сохранены локально");
      onClose();
    } catch {
      setError("Не удалось сохранить отклик.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Отклик на проект" onClose={onClose}>
      <form className="project-form" onSubmit={submit}>
        <label>
          Роль
          <select
            aria-label="Роль для отклика"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {project.roles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          О себе и доступности
          <textarea
            aria-label="Текст отклика"
            required
            rows={5}
            maxLength={1500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опыт, портфолио и сколько времени готов уделять"
          />
        </label>
        <label className="rights-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />
          Я прочитал условия версии {agreement.version}. Сохранить их копию
          вместе с откликом.
        </label>
        <p className="form-note">
          Это локальный отклик, не подписание договора. Автор проекта его пока
          не получит.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="primary-btn"
          disabled={!confirmed || busy || !message.trim()}
        >
          <Send size={18} /> Сохранить отклик
        </button>
      </form>
    </Modal>
  );
}
function LinksEditor({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const store = useStore(),
    [links, setLinks] = useState<ProjectLink[]>(project.links ?? []),
    [error, setError] = useState("");
  return (
    <Modal title="Рабочие ссылки" onClose={onClose}>
      <form
        className="project-form"
        onSubmit={(e) => {
          e.preventDefault();
          for (const link of links) {
            const parsed = projectLinkSchema.safeParse(link);
            if (!parsed.success) {
              setError("Добавьте название и HTTPS-ссылку без логина и пароля.");
              return;
            }
          }
          if (store.saveProjectLinks(project.id, links)) onClose();
          else setError("Не удалось сохранить ссылки.");
        }}
      >
        <p className="form-note">
          Только публичные ссылки. Токены, пароли и секретные приглашения не
          добавляйте.
        </p>
        {links.map((link, index) => (
          <fieldset key={link.id}>
            <legend>Ресурс {index + 1}</legend>
            <label>
              Название
              <input
                required
                maxLength={60}
                value={link.title}
                onChange={(e) =>
                  setLinks(
                    links.map((item) =>
                      item.id === link.id
                        ? { ...item, title: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <label>
              Ссылка
              <input
                aria-label={`Ссылка ${index + 1}`}
                type="url"
                required
                maxLength={500}
                placeholder="https://"
                value={link.url}
                onChange={(e) =>
                  setLinks(
                    links.map((item) =>
                      item.id === link.id
                        ? { ...item, url: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="icon-btn"
              title="Удалить ссылку"
              aria-label={`Удалить ссылку ${index + 1}`}
              onClick={() =>
                setLinks(links.filter((item) => item.id !== link.id))
              }
            >
              <Trash2 size={18} />
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="secondary-btn"
          disabled={links.length >= 8}
          onClick={() =>
            setLinks([
              ...links,
              { id: crypto.randomUUID(), title: "", url: "" },
            ])
          }
        >
          <Plus size={18} /> Добавить ссылку
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-btn" type="submit">
          <Check size={18} /> Сохранить ссылки
        </button>
      </form>
    </Modal>
  );
}
