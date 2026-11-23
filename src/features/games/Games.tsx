import { lazy, Suspense, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Trash2,
  X,
  Users,
  Image as ImageIcon,
  UserRound,
} from "lucide-react";
import { useStore } from "../../app/store";
import { money } from "../../data/mock";
import { taskStatus, type Game, type GameTask } from "../../data/product";
import type { Category } from "../../data/types";
import { Modal } from "../../components/Modal";
import { Viewer } from "../../components/viewers/Viewer";
import { t } from "../../i18n";
import { categoryIds } from "../../data/categories";
import { CreateProject } from "../projects/CreateProject";
import { genres } from "../../data/projects";
import { GameOnboarding } from "./GameOnboarding";
import { GamePlan } from "./GameFlow";
import { UiSelect } from "../../components/UiSelect";
const GameDocuments = lazy(() => import("./GameDocuments"));
export const taskCategories = categoryIds;
function GameCover({ source }: { source?: string }) {
  const [failedSource, setFailedSource] = useState<string>();
  return <div className="game-thumbnail">
    {source && source !== failedSource
      ? <img className="game-cover-image" src={source} alt="" loading="lazy" decoding="async" onError={() => setFailedSource(source)} />
      : <div className="game-cover-placeholder" role="img" aria-label="Обложка не добавлена"><ImageIcon size={36} strokeWidth={1.3} aria-hidden="true" /></div>}
  </div>;
}
export function Games() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const create = params.get("new") === "1";
  const setCreate = (open: boolean) => {
    const next = new URLSearchParams(params);
    if (open) next.set("new", "1"); else next.delete("new");
    setParams(next, { replace: true });
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Мои игры</h1>
        </div>
        <button className="primary-btn" onClick={() => setCreate(true)}>
          <Plus size={17} />
          Создать игру
        </button>
      </div>
      <div className="games-list">
        {store.games.map((game) => {
          const done = game.tasks.filter(
            (task) => task.status === "done",
          ).length;
          return (
            <Link className="game-item" key={game.id} to={`/games/${game.id}`}>
              <GameCover source={game.graph?.nodes.find((node) => node.id === "root")?.image} />
              <div className="game-item-content">
                <div className="tags">
                  {game.id === "little-station" && <span>Пример</span>}
                  <span>{game.engine}</span>
                  {(game.genres ?? [game.genre]).map((genre) => <span key={genre}>{genre}</span>)}
                </div>
                <h2>
                  {game.title}
                  <ArrowUpRight size={20} />
                </h2>
                <p>{game.description}</p>
                <div className="game-progress">
                  <span
                    style={{
                      width: `${game.tasks.length ? (done / game.tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="game-item-stats">
                  <span>
                    {done} / {game.tasks.length} задач готово
                  </span>
                  <span>{game.payment === "mixed" ? "Комбинированный формат" : game.payment === "revshare" ? "Участие за долю" : "Оплата за задачи"}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {create && <NewGame onClose={() => setCreate(false)} />}
    </>
  );
}
function NewGame({ onClose }: { onClose: () => void }) {
  const store = useStore(), navigate = useNavigate();
  return <GameOnboarding onClose={onClose} onCreate={(game) => {
    if (store.addGame(game)) { onClose(); navigate(`/games/${game.id}`); }
  }} />;
}
export function GameWorkspace() {
  const [workspaceParams] = useSearchParams();
  const { id } = useParams(),
    store = useStore(),
    game = store.games.find((game) => game.id === id);
  const [editing, setEditing] = useState<GameTask | null | undefined>(
      undefined,
    ),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [preview, setPreview] = useState<string>();
  const [recruit, setRecruit] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"plan" | "documents">("plan");
  if (!game)
    return (
      <div className="empty-state">
        <h1>Игра не найдена</h1>
        <Link to="/games" className="secondary-btn">
          Мои игры
        </Link>
      </div>
    );
  const work = store.workList.find((work) => work.id === preview);
  const tasks = game.tasks.filter(
    (task) =>
      (status === "all" || status === task.status) &&
      `${task.title} ${task.brief}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (workspaceParams.get("board") === "1") return <div className="game-board-window">
    <header><Link to={`/games/${game.id}`} className="back-link"><ArrowLeft size={18} />К игре</Link><h1>{game.title}</h1></header>
    <GamePlan key={game.id} game={game} standalone saveGraph={(graph) => store.saveGameGraph(game.id, graph)} onPreview={setPreview} />
    {work && <Modal title={work.title} wide onClose={() => setPreview(undefined)}><div className="task-preview"><Viewer kind={work.viewer} assetId={work.assetId} /></div></Modal>}
  </div>;
  return (
    <>
      <Link className="back-link" to="/games">
        <ArrowLeft size={15} />
        Мои игры
      </Link>
      <div className="game-workspace-heading">
        <div>
          <div className="tags">
            <span>{game.engine}</span>
            {(game.genres ?? [game.genre]).map((genre) => <span key={genre}>{genre}</span>)}
            <span>{game.payment === "mixed" ? "КОМБИНИРОВАННЫЙ ФОРМАТ" : game.payment === "revshare" ? "ДОЛЯ ОТ ВЫРУЧКИ" : "ОПЛАТА ЗА ЗАДАЧИ"}</span>
          </div>
          <h1>{game.title}</h1>
          <p>{game.description}</p>
          {!!game.team?.length && <section className="game-team" aria-label="Команда проекта">
            <div className="game-team-heading"><strong>Команда</strong><span>{game.team.filter((slot) => slot.assignee).length} из {game.team.length} ролей занято</span></div>
            <div className="game-team-slots">{game.team.map((slot) => {
              const member = store.creatorList.find((creator) => creator.id === slot.assignee);
              return <label key={slot.id} className={member ? "is-filled" : "is-open"}>
                <span className="game-team-role"><i />{slot.role}</span>
                <UiSelect ariaLabel={`Исполнитель: ${slot.role}`} value={slot.assignee} options={[{ value: "", label: "В поиске" }, ...store.creatorList.map((creator) => ({ value: creator.id, label: creator.name }))]} onChange={(value) => store.saveGameTeam(game.id, game.team!.map((item) => item.id === slot.id ? { ...item, assignee: value } : item))} />
              </label>;
            })}</div>
          </section>}
        </div>
      </div>
      <nav className="game-workspace-tabs" role="tablist" aria-label="Раздел игры">
        <button role="tab" aria-selected={workspaceView === "plan"} onClick={() => setWorkspaceView("plan")}>План игры</button>
        <button role="tab" aria-selected={workspaceView === "documents"} onClick={() => setWorkspaceView("documents")}>Описание игры</button>
      </nav>
      {workspaceView === "documents" ? <Suspense fallback={<div className="game-documents-loading">Открываем документ…</div>}>
        <GameDocuments game={game} save={(documents) => store.saveGameDocuments(game.id, documents)} saveGraph={(graph) => store.saveGameGraph(game.id, graph)} saveEntities={(entities) => store.saveGameStoryEntities(game.id, entities)} />
      </Suspense> : <>
      <GamePlan
        key={game.id}
        game={game}
        saveGraph={(graph) => store.saveGameGraph(game.id, graph)}
        onPreview={(workId) => setPreview(workId)}
      />
      <div className="game-primary-action">
        {store.projectList.find((p) => p.gameId === game.id) ? (
          <Link className="secondary-btn" to={`/projects/${store.projectList.find((p) => p.gameId === game.id)!.id}`}>
            <Users size={16} /> Открыть набор
          </Link>
        ) : (
          <button className="secondary-btn" onClick={() => setRecruit(true)}>
            <Users size={16} /> Собрать команду
          </button>
        )}
      </div>
      <div className="workspace-toolbar">
        <h2>
          Задачи игры<span>{game.tasks.length}</span>
        </h2>
        <button className="secondary-btn" onClick={() => setEditing(null)}><Plus size={16} />Добавить задачу</button>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Найти задачу"
            placeholder="Название или требования"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <UiSelect ariaLabel="Статус задач" value={status} options={[{ value: "all", label: "Все статусы" }, ...Object.entries(taskStatus).map(([value, label]) => ({ value, label }))]} onChange={setStatus} />
      </div>
      <div className="task-table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th>Сущность / работа</th>
              <th>Направление</th>
              <th>Статус</th>
              <th>Креатор</th>
              <th>Стоимость</th>
              <th>Материал</th>
              <th>
                <span className="sr-only">Изменить</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const creator = store.creatorList.find(
                (creator) => creator.id === task.assignee,
              );
              return (
                <tr key={task.id}>
                  <td>
                    <button
                      className="task-title"
                      onClick={() => setEditing(task)}
                    >
                      {task.title}
                    </button>
                    <span className="task-subtitle">
                      {task.storyNodeId ? game.graph?.nodes.find((node) => node.id === task.storyNodeId)?.title : undefined}
                      {task.storyNodeId ? ", " : ""}{task.animations.length
                        ? task.animations.join(", ")
                        : task.deadline
                          ? new Date(
                              task.deadline + "T12:00:00",
                            ).toLocaleDateString("ru-RU")
                          : "Срок не задан"}
                    </span>
                  </td>
                  <td>
                    <span className="task-category">{task.direction || t(task.category)}</span>
                  </td>
                  <td>
                    <span className={`task-status status-${task.status}`}>
                      <i />
                      {taskStatus[task.status]}
                    </span>
                  </td>
                  <td>
                    {creator ? (
                      <Link
                        className="task-assignee"
                        to={`/profile/${creator.id}`}
                      >
                        <span
                          className="avatar"
                          style={{ background: creator.color }}
                        >
                          {creator.avatar ? <img src={creator.avatar} alt="" /> : <UserRound size={16} strokeWidth={1.5} />}
                        </span>
                        {creator.name}
                      </Link>
                    ) : (
                      <span className="muted">Не назначен</span>
                    )}
                  </td>
                  <td className="task-money">{(task.payment ?? (game.payment === "revshare" ? "revshare" : "fixed")) === "revshare" ? "Доля" : money(task.budget)}</td>
                  <td>
                    {task.workId ? (
                      <button
                        className="text-action"
                        onClick={() => setPreview(task.workId)}
                      >
                        Превью
                        <ArrowUpRight size={14} />
                      </button>
                    ) : (
                      <Link
                        className="text-action"
                        to={`/market?category=${task.category}`}
                      >
                        Подобрать
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={`Изменить задачу ${task.title}`}
                      title="Изменить задачу"
                      onClick={() => setEditing(task)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!tasks.length && (
          <div className="empty-state">
            <ClipboardList size={30} />
            <h2>
              {game.tasks.length
                ? "Задачи не найдены"
                : "С чего начинается твоя игра?"}
            </h2>
          </div>
        )}
      </div>
      </>}
      {recruit && (
        <CreateProject game={game} onClose={() => setRecruit(false)} />
      )}
      {editing !== undefined && (
      <TaskEditor
        game={game}
        initial={editing}
        onClose={() => setEditing(undefined)}
      />
      )}{" "}
      {work && (
        <Modal title={work.title} wide onClose={() => setPreview(undefined)}>
          <div className="task-preview">
            <Viewer kind={work.viewer} assetId={work.assetId} />
          </div>
        </Modal>
      )}
    </>
  );
}
function TaskEditor({
  game,
  initial,
  onClose,
}: {
  game: Game;
  initial: GameTask | null;
  onClose: () => void;
}) {
  const store = useStore();
  const [task, setTask] = useState<GameTask>(
      initial ?? {
        id: crypto.randomUUID(),
        title: "",
        category: "animation",
        direction: "",
        brief: "",
        budget: game.payment === "revshare" ? 0 : 5000,
        payment: game.payment === "revshare" ? "revshare" : "fixed",
        status: "draft",
        assignee: "",
        storyNodeId: "",
        animations: ["idle", "walk", "run"],
        deadline: "",
      },
    ),
    [error, setError] = useState(""),
    [remove, setRemove] = useState(false),
    [animationInput, setAnimationInput] = useState(
      (initial?.animations ?? ["idle", "walk", "run"]).join(", "),
    );
  const update = (patch: Partial<GameTask>) => setTask({ ...task, ...patch });
  const taskPayment = task.payment ?? (game.payment === "revshare" ? "revshare" : "fixed");
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!task.title.trim() || !task.brief.trim()) {
      setError("Добавьте название и требования.");
      return;
    }
    if (taskPayment === "fixed" && task.status !== "draft" && task.budget <= 0) {
      setError("Для заказа нужен положительный бюджет.");
      return;
    }
    if (
      ["progress", "review", "done"].includes(task.status) &&
      !task.assignee
    ) {
      setError("Назначьте исполнителя.");
      return;
    }
    if (["review", "done"].includes(task.status) && !task.workId) {
      setError("Прикрепите работу для проверки.");
      return;
    }
    const result = {
      ...task,
      payment: taskPayment,
      budget: taskPayment === "revshare" ? 0 : task.budget,
      title: task.title.trim(),
      brief: task.brief.trim(),
      animations:
        task.category === "animation"
          ? Array.from(
              new Set(
                animationInput
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              ),
            ).slice(0, 30)
          : [],
    };
    if (store.saveTask(game.id, result)) {
      store.setToast("Задание сохранено в браузере");
      onClose();
    }
  }
  return (
    <Modal title={initial ? "Задача игры" : "Новая задача"} onClose={onClose}>
      <form className="project-form" onSubmit={submit}>
        <label>
          Сущность / название
          <input
            required
            maxLength={100}
            value={task.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Главный герой / набор анимаций"
          />
        </label>
        <label>
          Направление
          <input maxLength={80} value={task.direction || t(task.category)} onChange={(e) => {
            const value = e.target.value;
            const match = taskCategories.find((category) => t(category).toLowerCase() === value.trim().toLowerCase());
            const alias = value.trim().toLowerCase() === "музыка" ? "audio" : value.trim().toLowerCase() === "программирование" ? "game" : value.trim().toLowerCase() === "концепт-арт" ? "art" : undefined;
            update({ direction: value, category: (match ?? alias ?? "all") as Category, workId: match || alias ? undefined : task.workId });
          }} />
        </label>
          <label>
            Требования
          <textarea
            required
            rows={3}
            maxLength={2000}
            value={task.brief}
            onChange={(e) => update({ brief: e.target.value })}
            placeholder="Стиль, форматы, размеры и критерии готовности"
          />
        </label>
        <label>
          Этап сюжета
          <UiSelect ariaLabel="Этап сюжета" value={task.storyNodeId ?? ""} options={[{ value: "", label: "Не привязано" }, ...(game.graph?.nodes ?? []).filter((node) => node.type === "scene" || node.type === "story").map((node) => ({ value: node.id, label: node.title }))]} onChange={(value) => update({ storyNodeId: value || undefined })} />
        </label>
        {task.category === "animation" && (
          <label>
            Нужные анимации
            <input
              value={animationInput}
              maxLength={300}
              onChange={(e) => setAnimationInput(e.target.value)}
              placeholder="idle, walk, attack, death"
            />
          </label>
        )}
        <div className="form-columns">
          {game.payment === "mixed" && <label>Оплата этой задачи<UiSelect ariaLabel="Оплата этой задачи" value={taskPayment} options={[{ value: "fixed", label: "Фиксированная оплата" }, { value: "revshare", label: "Доля от выручки" }]} onChange={(value) => update({ payment: value as "fixed" | "revshare" })} /></label>}
          {taskPayment === "fixed" && <label>
            Стоимость задачи, ₽
            <input
              required
              type="number"
              min="0"
              max="10000000"
              value={task.budget}
              onChange={(e) => update({ budget: Number(e.target.value) })}
            />
          </label>}
          <label>
            Срок
            <input
              type="date"
              value={task.deadline}
              onChange={(e) => update({ deadline: e.target.value })}
            />
          </label>
        </div>
        {taskPayment === "revshare" && <label>Условия доли<textarea value={task.shareTerms ?? ""} maxLength={500} onChange={(event) => update({ shareTerms: event.target.value })} placeholder="Размер доли и порядок выплат" /></label>}
        <label>
          Статус
          <UiSelect ariaLabel="Статус" value={task.status} options={Object.entries(taskStatus).map(([value, label]) => ({ value, label }))} onChange={(value) => update({ status: value as GameTask["status"] })} />
        </label>
        <label>
          Исполнитель
          <UiSelect ariaLabel="Исполнитель" value={task.assignee} options={[{ value: "", label: "Пока не выбран" }, ...store.creatorList.map((creator) => ({ value: creator.id, label: creator.name }))]} onChange={(value) => update({ assignee: value })} />
        </label>
        <label>
          Прикреплённая работа
          <UiSelect ariaLabel="Прикреплённая работа" value={task.workId ?? ""} options={[{ value: "", label: "Без материала" }, ...store.workList.filter((work) => work.category === task.category).map((work) => ({ value: work.id, label: work.title }))]} onChange={(value) => update({ workId: value || undefined })} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {initial && (
            <button
              type="button"
              className="secondary-btn danger"
              onClick={() => {
                if (!remove) {
                  setRemove(true);
                  return;
                }
                if (store.removeTask(game.id, task.id)) onClose();
              }}
            >
              <Trash2 size={15} />
              {remove ? "Подтвердить удаление" : "Удалить"}
            </button>
          )}
          <button type="submit" className="primary-btn">
            <Check size={16} />
            Сохранить задачу
          </button>
        </div>
        <p className="form-note">
          План сохраняется в браузере. Оплата не подключена.
        </p>
      </form>
    </Modal>
  );
}
