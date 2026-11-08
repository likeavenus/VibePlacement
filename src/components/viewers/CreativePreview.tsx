import { useState } from "react";
import {
  ArrowUpRight,
  Compass,
  Map,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
export function DesignPreview() {
  const [tab, setTab] = useState("quests");
  return (
    <div className="design-preview">
      <div className="design-preview-top">
        <Compass size={20} />
        <strong>Острова памяти</strong>
        <span>UI / 02</span>
      </div>
      <div className="design-preview-tabs">
        <button
          type="button"
          aria-pressed={tab === "quests"}
          onClick={() => setTab("quests")}
        >
          Задания
        </button>
        <button
          type="button"
          aria-pressed={tab === "map"}
          onClick={() => setTab("map")}
        >
          Карта
        </button>
      </div>
      {tab === "quests" ? (
        <div className="design-quest">
          <span>ГЛАВА 01</span>
          <strong>Письмо на рассвете</strong>
          <p>Найти смотрителя станции</p>
          <div>
            <i />
            <span>1 / 3</span>
            <ArrowUpRight size={20} />
          </div>
        </div>
      ) : (
        <div className="design-map">
          <Map size={42} />
          <strong>Северный остров</strong>
          <span>Станция · открыта</span>
        </div>
      )}
    </div>
  );
}
export function MotionPreview() {
  const [playing, setPlaying] = useState(true);
  return (
    <div className={`motion-preview ${playing ? "" : "paused"}`}>
      <div className="motion-stripes" />
      <span className="motion-caption">TITLE SEQUENCE / 01</span>
      <div className="motion-title">
        <Sparkles size={30} />
        <strong>
          НОВЫЙ
          <br />
          МИР
        </strong>
        <span>ПЕРВАЯ ГЛАВА</span>
      </div>
      <button
        type="button"
        className="icon-btn"
        title={playing ? "Пауза" : "Воспроизвести"}
        aria-label={playing ? "Приостановить моушн" : "Воспроизвести моушн"}
        onClick={() => setPlaying(!playing)}
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}
