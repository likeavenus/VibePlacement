import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../components/Modal";
import { UiSelect } from "../../components/UiSelect";
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
  const [payment, setPayment] = useState<"fixed" | "revshare" | "mixed">(game?.payment ?? "fixed"),
    [role, setRole] = useState(""),
    [roles, setRoles] = useState<string[]>(game?.team?.filter((slot) => !slot.assignee).map((slot) => slot.role) ?? []),
    [roleOffers, setRoleOffers] = useState<Record<string, string>>(() => Object.fromEntries((game?.team ?? []).filter((slot) => !slot.assignee).map((slot) => [slot.role, ""]))),
    [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const addRole = () => {
    const next = role.trim();
    if (next && !roles.includes(next) && roles.length < 30) {
      setRoles([...roles, next]);
      setRoleOffers({ ...roleOffers, [next]: "" });
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
    if (role.trim() && !roles.includes(role.trim())) {
      setError("Добавьте роль кнопкой +.");
      return;
    }
    const finalRoles = roles;
    if (!finalRoles.length) {
      setError("Добавьте хотя бы одну роль.");
      return;
      }
    if (payment === "fixed" && finalRoles.some((item) => !(Number(roleOffers[item]) > 0))) {
      setError("Укажите оплату для каждой роли.");
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
      roles: finalRoles.slice(0, 30),
      roleOffers: payment !== "revshare" ? finalRoles.filter((item) => Number(roleOffers[item]) > 0).slice(0, 30).map((item) => ({ role: item, amount: Number(roleOffers[item]) })) : [],
      filledRoles: game?.team?.filter((slot) => slot.assignee).map(({ role, assignee }) => ({ role, assignee })),
      payment,
      budget: 0,
      members: 1 + (game?.team?.filter((slot) => slot.assignee).length ?? 0),
      slots: finalRoles.length + (game?.team?.filter((slot) => slot.assignee).length ?? 0) + 1,
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
              <UiSelect
                ariaLabel="Направление"
                value={category}
                onChange={(value) => setCategory(value as Category)}
                options={categoryIds.map((id) => ({ value: id, label: t(id) }))}
              />
            </label>
            <label>
              Жанр игры
              <UiSelect
                ariaLabel="Жанр игры"
                value={genre}
                onChange={(value) => setGenre(value as Genre)}
                options={Object.entries(genres).map(([id, label]) => ({ value: id, label }))}
              />
            </label>
            <label>
              Этап
              <UiSelect
                ariaLabel="Этап проекта"
                value={stage}
                onChange={(value) => setStage(value as Stage)}
                options={Object.entries(stages).map(([id, label]) => ({ value: id, label }))}
              />
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
                  maxLength={80}
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
            {payment !== "revshare" && <fieldset className="project-role-offers">
              <legend>{payment === "mixed" ? "Оплата разовых работ, ₽ (если известна)" : "Оплата за работу, ₽"}</legend>
              {roles.map((item) => <label key={item}>{item}<input type="number" min="1" max="10000000" value={roleOffers[item] ?? ""} onChange={(event) => setRoleOffers({ ...roleOffers, [item]: event.target.value })} /></label>)}
            </fieldset>}
            <fieldset>
              <legend>Формат участия</legend>
              <div className="segmented payment-toggle">
                <button
                  type="button"
                  className={payment === "fixed" ? "active" : ""}
                  onClick={() => {
                    setPayment("fixed");
                  }}
                >
                  Фиксированная оплата
                </button>
                <button
                  type="button"
                  className={payment === "revshare" ? "active" : ""}
                  onClick={() => {
                    setPayment("revshare");
                  }}
                >
                  RevShare
                </button>
                <button type="button" className={payment === "mixed" ? "active" : ""} onClick={() => setPayment("mixed")}>Комбинированный</button>
              </div>
            </fieldset>
            <p className="form-note">{payment === "mixed" ? "Для каждой роли можно согласовать свои условия: постоянное участие, разовый заказ или долю." : payment === "fixed" ? "Стоимость будет указана в каждой отдельной задаче." : "Размер доли согласуется отдельно с каждым участником."}</p>
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
        <p className="form-note">Сохранится в браузере.</p>
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
          store.setToast("Предложение сохранено в браузере");
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
          Сохранить предложение
        </button>
        <p className="form-note">
          Сохранится в браузере. Модераторам не отправляется.
        </p>
        {store.categories.length > 0 && (
          <div className="pending-categories">
            <h3>Ваши предложения</h3>
            {store.categories.map((category) => (
              <div key={category}>
                <span>{category}</span>
                <small>Черновик</small>
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
