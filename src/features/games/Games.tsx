import { useState, type FormEvent } from "react";
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
  Gamepad2,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
  Users,
} from "lucide-react";
import { useStore } from "../../app/store";
import { money, creators } from "../../data/mock";
import { taskStatus, type Game, type GameTask } from "../../data/product";
import type { Category } from "../../data/types";
import { Modal } from "../../components/Modal";
import { PixelScene } from "../../components/viewers/PixelScene";
import { Viewer } from "../../components/viewers/Viewer";
import { t } from "../../i18n";
import { categoryIds } from "../../data/categories";
import { CreateProject } from "../projects/CreateProject";
import { genres } from "../../data/projects";
export const taskCategories = categoryIds;
export function Games() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const create = params.get("new") === "1";
  const setCreate = (open: boolean) =>
    setParams(open ? { new: "1" } : {}, { replace: true });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-dot" /> ОТ ПЕРВОЙ ИДЕИ ДО РЕЛИЗА
          </div>
          <h1>
            Мои игры<span className="heading-dot">.</span>
          </h1>
          <p>Запланируй работы, подбери материалы и собери команду.</p>
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
              <div className="game-thumbnail">
                <PixelScene station />
              </div>
              <div className="game-item-content">
                <div className="tags">
                  {game.id === "little-station" && <span>Демо-пример</span>}
                  <span>{game.engine}</span>
                  <span>{game.genre}</span>
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
                  <span>Бюджет {money(game.budget)}</span>
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
  const store = useStore(),
    navigate = useNavigate();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title")).trim(),
      description = String(values.get("description")).trim();
    if (!title || !description) {
      setError("Добавьте название и идею игры.");
      return;
    }
    const game: Game = {
      id: crypto.randomUUID(),
      title,
      description,
      engine: String(values.get("engine")),
      genre: String(values.get("genre")),
      budget: Number(values.get("budget")),
      tasks: [],
    };
    if (store.addGame(game)) {
      onClose();
      navigate(`/games/${game.id}`);
    }
  }
  return (
    <Modal title="Новая игра" onClose={onClose}>
      <form className="project-form" onSubmit={submit}>
        <label>
          Название игры
          <input
            name="title"
            required
            maxLength={80}
            placeholder="Как называется твой мир?"
          />
        </label>
        <label>
          Идея
          <textarea
            name="description"
            required
            rows={3}
            maxLength={600}
            placeholder="Во что будем играть?"
          />
        </label>
        <div className="form-columns">
          <label>
            Движок
            <select name="engine">
              <option>Godot 4</option>
              <option>Unity</option>
              <option>Unreal Engine</option>
              <option>Web / Three.js</option>
              <option>Пока выбираю</option>
            </select>
          </label>
          <label>
            Жанр
            <select name="genre">
              {Object.values(genres).map((genre) => (
                <option key={genre}>{genre}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Общий бюджет, ₽
          <input
            name="budget"
            type="number"
            required
            min="0"
            max="100000000"
            defaultValue="50000"
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button type="submit" className="primary-btn">
          <Gamepad2 size={17} />
          Создать игру
        </button>
        <p className="form-note">Локальный проект. Деньги не списываются.</p>
      </form>
    </Modal>
  );
}
export function GameWorkspace() {
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
  if (!game)
    return (
      <div className="empty-state">
        <h1>Игра не найдена</h1>
        <Link to="/games" className="secondary-btn">
          Мои игры
        </Link>
      </div>
    );
  const total = game.tasks.reduce((sum, task) => sum + task.budget, 0),
    accepted = game.tasks.filter((task) => task.status === "done"),
    doneBudget = accepted.reduce((sum, task) => sum + task.budget, 0),
    work = store.workList.find((work) => work.id === preview);
  const tasks = game.tasks.filter(
    (task) =>
      (status === "all" || status === task.status) &&
      `${task.title} ${task.brief}`.toLowerCase().includes(query.toLowerCase()),
  );
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
            <span>{game.genre}</span>
            <span>ПРЕПРОДАКШН</span>
          </div>
          <h1>{game.title}</h1>
          <p>{game.description}</p>
        </div>
        <button className="primary-btn" onClick={() => setEditing(null)}>
          <Plus size={17} />
          Добавить задачу
        </button>
      </div>
      <nav className="game-next-steps" aria-label="Следующие шаги игры">
        <button onClick={() => setEditing(null)}>
          <Plus size={19} />
          <span>
            <strong>1. Запланировать работу</strong>
            <small>Задачи, требования и бюджет</small>
          </span>
        </button>
        <Link to="/market">
          <Search size={19} />
          <span>
            <strong>2. Найти материалы</strong>
            <small>Готовые ассеты и услуги</small>
          </span>
        </Link>
        {store.projectList.find((p) => p.gameId === game.id) ? (
          <Link
            to={`/projects/${store.projectList.find((p) => p.gameId === game.id)!.id}`}
          >
            <Users size={19} />
            <span>
              <strong>3. Набор в команду</strong>
              <small>Открыть своё объявление</small>
            </span>
          </Link>
        ) : (
          <button onClick={() => setRecruit(true)}>
            <Users size={19} />
            <span>
              <strong>3. Собрать команду</strong>
              <small>Роли и условия участия</small>
            </span>
          </button>
        )}
      </nav>
      <div className="game-metrics">
        <div>
          <Wallet size={18} />
          <span>Бюджет игры</span>
          <strong>{money(game.budget)}</strong>
        </div>
        <div>
          <ClipboardList size={18} />
          <span>Запланировано</span>
          <strong className={total > game.budget ? "over-budget" : ""}>
            {money(total)}
          </strong>
        </div>
        <div>
          <Check size={18} />
          <span>Принято работ</span>
          <strong>
            {accepted.length}
            <small> / {game.tasks.length}</small>
          </strong>
        </div>
        <div>
          <span>Свободный бюджет</span>
          <strong className={total > game.budget ? "over-budget" : ""}>
            {money(game.budget - total)}
          </strong>
        </div>
      </div>
      {total > game.budget && (
        <p className="budget-warning" role="status">
          План превышает бюджет на {money(total - game.budget)}.
        </p>
      )}
      <div className="workspace-toolbar">
        <h2>
          Задачи игры<span>{game.tasks.length}</span>
        </h2>
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Найти задачу"
            placeholder="Название или требования"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Статус задач"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Все статусы</option>
          {Object.entries(taskStatus).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="task-table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th>Сущность / работа</th>
              <th>Направление</th>
              <th>Статус</th>
              <th>Креатор</th>
              <th>Бюджет</th>
              <th>Материал</th>
              <th>
                <span className="sr-only">Изменить</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const creator = creators.find(
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
                      {task.animations.length
                        ? task.animations.join(" · ")
                        : task.deadline
                          ? new Date(
                              task.deadline + "T12:00:00",
                            ).toLocaleDateString("ru-RU")
                          : "Срок не задан"}
                    </span>
                  </td>
                  <td>
                    <span className="task-category">{t(task.category)}</span>
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
                          {creator.initials}
                        </span>
                        {creator.name}
                      </Link>
                    ) : (
                      <span className="muted">Не назначен</span>
                    )}
                  </td>
                  <td className="task-money">{money(task.budget)}</td>
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
            <button className="secondary-btn" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Добавить задачу
            </button>
          </div>
        )}
      </div>
      <div className="workspace-bottom">
        <span>
          Принято на {money(doneBudget)} · статусы и бюджет демонстрационные
        </span>
        <Link to="/market" className="text-action">
          Найти ассеты и креаторов
          <ArrowUpRight size={15} />
        </Link>
      </div>
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
        brief: "",
        budget: 5000,
        status: "draft",
        assignee: "",
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
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!task.title.trim() || !task.brief.trim()) {
      setError("Добавьте название и требования.");
      return;
    }
    if (task.status !== "draft" && task.budget <= 0) {
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
      store.setToast("Задача сохранена локально");
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
          <select
            value={task.category}
            onChange={(e) =>
              update({
                category: e.target.value as Category,
                workId: undefined,
              })
            }
          >
            {taskCategories.map((category) => (
              <option key={category} value={category}>
                {t(category)}
              </option>
            ))}
          </select>
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
          <label>
            Бюджет, ₽
            <input
              required
              type="number"
              min="0"
              max="10000000"
              value={task.budget}
              onChange={(e) => update({ budget: Number(e.target.value) })}
            />
          </label>
          <label>
            Срок
            <input
              type="date"
              value={task.deadline}
              onChange={(e) => update({ deadline: e.target.value })}
            />
          </label>
        </div>
        <label>
          Статус
          <select
            aria-label="Статус"
            value={task.status}
            onChange={(e) =>
              update({ status: e.target.value as GameTask["status"] })
            }
          >
            {Object.entries(taskStatus).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Исполнитель
          <select
            aria-label="Исполнитель"
            value={task.assignee}
            onChange={(e) => update({ assignee: e.target.value })}
          >
            <option value="">Пока не выбран</option>
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Прикреплённая работа
          <select
            aria-label="Прикреплённая работа"
            value={task.workId ?? ""}
            onChange={(e) => update({ workId: e.target.value || undefined })}
          >
            <option value="">Без материала</option>
            {store.workList
              .filter((work) => work.category === task.category)
              .map((work) => (
                <option key={work.id} value={work.id}>
                  {work.title}
                </option>
              ))}
          </select>
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
          Локальный план. Назначение креатора и смена статуса не отправляют
          заказ и не списывают деньги.
        </p>
      </form>
    </Modal>
  );
}
