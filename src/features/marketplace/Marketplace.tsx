import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useStore } from "../../app/store";
import { WorkCard, ProjectCard } from "../../components/Cards";
import { creatorById } from "../../data/mock";
import { t } from "../../i18n";
import { genres, stages, projectMeta } from "../../data/projects";
export function Marketplace({
  favoritesOnly = false,
}: {
  favoritesOnly?: boolean;
}) {
  const [params, setParams] = useSearchParams(),
    store = useStore();
  const mode =
    !favoritesOnly && params.get("mode") === "projects"
      ? "projects"
      : "services";
  const category = params.get("category") ?? "all",
    query = params.get("q") ?? "",
    sort = params.get("sort") ?? "recommended";
  const [filters, setFilters] = useState(false);
  const onlyTop = params.get("top") === "1",
    maxPrice = params.get("price") ?? "",
    payment = params.get("payment") ?? "all";
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const normalized = query.toLowerCase().trim();
  const filteredWorks = store.workList
    .filter((work) => {
      const creator = creatorById(work.creatorId);
      return (
        (!favoritesOnly || store.favorites.includes(work.id)) &&
        (category === "all" || work.category === category) &&
        (!onlyTop || creator.rating >= 4.9) &&
        (!maxPrice || work.price <= Number(maxPrice)) &&
        `${work.title} ${work.tags.join(" ")} ${creator.name} ${creator.skills.join(" ")}`
          .toLowerCase()
          .includes(normalized)
      );
    })
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "rating"
          ? creatorById(b.creatorId).rating - creatorById(a.creatorId).rating
          : 0,
    );
  const filteredProjects = store.projectList
    .filter(
      (project) =>
        (category === "all" || project.category === category) &&
        (payment === "all" || project.payment === payment) &&
        (!params.get("genre") ||
          projectMeta(project).genre === params.get("genre")) &&
        (!params.get("stage") ||
          projectMeta(project).stage === params.get("stage")) &&
        (!params.get("role") || project.roles.includes(params.get("role")!)) &&
        `${project.title} ${project.description} ${project.roles.join(" ")} ${project.tags.join(" ")}`
          .toLowerCase()
          .includes(normalized),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.budget - b.budget
        : sort === "rating"
          ? creatorById(b.creatorId).rating - creatorById(a.creatorId).rating
          : 0,
    );
  const count =
    mode === "services" ? filteredWorks.length : filteredProjects.length;
  const activeFilters =
    onlyTop ||
    !!maxPrice ||
    payment !== "all" ||
    !!params.get("genre") ||
    !!params.get("stage") ||
    !!params.get("role");
  const reset = () =>
    setParams(mode === "projects" ? { mode: "projects" } : {});
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {favoritesOnly
              ? t("favorites")
              : mode === "projects"
                ? "Найди команду"
                : "Всё для твоей игры"}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {favoritesOnly
              ? `${store.favorites.length} сохранённых работ`
              : mode === "projects"
                ? "Выбери жанр и свою роль."
                : "Работы креаторов и люди в команду."}
          </p>
        </div>
      </div>
      {!favoritesOnly && (
        <div
          className="market-tabs"
          role="tablist"
          aria-label="Режим маркетплейса"
        >
          <button
            role="tab"
            aria-selected={mode === "services"}
            className={mode === "services" ? "active" : ""}
            onClick={() => change("mode", "")}
          >
            Работы
          </button>
          <button
            role="tab"
            aria-selected={mode === "projects"}
            className={mode === "projects" ? "active" : ""}
            onClick={() => change("mode", "projects")}
          >
            Игры
          </button>
        </div>
      )}
      <div className="search-row">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Поиск по ленте"
            placeholder={
              mode === "services" ? t("search") : "Проект, стек или роль"
            }
            value={query}
            onChange={(e) => change("q", e.target.value)}
          />
          {query && (
            <button
              className="icon-btn"
              aria-label="Очистить поиск"
              onClick={() => change("q", "")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <button
          className={`filter-button ${filters || activeFilters ? "active" : ""}`}
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={16} />
          <span>Фильтры</span>
          {activeFilters && <i />}
        </button>
        <select
          className="sort-select"
          aria-label="Сортировка"
          value={sort}
          onChange={(e) => change("sort", e.target.value)}
        >
          <option value="recommended">Рекомендуем</option>
          <option value="rating">По рейтингу</option>
          <option value="price">По цене</option>
        </select>
      </div>
      {filters && (
        <>
          <div className="filter-panel">
            {mode === "services" ? (
              <>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyTop}
                    onChange={(e) => change("top", e.target.checked ? "1" : "")}
                  />
                  Рейтинг 4.9 и выше
                </label>
                <label>
                  Бюджет до
                  <input
                    aria-label="Максимальная цена"
                    type="number"
                    min="0"
                    placeholder="Любой"
                    value={maxPrice}
                    onChange={(e) => change("price", e.target.value)}
                  />
                  <span>₽</span>
                </label>
              </>
            ) : (
              <label>
                Формат оплаты
                <select
                  value={payment}
                  onChange={(e) => change("payment", e.target.value)}
                >
                  <option value="all">Любой</option>
                  <option value="fixed">Фиксированная</option>
                  <option value="revshare">RevShare</option>
                </select>
              </label>
            )}
            <button className="text-action" onClick={reset}>
              Сбросить
              <X size={13} />
            </button>
          </div>
        </>
      )}
      {mode === "projects" && (
        <div className="project-discovery">
          <label>
            Жанр игры
            <select
              aria-label="Жанр игры"
              value={params.get("genre") ?? ""}
              onChange={(e) => change("genre", e.target.value)}
            >
              <option value="">Все жанры</option>
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
              value={params.get("stage") ?? ""}
              onChange={(e) => change("stage", e.target.value)}
            >
              <option value="">Все этапы</option>
              {Object.entries(stages).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Моя роль
            <select
              aria-label="Роль в команде"
              value={params.get("role") ?? ""}
              onChange={(e) => change("role", e.target.value)}
            >
              <option value="">Все роли</option>
              {[...new Set(store.projectList.flatMap((p) => p.roles))]
                .sort()
                .map((role) => (
                  <option key={role}>{role}</option>
                ))}
            </select>
          </label>
          {activeFilters && (
            <button className="text-action" onClick={reset}>
              Сбросить <X size={16} />
            </button>
          )}
        </div>
      )}
      <div className="results-heading">
        <h2>
          {category === "all"
            ? mode === "services"
              ? favoritesOnly
                ? "Сохранённое"
                : "Работы"
              : "Игры в поиске команды"
            : t(category as Parameters<typeof t>[0]) || "Работы"}
          <span>{count}</span>
        </h2>
        <span className="results-note">
          <Check size={13} />
          {mode === "services"
            ? "Рейтинг по закрытым проектам"
            : "Идея есть. Не хватает тебя."}
        </span>
      </div>
      {count ? (
        <div className="work-grid">
          {mode === "services"
            ? filteredWorks.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))
            : filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={34} />
          <h2>{t("empty")}</h2>
          <button className="secondary-btn" onClick={reset}>
            {t("clear")}
          </button>
        </div>
      )}
    </>
  );
}
