import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  MapPin,
  Star,
} from "lucide-react";
import {
  Avatar,
  CreatorCard,
  WorkCard,
  ProjectCard,
} from "../../components/Cards";
import { creators, works } from "../../data/mock";
import { PixelScene } from "../../components/viewers/PixelScene";
import { useStore } from "../../app/store";
import { Modal } from "../../components/Modal";
export function Profile() {
  const { id } = useParams(),
    store = useStore();
  const creator = creators.find((item) => item.id === id);
  const [tab, setTab] = useState("works"),
    [contact, setContact] = useState(false);
  if (!creator)
    return (
      <div className="empty-state">
        <h1>Профиль не найден</h1>
        <Link className="secondary-btn" to="/creators">
          К креаторам
        </Link>
      </div>
    );
  const portfolio = store.workList.filter((work) => work.creatorId === id),
    projects = store.projectList.filter((project) => project.creatorId === id);
  return (
    <>
      <Link to="/creators" className="back-link">
        <ArrowLeft size={15} />
        Все креаторы
      </Link>
      <div className="profile-cover">
        <PixelScene />
        <div className="cover-word">MAKE SOMETHING REAL.</div>
        <span>@{creator.handle}</span>
      </div>
      <section className="profile-header">
        <Avatar creator={creator} large />
        <div className="profile-name">
          <span className="availability">
            <i />
            Открыт к предложениям
          </span>
          <h1>
            {creator.name}
            <CheckCircle2 size={23} />
          </h1>
          <p>{creator.role}</p>
        </div>
        <div className="profile-actions">
          <button
            className="secondary-btn icon-only"
            title="Скопировать ссылку на профиль"
            aria-label="Скопировать ссылку на профиль"
            onClick={() =>
              navigator.clipboard
                .writeText(window.location.href)
                .then(() => store.setToast("Ссылка скопирована"))
                .catch(() => store.setToast("Не удалось скопировать ссылку"))
            }
          >
            <Copy size={17} />
          </button>
          <button className="primary-btn" onClick={() => setContact(true)}>
            Предложить проект
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>
      <div className="profile-info">
        <div>
          <p>{creator.bio}</p>
          <div className="tags">
            {creator.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
          <span className="profile-location">
            <MapPin size={14} />
            Удалённо · RU
          </span>
        </div>
        <div className="profile-stats">
          <div>
            <strong>
              <Star size={20} />
              {creator.rating.toFixed(1)}
            </strong>
            <span>рейтинг по сделкам</span>
          </div>
          <div>
            <strong>{creator.completed}</strong>
            <span>закрытых проектов</span>
          </div>
        </div>
      </div>
      <div className="profile-tabs" role="tablist" aria-label="Работы профиля">
        <button
          role="tab"
          aria-selected={tab === "works"}
          className={tab === "works" ? "active" : ""}
          onClick={() => setTab("works")}
        >
          Портфолио<span>{portfolio.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "projects"}
          className={tab === "projects" ? "active" : ""}
          onClick={() => setTab("projects")}
        >
          Проекты<span>{projects.length}</span>
        </button>
      </div>
      <div className="work-grid profile-grid">
        {tab === "works"
          ? portfolio.map((work) => <WorkCard key={work.id} work={work} />)
          : projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
      </div>
      {tab === "projects" && !projects.length && (
        <div className="empty-state">
          <h2>Открытых проектов пока нет</h2>
        </div>
      )}
      {contact && (
        <Modal
          title={`Проект для ${creator.name}`}
          onClose={() => setContact(false)}
        >
          <form
            className="project-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              store.apply(
                `contact:${creator.id}:${String(form.get("message")).trim()}`,
              );
              store.setToast("Предложение сохранено локально");
              setContact(false);
            }}
          >
            <label>
              Ваше предложение
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={1000}
                rows={5}
                placeholder="Задача, сроки и бюджет"
              />
            </label>
            <button type="submit" className="primary-btn">
              Сохранить предложение
              <ArrowUpRight size={16} />
            </button>
            <p className="form-note">
              Демо: предложение сохранится в этом браузере, без отправки автору.
            </p>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Creators() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ЛЮДИ ЗА ИДЕЯМИ</div>
          <h1>
            Креаторы<span className="heading-dot">.</span>
          </h1>
          <p>Разные навыки. Общий интерес к новому.</p>
        </div>
      </div>
      <div className="work-grid creators-grid">
        {creators.map((creator) => (
          <CreatorCard key={creator.id} creator={creator} />
        ))}
      </div>
    </>
  );
}
