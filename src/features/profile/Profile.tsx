import { lazy, Suspense, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Copy, MapPin, Star, Settings2, Search, Plus, Gamepad2, Palette, LibraryBig, Bookmark, UserRound, X } from "lucide-react";
import { Avatar, WorkCard, ProjectCard } from "../../components/Cards";
import { useStore } from "../../app/store";
import { Modal } from "../../components/Modal";
import { RoutePending } from "../../app/NavigationProgress";
import { availabilityLabels, creatorSpecialties, matchesSearch, specialties } from "../../data/people";
import { ProfileEditor } from "./ProfileEditor";
import { WorkPreview } from "./WorkPreview";
import { UiSelect } from "../../components/UiSelect";
import "./people.css";

const Games = lazy(() => import("../games/Games").then((module) => ({ default: module.Games })));
const Studio = lazy(() => import("../studio/Studio").then((module) => ({ default: module.Studio })));
const Library = lazy(() => import("../studio/Studio").then((module) => ({ default: module.Library })));
const privateTabs = [
  { id: "games", title: "Мои игры", Icon: Gamepad2 }, { id: "studio", title: "Публикации", Icon: Palette },
  { id: "library", title: "Покупки", Icon: LibraryBig }, { id: "favorites", title: "Избранное", Icon: Bookmark },
];
export function Profile() {
  const { id } = useParams();
  return <ProfilePage key={id} id={id} />;
}
function ProfilePage({ id }: { id?: string }) {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState(false);
  const creator = store.creatorList.find((item) => item.id === id);
  if (!creator) return <div className="empty-state"><h1>Профиль не найден</h1><Link to="/creators">К креаторам</Link></div>;
  const own = id === "denis";
  const requestedTab = params.get("tab") ?? "works";
  const tab = ["works", "projects", ...(own ? privateTabs.map((item) => item.id) : [])].includes(requestedTab) ? requestedTab : "works";
  const portfolio = store.workList.filter((work) => work.creatorId === id);
  const projects = store.projectList.filter((project) => project.creatorId === id || project.filledRoles?.some((slot) => slot.assignee === id));
  const savedWorks = store.workList.filter((work) => store.favorites.includes(work.id));
  const personal = privateTabs.some((item) => item.id === tab);
  const selectTab = (value: string) => setParams(value === "works" ? {} : { tab: value });
  return <div className="people-profile">
    {own && <nav className="account-tabs" aria-label="Мой аккаунт">
      <button type="button" aria-current={!personal ? "page" : undefined} className={!personal ? "active" : ""} onClick={() => selectTab("works")}><UserRound size={18} />Профиль</button>
      {privateTabs.map(({ id: value, title, Icon }) => <button type="button" key={value} aria-current={tab === value ? "page" : undefined} className={tab === value ? "active" : ""} onClick={() => selectTab(value)}><Icon size={18} />{title}</button>)}
    </nav>}
    {personal ? <Suspense fallback={<RoutePending />}>
      {tab === "games" && <Games />}
      {tab === "studio" && <Studio />}
      {tab === "library" && <Library />}
      {tab === "favorites" && <><div className="page-heading"><h1>Избранное</h1></div>{savedWorks.length ? <div className="work-grid">{savedWorks.map((work) => <WorkCard key={work.id} work={work} />)}</div> : <div className="empty-state"><h2>Пока ничего не сохранено</h2><Link className="secondary-btn" to="/market">Найти работы</Link></div>}</>}
    </Suspense> : <>
      {!own && <Link to="/creators" className="back-link"><ArrowLeft size={16} />Все креаторы</Link>}
      {editing ? <ProfileEditor creator={creator} onClose={() => setEditing(false)} /> : <>
        {creator.cover && <div className="people-profile-cover"><img src={creator.cover} alt="Обложка профиля" /></div>}
        <section className="profile-header">
          <Avatar creator={creator} large />
          <div className="profile-name">
            <span className={`people-availability is-${creator.availability ?? "open"}`}>{availabilityLabels[creator.availability ?? "open"]}</span>
            <h1>{creator.name}</h1><p>{creator.role}</p><small>@{creator.handle}</small>
          </div>
          <div className="profile-actions">
            <button className="secondary-btn icon-only" title="Скопировать ссылку" aria-label="Скопировать ссылку на профиль" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => store.setToast("Ссылка скопирована")).catch(() => store.setToast("Не удалось скопировать ссылку"))}><Copy size={18} /></button>
            {own ? <button className="secondary-btn" onClick={() => setEditing(true)}><Settings2 size={18} />Настройки</button> : <button className="primary-btn" onClick={() => setContact(true)}>Предложить проект<ArrowUpRight size={18} /></button>}
          </div>
        </section>
        <div className="profile-info"><div><p>{creator.bio}</p><div className="tags">{creator.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><span className="profile-location"><MapPin size={15} />{creator.location || "Удалённо"}</span></div>
          <div className="profile-stats"><div><strong><Star size={20} />{creator.rating.toFixed(1)}</strong><span>рейтинг по сделкам</span></div><div><strong>{creator.completed}</strong><span>закрытых проектов</span></div></div>
        </div>
      </>}
      {own && !editing && tab === "works" && <div className="account-actions"><Link to="/profile/denis?tab=studio&publish=1" className="primary-btn"><Plus size={18} />Опубликовать работу</Link></div>}
      <div className="profile-tabs" role="tablist" aria-label="Работы и проекты"><button role="tab" aria-selected={tab === "works"} className={tab === "works" ? "active" : ""} onClick={() => selectTab("works")}>Портфолио<span>{portfolio.length}</span></button><button role="tab" aria-selected={tab === "projects"} className={tab === "projects" ? "active" : ""} onClick={() => selectTab("projects")}>Проекты<span>{projects.length}</span></button></div>
      <div className="work-grid profile-grid">{tab === "works" ? portfolio.map((work) => <WorkCard key={work.id} work={work} />) : projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      {!(tab === "works" ? portfolio.length : projects.length) && <div className="empty-state"><h2>{tab === "works" ? "Работы пока не опубликованы" : "Публичных проектов пока нет"}</h2></div>}
    </>}
    {contact && <Modal title={`Проект для ${creator.name}`} onClose={() => setContact(false)}><form className="project-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (store.apply(`contact:${creator.id}:${String(form.get("message")).trim()}`)) { store.setToast("Предложение сохранено в браузере"); setContact(false); } }}><label>Предложение<textarea required name="message" minLength={10} maxLength={1000} rows={5} placeholder="Задача, сроки и оплата" /></label><p className="form-note">Локальный черновик. Автору не отправляется.</p><button className="primary-btn" type="submit">Сохранить предложение</button></form></Modal>}
  </div>;
}

export function Creators() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "", specialty = params.get("specialty") ?? "", availability = params.get("availability") ?? "", sort = params.get("sort") ?? "rating";
  const change = (key: string, value: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const people = store.creatorList.filter((creator) => matchesSearch(`${creator.name} ${creator.role} ${creator.bio} ${creator.skills.join(" ")}`, query) && (!specialty || creatorSpecialties(creator, store.workList).includes(specialty as keyof typeof specialties)) && (!availability || (creator.availability ?? "open") === availability)).sort((a, b) => sort === "experience" ? b.completed - a.completed : sort === "name" ? a.name.localeCompare(b.name, "ru") : b.rating - a.rating || b.completed - a.completed);
  return <div className="people-directory">
    <div className="page-heading"><h1>Креаторы</h1><Link className="text-action" to="/discover">Найти проект<ArrowUpRight size={18} /></Link></div>
    <div className="people-filters"><label className="search-field"><Search size={18} /><input aria-label="Поиск креаторов" placeholder="Имя, специализация или навык" value={query} onChange={(event) => change("q", event.target.value)} />{query && <button className="icon-btn" aria-label="Очистить поиск" onClick={() => change("q", "")}><X size={16} /></button>}</label>
      <label>Направление<UiSelect ariaLabel="Направление" value={specialty} options={[{ value: "", label: "Все направления" }, ...Object.entries(specialties).map(([value, label]) => ({ value, label }))]} onChange={(value) => change("specialty", value)} /></label>
      <label>Доступность<UiSelect ariaLabel="Доступность" value={availability} options={[{ value: "", label: "Любая" }, ...Object.entries(availabilityLabels).map(([value, label]) => ({ value, label }))]} onChange={(value) => change("availability", value)} /></label>
      <label>Сортировка<UiSelect ariaLabel="Сортировка" value={sort} options={[{ value: "rating", label: "По рейтингу" }, { value: "experience", label: "По закрытым проектам" }, { value: "name", label: "По имени" }]} onChange={(value) => change("sort", value)} /></label>
    </div>
    <div className="people-results" role="status"><span>Найдено: {people.length}</span>{(query || specialty || availability) && <button className="text-action" onClick={() => setParams({})}>Сбросить фильтры<X size={15} /></button>}</div>
    <div className="people-list">{people.map((creator) => {
      const portfolio = store.workList.filter((work) => work.creatorId === creator.id);
      const feedbackCount = store.comments.filter((comment) => portfolio.some((work) => work.id === comment.workId)).length;
      return <article className="people-row" key={creator.id}>
        <Link className="people-avatar" to={`/profile/${creator.id}`} aria-label={`Профиль: ${creator.name}`}><Avatar creator={creator} large /></Link>
        <div className="people-summary"><div className="people-title"><h2><Link to={`/profile/${creator.id}`}>{creator.name}</Link></h2><span className={`people-availability is-${creator.availability ?? "open"}`}>{availabilityLabels[creator.availability ?? "open"]}</span></div><p className="people-role">{creator.role}</p><p className="people-bio">{creator.bio}</p><div className="tags">{creator.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="people-stats"><span><Star size={16} />{creator.rating.toFixed(1)}</span><span>{creator.completed} закрытых проектов</span>{feedbackCount > 0 && <span>{feedbackCount} комментариев к работам</span>}</div></div>
        <div className="people-portfolio">{portfolio.slice(0, 2).map((work) => <WorkPreview key={work.id} work={work} />)}{!portfolio.length && <span>Портфолио пока пусто</span>}<Link className="text-action" to={`/profile/${creator.id}`}>Профиль и работы<ArrowUpRight size={17} /></Link></div>
      </article>;
    })}</div>
    {!people.length && <div className="empty-state"><Search size={30} /><h2>Креаторы не найдены</h2><button className="secondary-btn" onClick={() => setParams({})}>Сбросить фильтры</button></div>}
  </div>;
}
