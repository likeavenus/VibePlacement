import {
  ArrowRight,
  Gamepad2,
  Palette,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "./store";
import { PixelScene } from "../components/viewers/PixelScene";

export function Start({ onPublish }: { onPublish: () => void }) {
  const store = useStore();
  const game = store.games.find((g) => g.id !== "little-station");
  return (
    <div className="start-page">
      <div className="page-heading">
        <div>
          <h1>С чего начнём?</h1>
          <p>
            VibePlacement — место, где авторы игр находят креаторов и материалы
            для своих миров.
          </p>
        </div>
      </div>
      <div className="start-paths">
        <section className="start-path">
          <Gamepad2 className="path-icon" size={30} />
          <h2>Создаю игру</h2>
          <p>Собери план работ, найди ассеты и людей в команду.</p>
          <Link data-guide="make" className="primary-btn" to="/games?new=1">
            <Plus size={18} />
            Создать игру
          </Link>
          <Link data-guide="assets" className="path-link" to="/market">
            <Search size={18} />
            <span>Найти ассеты и услуги</span>
            <ArrowRight size={18} />
          </Link>
          <span className="path-sequence">
            Идея → задачи → материалы и команда
          </span>
        </section>
        <section className="start-path">
          <Palette className="path-icon" size={30} />
          <h2>Я креатор</h2>
          <p>Покажи работу, предложи услугу или присоединись к игре.</p>
          <button
            data-guide="publish"
            className="secondary-btn"
            onClick={onPublish}
          >
            <Plus size={18} />
            Опубликовать работу
          </button>
          <Link data-guide="join" className="path-link" to="/discover">
            <Users size={18} />
            <span>Найти проект в команду</span>
            <ArrowRight size={18} />
          </Link>
          <span className="path-sequence">
            Работа → обратная связь → новые заказы
          </span>
        </section>
      </div>
      <section className="start-continue">
        <div>
          <h2>
            {game ? "Продолжить свою игру" : "Сначала посмотреть пример?"}
          </h2>
          <p>
            {game
              ? "Задачи и набор команды — в одном месте."
              : "Готовый план игры с задачами, бюджетом и материалами."}
          </p>
        </div>
        <Link
          className="continue-game"
          to={`/games/${game?.id ?? "little-station"}`}
        >
          <div className="continue-art">
            <PixelScene station />
          </div>
          <span>
            <small>{game ? "Моя игра" : "Демо-пример"}</small>
            <strong>{game?.title ?? "Станция за облаками"}</strong>
          </span>
          <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  );
}
