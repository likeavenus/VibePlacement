import { lazy, Suspense, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  Bell,
  Bookmark,
  LibraryBig,
  Palette,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  LayoutGrid,
  Menu,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { StoreProvider, useStore } from "./store";
import {
  CreateProject,
  ProposeCategory,
} from "../features/projects/CreateProject";
import { Avatar } from "../components/Cards";
import { Modal } from "../components/Modal";
import { creators } from "../data/mock";
import { t } from "../i18n";
import type { Category } from "../data/types";
import { PublishWork } from "../features/studio/PublishWork";
import { directions } from "../data/categories";
import { NavigationProgress, RoutePending } from "./NavigationProgress";
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
const Games = lazy(() =>
  import("../features/games/Games").then((m) => ({ default: m.Games })),
);
const ProjectPage = lazy(() =>
  import("../features/projects/ProjectPage").then((m) => ({
    default: m.ProjectPage,
  })),
);
const GameWorkspace = lazy(() =>
  import("../features/games/Games").then((m) => ({ default: m.GameWorkspace })),
);
const Studio = lazy(() =>
  import("../features/studio/Studio").then((m) => ({ default: m.Studio })),
);
const Library = lazy(() =>
  import("../features/studio/Studio").then((m) => ({ default: m.Library })),
);
const categories = [{ id: "all", icon: LayoutGrid }, ...directions] as const;
function Shell() {
  const store = useStore(),
    location = useLocation(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [create, setCreate] = useState(false),
    [publish, setPublish] = useState(false),
    [categoryModal, setCategoryModal] = useState(false),
    [menu, setMenu] = useState(false),
    [notifications, setNotifications] = useState(false);
  const mode = params.get("mode") === "projects",
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
  const categoryLink = (id: Category) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    return `${location.pathname === "/favorites" ? "/favorites" : "/"}?${next.toString()}`;
  };
  return (
    <div className="app-shell">
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
        <Link to="/" className="brand" aria-label="VibePlacement — главная">
          <span className="brand-symbol">
            <Gamepad2 size={25} strokeWidth={2.1} />
          </span>
          <span className="brand-word">
            Vibe<span>Placement</span>
          </span>
        </Link>
        <div className="header-actions">
          <div className="language-switch" title="English — скоро">
            <span>RU</span>
            <span>/</span>
            <button disabled aria-label="English — скоро">
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
            className="primary-btn create-button"
            aria-label="Опубликовать работу"
            title="Опубликовать работу"
            onClick={() => setPublish(true)}
          >
            <Plus size={17} />
            <span>Публикация</span>
          </button>
          <Link
            to="/profile/denis"
            aria-label="Мой профиль"
            className="header-avatar"
          >
            <Avatar creator={creators[2]} />
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
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-main">
          <details
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
                    (location.pathname === "/" ||
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
              Своя категория
            </button>
          </details>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">ЛИЧНОЕ</div>
          <nav className="personal-nav" aria-label="Личное пространство">
            <NavLink to="/games">
              <Gamepad2 size={18} />
              <span>Мои игры</span>
              <small>{store.games.length}</small>
            </NavLink>
            <NavLink to="/studio">
              <Palette size={18} />
              <span>Мастерская</span>
            </NavLink>
            <NavLink to="/library">
              <LibraryBig size={18} />
              <span>Библиотека</span>
            </NavLink>
            <NavLink to="/favorites">
              <Bookmark size={18} />
              <span>{t("favorites")}</span>
              {store.favorites.length > 0 && (
                <small>{store.favorites.length}</small>
              )}
            </NavLink>
            <NavLink to="/profile/denis">
              <UserRound size={18} />
              <span>{t("profile")}</span>
            </NavLink>
            <NavLink to="/creators">
              <Users size={18} />
              <span>{t("creators")}</span>
            </NavLink>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="start-project">
            <button onClick={() => setCreate(true)} aria-label="Создать игру">
              <Plus size={17} />
              Создать игру
            </button>
          </div>
          <Link to="/profile/denis" className="sidebar-user">
            <Avatar creator={creators[2]} />
            <div>
              <strong>Денис / dev</strong>
              <span>Личный профиль</span>
            </div>
            <ChevronRight size={15} />
          </Link>
          <div className="sidebar-footnote">
            <span>© VibePlacement 2026</span>
          </div>
        </div>
      </aside>
      <main id="main-content" className="main-content">
        {import.meta.env.MODE === "github" && (
          <div className="pages-demo-note">
            Демо · данные хранятся в этом браузере. Оплаты и отправка откликов
            отключены.
          </div>
        )}
        <Suspense fallback={<RoutePending />}>
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:id" element={<GameWorkspace />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/library" element={<Library />} />
            <Route path="/favorites" element={<Marketplace favoritesOnly />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1>Такой страницы нет</h1>
                  <button className="primary-btn" onClick={() => navigate("/")}>
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
                <span>Ожидают подключения сервера.</span>
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
