import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../components/Modal";
import { useStore } from "../../app/store";
import type { Category } from "../../data/types";
import { t } from "../../i18n";
import { categoryIds } from "../../data/categories";
import { genres, stages, type Genre, type Stage } from "../../data/projects";
import type { Game } from "../../data/product";
export function CreateProject({
  onClose,
  game,
}: {
  onClose: () => void;
  game?: Game;
}) {
  const store = useStore(),
    navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [genre, setGenre] = useState<Genre>(
      (Object.keys(genres).find(
        (id) => genres[id as Genre] === game?.genre,
      ) as Genre) ?? "adventure",
    ),
    [stage, setStage] = useState<Stage>("idea"),
    [engine, setEngine] = useState(game?.engine ?? "Godot 4"),
    [platform, setPlatform] = useState("PC"),
    [goal, setGoal] = useState("");
  const [title, setTitle] = useState(game?.title ?? ""),
    [description, setDescription] = useState(game?.description ?? ""),
    [category, setCategory] = useState<Category>("art");
  const [payment, setPayment] = useState<"fixed" | "revshare">("fixed"),
    [budget, setBudget] = useState("30000"),
    [role, setRole] = useState(""),
    [roles, setRoles] = useState<string[]>([]),
    [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const addRole = () => {
    const next = role.trim();
    if (next && !roles.includes(next) && roles.length < 8) {
      setRoles([...roles, next]);
      setRole("");
      setError("");
    }
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (!title.trim() || !description.trim()) {
        setError("Добавьте название и описание.");
        return;
      }
      setStep(2);
      return;
    }
    const finalRoles =
      role.trim() && !roles.includes(role.trim())
        ? [...roles, role.trim()]
        : roles;
    if (!finalRoles.length) {
      setError("Добавьте хотя бы одну роль.");
      return;
    }
    const amount = Number(budget);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      (payment === "revshare" && amount > 100)
    ) {
      setError(
        payment === "revshare"
          ? "Доля должна быть от 1 до 100%."
          : "Укажите положительный бюджет.",
      );
      return;
    }
    const id = crypto.randomUUID();
    const saved = store.addProject({
      id,
      gameId: game?.id,
      meta: {
        genre,
        stage,
        engine: engine.trim(),
        platform: platform.trim(),
        goal: goal.trim() || description.trim(),
      },
      title: title.trim(),
      description: description.trim(),
      category,
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 4),
      roles: finalRoles.slice(0, 8),
      payment,
      budget: amount,
      members: 1,
      slots: finalRoles.length + 1,
      creatorId: "denis",
      art:
        category === "art"
          ? "station"
          : category === "3d"
            ? "landscape"
            : "station",
    });
    if (!saved) return;
    store.setToast("Проект создан в этом браузере");
    navigate(`/projects/${id}`);
    onClose();
  }
  return (
    <Modal title="Собрать команду" onClose={onClose}>
      <form className="project-form" onSubmit={submit}>
        <div className="form-steps">
          <span className={step === 1 ? "active" : "complete"}>
            <b>{step === 2 ? <Check size={12} /> : "1"}</b> Идея
          </span>
          <i />
          <span className={step === 2 ? "active" : ""}>
            <b>2</b> Команда и условия
          </span>
        </div>
        {step === 1 ? (
          <>
            <label>
              Название проекта
              <input
                required
                maxLength={70}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Как назовём вашу идею?"
              />
            </label>
            <label>
              О проекте
              <textarea
                required
                maxLength={500}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Что создаёте и на каком этапе проект"
              />
            </label>
            <label>
              Направление
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {categoryIds.map((id) => (
                  <option key={id} value={id}>
                    {t(id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Жанр игры
              <select
                aria-label="Жанр игры"
                value={genre}
                onChange={(e) => setGenre(e.target.value as Genre)}
              >
                {Object.entries(genres).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Этап
              <select
                aria-label="Этап проекта"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
              >
                {Object.entries(stages).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Движок
              <input
                required
                maxLength={80}
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              />
            </label>
            <label>
              Платформа
              <input
                required
                maxLength={80}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </label>
            <label>
              Ближайшая цель
              <textarea
                maxLength={1500}
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Что команда хочет получить на первом этапе"
              />
            </label>
            <label>
              Стек и теги
              <input
                maxLength={100}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Godot, pixel art, PC"
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Кого ищете
              <div className="inline-input">
                <input
                  value={role}
                  maxLength={50}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Например, 3D-художник"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRole();
                    }
                  }}
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={addRole}
                  aria-label="Добавить роль"
                >
                  <Plus size={18} />
                </button>
              </div>
            </label>
            <div className="editable-tags">
              {roles.map((item) => (
                <span key={item}>
                  {item}
                  <button
                    type="button"
                    aria-label={`Удалить роль ${item}`}
                    onClick={() => setRoles(roles.filter((x) => x !== item))}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            <fieldset>
              <legend>Формат участия</legend>
              <div className="segmented payment-toggle">
                <button
                  type="button"
                  className={payment === "fixed" ? "active" : ""}
                  onClick={() => {
                    setPayment("fixed");
                    setBudget("30000");
                  }}
                >
                  Фиксированная оплата
                </button>
                <button
                  type="button"
                  className={payment === "revshare" ? "active" : ""}
                  onClick={() => {
                    setPayment("revshare");
                    setBudget("15");
                  }}
                >
                  RevShare
                </button>
              </div>
            </fieldset>
            <label>
              {payment === "fixed" ? "Бюджет, ₽" : "Доля от выручки, %"}
              <input
                required
                type="number"
                min="1"
                max={payment === "revshare" ? 100 : 100000000}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {step === 2 && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={16} />
              Назад
            </button>
          )}
          <button className="primary-btn" type="submit">
            {step === 1 ? "Дальше" : "Создать проект"}
            <ArrowRight size={16} />
          </button>
        </div>
        <p className="form-note">
          Локальное демо. Проект будет доступен только в этом браузере.
        </p>
      </form>
    </Modal>
  );
}
export function ProposeCategory({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal title="Новое направление" onClose={onClose}>
      <form
        className="project-form"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = name.trim();
          if (!clean) {
            setError("Введите название.");
            return;
          }
          if (
            [...store.categories, ...categoryIds.map(t), t("all")].some(
              (x) => x.toLowerCase() === clean.toLowerCase(),
            )
          ) {
            setError("Такое направление уже есть.");
            return;
          }
          store.proposeCategory(clean);
          store.setToast("Предложение сохранено локально");
          onClose();
        }}
      >
        <label>
          Название категории
          <input
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, моушн-дизайн"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-btn" type="submit">
          <Plus size={16} />
          Предложить категорию
        </button>
        <p className="form-note">
          Локальная заявка на модерацию. Отправка модераторам появится после
          подключения сервера.
        </p>
        {store.categories.length > 0 && (
          <div className="pending-categories">
            <h3>Ваши предложения</h3>
            {store.categories.map((category) => (
              <div key={category}>
                <span>{category}</span>
                <small>Ожидает отправки</small>
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
