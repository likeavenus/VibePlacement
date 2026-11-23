import {
  ArrowRight,
  Gamepad2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

export function Start() {
  return (
    <div className="start-page">
      <div className="page-heading">
        <div>
          <span className="start-beta">Открытая бета</span>
          <h1>С чего начнём?</h1>
        </div>
      </div>
      <div className="start-paths">
        <section className="start-path">
          <Gamepad2 className="path-icon" size={30} />
          <h2>Я делаю игру</h2>
          <Link data-guide="make" className="primary-btn" to="/games?new=1">
            <Plus size={18} />
            Создать игру
          </Link>
          <Link data-guide="people" className="path-link" to="/creators">
            <Search size={18} />
            <span>Найти креаторов</span>
            <ArrowRight size={18} />
          </Link>
        </section>
        <section className="start-path">
          <Users className="path-icon" size={30} />
          <h2>Я ищу команду</h2>
          <Link
            data-guide="join"
            className="secondary-btn"
            to="/discover"
          >
            <Search size={18} />
            Найти проект
          </Link>
          <Link data-guide="profile" className="path-link" to="/profile/denis">
            <Users size={18} />
            <span>Мой профиль и работы</span>
            <ArrowRight size={18} />
          </Link>
        </section>
      </div>
    </div>
  );
}
