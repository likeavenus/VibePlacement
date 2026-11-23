import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Bell,
  MessageSquarePlus,
  Plus,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  LayoutGrid,
  Menu,
  UserRound,
  Users,
  House,
  CircleHelp,
  X,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import {
  CreateProject,
  ProposeCategory,
} from "../features/projects/CreateProject";
import { Avatar } from "../components/Cards";
import { Modal } from "../components/Modal";
import { t } from "../i18n";
import type { Category } from "../data/types";
import { PublishWork } from "../features/studio/PublishWork";
import { directions } from "../data/categories";
import { NavigationProgress, RoutePending } from "./NavigationProgress";
import { Start } from "./Start";
import { Guide, guideSeen } from "./Guide";
import "../features/games/theme.css";
const Marketplace = lazy(() =>
  import("../features/marketplace/Marketplace").then((m) => ({
    default: m.Marketplace,
  })),
);
const Creators = lazy(() =>
  import("../features/profile/Profile").then((m) => ({ default: m.Creators })),
);
const Profile = lazy(() =>
  import("../features/profile/Profile").then((m) => ({ default: m.Profile })),
);
const ProjectPage = lazy(() =>
  import("../features/projects/ProjectPage").then((m) => ({
    default: m.ProjectPage,
  })),
);
const GameWorkspace = lazy(() =>
  import("../features/games/Games").then((m) => ({ default: m.GameWorkspace })),
);
const categories = [{ id: "all", icon: LayoutGrid }, ...directions] as const;
function Shell() {
  const store = useStore(),
    location = useLocation(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const boardWindow = /^\/games\/[^/]+$/.test(location.pathname) && params.get("board") === "1";
  const [create, setCreate] = useState(false),
    [publish, setPublish] = useState(false),
    [categoryModal, setCategoryModal] = useState(false),
    [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false),
    [feedback, setFeedback] = useState(false),
    [feedbackType, setFeedbackType] = useState<"idea" | "bug" | "friction">("idea"),
    [feedbackText, setFeedbackText] = useState("");
  const [guide, setGuide] = useState(() => !guideSeen());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sotvor:sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("vibeplacement:theme") === "dark" ? "dark" : "light"; }
    catch { return "light"; }
  });
  const mode =
      location.pathname === "/discover" || params.get("mode") === "projects",
    currentCategory = params.get("category") ?? "all";
  const categoryItems = mode ? store.projectList : store.workList;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => {
    if (!store.toast) return;
    const timer = window.setTimeout(() => store.setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [store.toast, store.setToast]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("vibeplacement:theme", theme); } catch { /* Theme still applies for this session. */ }
  }, [theme]);
  useEffect(() => {
    try { localStorage.setItem("sotvor:sidebar-collapsed", String(sidebarCollapsed)); } catch { /* The layout still applies for this session. */ }
  }, [sidebarCollapsed]);
  const categoryLink = (id: Category) => {
    if (location.pathname === "/creators") return `/creators${id === "all" ? "" : `?specialty=${id}`}`;
    const next = new URLSearchParams(
      location.pathname === "/market" ||
        location.pathname === "/discover" ||
        location.pathname === "/favorites"
        ? params
        : undefined,
    );
    if (id === "all") next.delete("category");
    else next.set("category", id);
    return `${location.pathname === "/favorites" ? "/favorites" : mode || location.pathname === "/discover" ? "/discover" : "/market"}?${next.toString()}`;
  };
  return (
    <>
      <div className={`app-shell${sidebarCollapsed ? " sidebar-is-collapsed" : ""}${boardWindow ? " is-board-window" : ""}`} inert={guide && !boardWindow}>
        <a href="#main-content" className="skip-link">
          К содержимому
        </a>
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            aria-label={menu ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <button className="icon-btn sidebar-toggle" aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"} title={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}>
            {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <Link to="/" className="brand" aria-label="Игроцех, главная">
            <span className="brand-symbol">
              <Gamepad2 size={25} strokeWidth={2.1} />
            </span>
            <span className="brand-word">
              Игроцех
            </span>
          </Link>
          <div className="header-actions">
            <button className="icon-btn theme-toggle" aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"} onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-btn"
              aria-label="Открыть гайд"
              title="Короткий гайд"
              onClick={() => {
                setMenu(false);
                setGuide(true);
              }}
            >
              <CircleHelp size={20} />
            </button>
            <div className="language-switch" title="English скоро">
              <span>RU</span>
              <span>/</span>
              <button disabled aria-label="English скоро">
                EN
              </button>
            </div>
            <button
              className="icon-btn notification-button"
              aria-label="Уведомления"
              title="Уведомления"
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
            </button>
            <button
              className="beta-feedback-trigger"
              type="button"
              aria-label="Оставить отзыв о бета-версии"
              onClick={() => setFeedback(true)}
            >
              <MessageSquarePlus size={16} />
              <span>Отзыв о бете</span>
            </button>
            <Link
              to="/profile/denis"
              aria-label="Мой профиль"
              className="header-avatar"
            >
              <Avatar creator={store.creatorById("denis")} />
            </Link>
          </div>
        </header>
        {menu && (
          <button
            className="sidebar-backdrop"
            aria-label="Закрыть меню"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={`sidebar ${menu ? "open" : ""}${sidebarCollapsed ? " is-collapsed" : ""}`}>
          <div className="sidebar-main">
            <nav
              className="personal-nav primary-navigation"
              aria-label="Основная навигация"
            >
              <NavLink to="/" end>
                <House size={18} />
                <span>Начать здесь</span>
              </NavLink>
              <NavLink to="/market">
                <LayoutGrid size={18} />
                <span>Ассеты и услуги</span>
              </NavLink>
              <NavLink to="/discover">
                <Users size={18} />
                <span>Найти проект</span>
              </NavLink>
              <NavLink to="/creators"><UserRound size={18} /><span>Креаторы</span></NavLink>
            </nav>
            <div className="sidebar-divider" />
            {location.pathname === "/market" && <details
              className="sidebar-directions"
              open={currentCategory !== "all"}
            >
              <summary>
                <span>Направления</span>
                <small>{categoryItems.length}</small>
                <ChevronDown size={15} />
              </summary>
              <nav className="category-nav" aria-label="Категории">
                {categories.map(({ id, icon: Icon }) => (
                  <Link
                    key={id}
                    to={categoryLink(id)}
                    onClick={() => setMenu(false)}
                    className={
                      currentCategory === id &&
                      (location.pathname === "/market" ||
                        location.pathname === "/discover" ||
                        location.pathname === "/favorites")
                        ? "active"
                        : ""
                    }
                  >
                    <Icon size={18} />
                    <span>{t(id)}</span>
                    <small>
                      {id === "all"
                        ? categoryItems.length
                        : categoryItems.filter((item) => item.category === id)
                            .length}
                    </small>
                  </Link>
                ))}
              </nav>
              <button
                className="propose-category"
                onClick={() => {
                  setCategoryModal(true);
                  setMenu(false);
                }}
              >
                <Plus size={16} />
                <span>Своя категория</span>
              </button>
            </details>}
            {location.pathname === "/market" && <div className="sidebar-divider" />}
            <div className="sidebar-section-label">ЛИЧНОЕ</div>
            <nav className="personal-nav" aria-label="Личное пространство">
              <NavLink to="/profile/denis">
                <UserRound size={18} />
                <span>{t("profile")}</span>
              </NavLink>
            </nav>
          </div>
          <div className="sidebar-bottom">
            <Link
              to="/profile/denis"
              className="sidebar-user"
              aria-label="Мой профиль"
            >
              <Avatar creator={store.creatorById("denis")} />
              <strong>{store.creatorById("denis").name}</strong>
            </Link>
          </div>
        </aside>
        <main id="main-content" className="main-content">
          <Suspense fallback={<RoutePending />}>
            <Routes>
              <Route
                path="/"
                element={
                  params.size ? (
                    <Navigate
                      replace
                      to={`${mode ? "/discover" : "/market"}?${params.toString()}`}
                    />
                  ) : (
                    <Start />
                  )
                }
              />
              <Route
                path="/market"
                element={<Marketplace onPublish={() => setPublish(true)} />}
              />
              <Route
                path="/discover"
                element={
                  <Marketplace projectsOnly onRecruit={() => setCreate(true)} />
                }
              />
              <Route path="/projects/:id" element={<ProjectPage />} />
              <Route path="/games" element={<Navigate replace to={`/profile/denis?tab=games${params.get("new") === "1" ? "&new=1" : ""}`} />} />
              <Route path="/games/:id" element={<GameWorkspace />} />
              <Route path="/studio" element={<Navigate replace to={`/profile/denis?tab=studio${params.get("publish") === "1" ? "&publish=1" : ""}`} />} />
              <Route path="/library" element={<Navigate replace to="/profile/denis?tab=library" />} />
              <Route
                path="/favorites"
                element={<Navigate replace to="/profile/denis?tab=favorites" />}
              />
              <Route path="/creators" element={<Creators />} />
              <Route path="/profile" element={<Navigate replace to={`/profile/denis?${params.toString()}`} />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route
                path="*"
                element={
                  <div className="empty-state">
                    <h1>Такой страницы нет</h1>
                    <button
                      className="primary-btn"
                      onClick={() => navigate("/")}
                    >
                      На главную
                    </button>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        {create && <CreateProject onClose={() => setCreate(false)} />}
        {publish && <PublishWork onClose={() => setPublish(false)} />}
        {categoryModal && (
          <ProposeCategory onClose={() => setCategoryModal(false)} />
        )}
        {notifications && (
          <Modal title="Уведомления" onClose={() => setNotifications(false)}>
            <div className="notifications-list">
              {store.applications.length ? (
                <>
                  <p>
                    Сохранённые отклики и запросы:{" "}
                    <strong>{store.applications.length}</strong>
                  </p>
                  <span>Сохранены в этом браузере.</span>
                </>
              ) : (
                <>
                  <Bell size={32} />
                  <h3>Пока тихо</h3>
                  <span>Новых уведомлений нет.</span>
                </>
              )}
            </div>
          </Modal>
        )}
        {feedback && (
          <Modal title="Отзыв о бета-версии" onClose={() => setFeedback(false)}>
            <form
              className="beta-feedback-form"
              onSubmit={(event) => {
                event.preventDefault();
                const text = feedbackText.trim();
                if (!text) return;
                const kind = { idea: "Идея", bug: "Ошибка", friction: "Неудобство" }[feedbackType];
                const issue = new URL("https://github.com/likeavenus/VibePlacement/issues/new");
                issue.searchParams.set("title", `${kind}: ${text.split("\n")[0].slice(0, 72)}`);
                issue.searchParams.set("body", text);
                window.open(issue.toString(), "_blank", "noopener,noreferrer");
              }}
            >
              <p className="beta-feedback-intro">Расскажите, чего не хватает или что мешает работать. Это поможет выбрать следующие улучшения.</p>
              <div className="beta-feedback-types" role="group" aria-label="Тип пожелания">
                {([["idea", "Идея"], ["bug", "Ошибка"], ["friction", "Неудобство"]] as const).map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={feedbackType === value} className={feedbackType === value ? "is-active" : ""} onClick={() => setFeedbackType(value)}>{label}</button>
                ))}
              </div>
              <label>
                <span>Ваше сообщение</span>
                <textarea value={feedbackText} onChange={(event) => setFeedbackText(event.target.value)} maxLength={1200} rows={6} placeholder="Например: хочу видеть быстрый просмотр проекта прямо из списка…" required />
              </label>
              <p className="beta-feedback-note">Откроется черновик на GitHub. Чтобы команда увидела отзыв, войдите и опубликуйте его. Не указывайте личные данные: отзыв будет публичным.</p>
              <div className="form-actions">
                <button className="secondary-btn" type="button" onClick={() => setFeedback(false)}>Отмена</button>
                <button className="primary-btn" type="submit" disabled={!feedbackText.trim()}>Продолжить на GitHub ↗</button>
              </div>
            </form>
          </Modal>
        )}
        {store.toast && (
          <div className="toast" role="status">
            <span className="tiny-dot" />
            {store.toast}
            <button
              className="icon-btn"
              aria-label="Скрыть уведомление"
              onClick={() => store.setToast("")}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      {guide && !boardWindow && (
        <Guide
          onClose={() => setGuide(false)}
        />
      )}
    </>
  );
}
export function App() {
  return (
    <StoreProvider>
      <NavigationProgress>
        <Shell />
      </NavigationProgress>
    </StoreProvider>
  );
}
