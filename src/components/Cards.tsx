import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import type { Creator, Project, Work } from "../data/types";
import { money } from "../data/mock";
import { useStore } from "../app/store";
import { Viewer } from "./viewers/Viewer";
import { Modal } from "./Modal";
import { WorkDetail } from "../features/studio/WorkDetail";
import { t } from "../i18n";
import { genres, stages, projectMeta } from "../data/projects";
export function Avatar({
  creator,
  large = false,
}: {
  creator: Creator;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      style={{ backgroundColor: creator.color }}
      aria-hidden="true"
    >
      {creator.avatar ? <img src={creator.avatar} alt="" /> : <UserRound size={large ? 34 : 17} strokeWidth={1.5} />}
    </span>
  );
}
export function WorkCard({ work }: { work: Work }) {
  const store = useStore(),
    creator = store.creatorById(work.creatorId);
  const [details, setDetails] = useState(false);
  const saved = store.favorites.includes(work.id),
    requested = store.applications.includes("work:" + work.id);
  return (
    <article className="work-card" data-work={work.id}>
      <Viewer kind={work.viewer} assetId={work.assetId} />
      <div className="card-body">
        <div className="card-eyebrow">
          <span className={`label-${work.color}`}>{t(work.category)}</span>
          <button
            className={`save-btn ${saved ? "saved" : ""}`}
            aria-label={
              saved
                ? `Убрать из избранного: ${work.title}`
                : `В избранное: ${work.title}`
            }
            aria-pressed={saved}
            onClick={() => store.toggleFavorite(work.id)}
            title="Избранное"
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <button className="card-title" onClick={() => setDetails(true)}>
          {work.title}
        </button>
        <div className="tags">
          {work.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="creator-line">
          <Link to={`/profile/${creator.id}`}>
            <Avatar creator={creator} />
            <span>{creator.name}</span>
          </Link>
          <span
            className="rating"
            title={`${creator.completed} закрытых проектов`}
          >
            <Star size={12} fill="currentColor" />
            {creator.rating.toFixed(1)} <small>({creator.completed})</small>
          </span>
        </div>
        <div className="card-footer">
          <span>
            {work.saleType === "showcase" ? (
              "Портфолио"
            ) : (
              <>
                {work.saleType === "asset" ? "" : "от "}
                <strong>{money(work.price)}</strong>
              </>
            )}
          </span>
          <button
            className="text-action"
            aria-label={`Подробнее: ${work.title}`}
            onClick={() => setDetails(true)}
          >
            Подробнее <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      {details && <WorkDetail work={work} onClose={() => setDetails(false)} />}
    </article>
  );
}
export function ProjectCard({ project }: { project: Project }) {
  const store = useStore();
  const meta = projectMeta(project);
  return (
    <article className="project-card">
      <Link
        to={`/projects/${project.id}`}
        className="project-art"
        aria-label={`О проекте: ${project.title}`}
      >
        <span className="project-art-placeholder" aria-hidden="true"><ImageIcon size={34} strokeWidth={1.4} /></span>
        <span className="project-type">{genres[meta.genre]}</span>
      </Link>
      <div className="card-body">
        <div className="project-top">
          <span className="label-mint">{stages[meta.stage]}</span>
          <span>
            <Users size={16} /> {project.members} / {project.slots}
          </span>
        </div>
        <Link className="card-title" to={`/projects/${project.id}`}>
          {project.title}
        </Link>
        <p className="project-description">{project.description}</p>
        <div className="tags">
          <span>{meta.engine}</span>
          <span>{meta.platform}</span>
        </div>
        <div className="project-openings">
          <strong>{project.roles.length ? "Кого ищем" : "Набор закрыт"}</strong>
          {project.roles.map((role) => {
            const offer = project.roleOffers?.find((item) => item.role === role);
            return <Link key={role} to={`/projects/${project.id}?role=${encodeURIComponent(role)}`}><span>{role}</span>{offer && <small>{money(offer.amount)}</small>}<ArrowUpRight size={16} /></Link>;
          })}
        </div>
        {!!project.filledRoles?.length && <div className="project-card-members">{project.filledRoles.map((slot) => {
          const member = store.creatorList.find((item) => item.id === slot.assignee);
          return member ? <Link key={`${slot.role}-${slot.assignee}`} to={`/profile/${member.id}`} title={`${slot.role}: ${member.name}`}><Avatar creator={member} /><span>{member.name}</span></Link> : null;
        })}</div>}
        <div className="card-footer">
          <strong>{project.payment === "mixed" ? "Комбинированный формат" : project.payment === "revshare" ? "Доля от выручки" : "Оплата по задачам"}</strong>
          <Link className="text-action" to={`/projects/${project.id}`}>
            Об игре <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Link to={`/profile/${creator.id}`} className="creator-card">
      <Avatar creator={creator} large />
      <div className="creator-card-title">
        <h2>{creator.name}</h2>
        <CheckCircle2 size={16} />
      </div>
      <p>{creator.role}</p>
      <div className="tags">
        {creator.skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <div className="creator-card-stats">
        <span>
          <Star size={15} /> {creator.rating.toFixed(1)}
        </span>
        <span>{creator.completed} закрытых проектов</span>
        <ArrowUpRight size={18} />
      </div>
    </Link>
  );
}
