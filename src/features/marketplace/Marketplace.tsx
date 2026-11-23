import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Search, SlidersHorizontal, X, Plus } from "lucide-react";
import { useStore } from "../../app/store";
import { WorkCard, ProjectCard } from "../../components/Cards";
import { matchesSearch, roleMatchesSpecialty, specialties, type Specialty } from "../../data/people";
import { t } from "../../i18n";
import { genres, stages, projectMeta } from "../../data/projects";
import { categoryIds } from "../../data/categories";
import { UiSelect } from "../../components/UiSelect";
export function Marketplace({
  favoritesOnly = false,
  projectsOnly = false,
  onRecruit,
  onPublish,
}: {
  favoritesOnly?: boolean;
  projectsOnly?: boolean;
  onRecruit?: () => void;
  onPublish?: () => void;
}) {
  const [params, setParams] = useSearchParams(),
    store = useStore();
  const mode =
    !favoritesOnly && (projectsOnly || params.get("mode") === "projects")
      ? "projects"
      : "services";
  const category = params.get("category") ?? "all",
    specialty = params.get("specialty") ?? (mode === "projects" && category !== "all" ? category : ""),
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
  const filteredWorks = store.workList
    .filter((work) => {
      const creator = store.creatorById(work.creatorId);
      return (
        (!favoritesOnly || store.favorites.includes(work.id)) &&
        (category === "all" || work.category === category) &&
        (!onlyTop || creator.rating >= 4.9) &&
        (!maxPrice || work.price <= Number(maxPrice)) &&
        matchesSearch(`${work.title} ${work.tags.join(" ")} ${creator.name} ${creator.skills.join(" ")}`, query)
      );
    })
    .sort((a, b) =>
      sort === "price" && mode === "services"
        ? a.price - b.price
        : sort === "rating"
          ? store.creatorById(b.creatorId).rating - store.creatorById(a.creatorId).rating
          : 0,
    );
  const filteredProjects = store.projectList
    .filter(
      (project) =>
        (!specialty || project.roles.some((role) => roleMatchesSpecialty(role, specialty as Specialty))) &&
        (params.get("closed") === "1" || project.roles.length > 0) &&
        (payment === "all" || project.payment === payment) &&
        (!params.get("genre") ||
          projectMeta(project).genre === params.get("genre")) &&
        (!params.get("stage") ||
          projectMeta(project).stage === params.get("stage")) &&
        (!params.get("role") || project.roles.includes(params.get("role")!)) &&
        matchesSearch(`${project.title} ${project.description} ${project.roles.join(" ")} ${project.tags.join(" ")} ${projectMeta(project).engine} ${projectMeta(project).platform}`, query),
    )
    .sort((a, b) => sort === "rating"
      ? store.creatorById(b.creatorId).rating - store.creatorById(a.creatorId).rating
      : 0);
  const count =
    mode === "services" ? filteredWorks.length : filteredProjects.length;
  const activeFilters =
    onlyTop ||
    !!maxPrice ||
    payment !== "all" ||
    !!params.get("genre") ||
    !!params.get("stage") ||
    !!specialty || !!query || category !== "all" || params.get("closed") === "1" ||
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
                ? "Найти проект"
                : "Ассеты и услуги"}
          </h1>
        </div>
        {onRecruit && (
          <button className="secondary-btn" onClick={onRecruit}>
            <Plus size={17} />
            Объявить набор
          </button>
        )}
        {onPublish && (
          <button className="secondary-btn" onClick={onPublish}>
            <Plus size={17} />
            Опубликовать работу
          </button>
        )}
      </div>
      <div className="search-row">
        {mode === "projects" ? <UiSelect className="direction-select" ariaLabel="Моя специализация" value={specialty} options={[{ value: "", label: "Все специализации" }, ...Object.entries(specialties).map(([value, label]) => ({ value, label }))]} onChange={(value) => {
          const next = new URLSearchParams(params);
          next.delete("category"); next.delete("role");
          if (value) next.set("specialty", value); else next.delete("specialty");
          setParams(next, { replace: true });
        }} /> : <UiSelect
          className="direction-select"
          ariaLabel="Направление работ"
          value={category}
          options={[{ value: "all", label: "Все направления" }, ...categoryIds.map((value) => ({ value, label: t(value) }))]}
          onChange={(value) => change("category", value === "all" ? "" : value)}
        />}
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
        <UiSelect
          className="sort-select"
          ariaLabel="Сортировка"
          value={sort}
          options={[{ value: "recommended", label: "Рекомендуем" }, { value: "rating", label: "По рейтингу" }, ...(mode === "services" ? [{ value: "price", label: "По цене" }] : [])]}
          onChange={(value) => change("sort", value)}
        />
      </div>
      {filters && mode === "services" && (
        <>
          <div className="filter-panel">
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
            <button className="text-action" onClick={reset}>
              Сбросить
              <X size={13} />
            </button>
          </div>
        </>
      )}
      {filters && mode === "projects" && (
        <div className="project-discovery">
          <label>Участие<UiSelect ariaLabel="Участие" value={payment} options={[{ value: "all", label: "Любой формат" }, { value: "fixed", label: "Оплата по задачам" }, { value: "revshare", label: "Доля от выручки" }, { value: "mixed", label: "Комбинированный" }]} onChange={(value) => change("payment", value)} /></label>
          <label>
            Жанр игры
            <UiSelect
              ariaLabel="Жанр игры"
              value={params.get("genre") ?? ""}
              options={[{ value: "", label: "Все жанры" }, ...Object.entries(genres).map(([value, label]) => ({ value, label }))]}
              onChange={(value) => change("genre", value)}
            />
          </label>
          <label>
            Этап
            <UiSelect
              ariaLabel="Этап проекта"
              value={params.get("stage") ?? ""}
              options={[{ value: "", label: "Все этапы" }, ...Object.entries(stages).map(([value, label]) => ({ value, label }))]}
              onChange={(value) => change("stage", value)}
            />
          </label>
          <label>
            Моя роль
            <UiSelect
              ariaLabel="Роль в команде"
              value={params.get("role") ?? ""}
              options={[{ value: "", label: "Все роли" }, ...[...new Set(store.projectList.flatMap((p) => p.roles))].filter((role) => !specialty || roleMatchesSpecialty(role, specialty as Specialty))
                .sort()
                .map((value) => ({ value, label: value }))]}
              onChange={(value) => change("role", value)}
            />
          </label>
          <label className="checkbox-label project-closed-filter"><input type="checkbox" checked={params.get("closed") === "1"} onChange={(event) => change("closed", event.target.checked ? "1" : "")} />Включая закрытый набор</label>
          {activeFilters && (
            <button className="text-action" onClick={reset}>
              Сбросить <X size={16} />
            </button>
          )}
        </div>
      )}
      <div className="results-heading">
        <h2>
          {mode === "projects" ? "Проекты" : category === "all" ? (favoritesOnly ? "Сохранённое" : "Работы") : t(category as Parameters<typeof t>[0]) || "Работы"}
          <span>{count}</span>
        </h2>
        <span className="results-note">
          <Check size={13} />
          {mode === "services"
            ? "Рейтинг по закрытым проектам"
            : "Фиксированная оплата или доля в проекте"}
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
