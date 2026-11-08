import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Map, Maximize2 } from "lucide-react";
import { Modal } from "../Modal";
import { demoStory, type Story } from "../../data/story";

export function StoryReader({ story }: { story: Story }) {
  const [index, setIndex] = useState(0),
    [map, setMap] = useState(false);
  const scene = story.scenes[Math.min(index, story.scenes.length - 1)];
  return (
    <div className="story-reader">
      <aside className="story-outline" aria-label="Сцены">
        <div className="story-outline-heading">
          <BookOpen size={18} /> Сцены <span>{story.scenes.length}</span>
        </div>
        {story.scenes.map((item, i) => (
          <button
            type="button"
            key={item.id}
            aria-current={i === index ? "step" : undefined}
            onClick={() => setIndex(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            {item.title}
          </button>
        ))}
        <button
          type="button"
          className="story-map-toggle"
          aria-pressed={map}
          onClick={() => setMap(!map)}
        >
          <Map size={17} /> Связи сцен
        </button>
      </aside>
      <div className="story-manuscript">
        {map ? (
          <div className="story-map">
            {story.scenes.map((item, i) => (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setMap(false);
                  }}
                >
                  {item.title}
                </button>
                <ArrowRight size={17} />
                <span>
                  {story.scenes.find((s) => s.id === item.next)?.title ??
                    "Финал"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <span className="story-location">
              {scene.location || "СЦЕНА " + (index + 1)}
            </span>
            <h2>{scene.title}</h2>
            {scene.action && <p className="story-action">{scene.action}</p>}
            {scene.dialogue && (
              <blockquote>
                <strong>{scene.speaker || "ГОЛОС"}</strong>
                <p>{scene.dialogue}</p>
              </blockquote>
            )}
            <footer>
              <button
                type="button"
                className="icon-btn"
                title="Предыдущая сцена"
                aria-label="Предыдущая сцена"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
              >
                <ArrowLeft size={18} />
              </button>
              <span>
                {index + 1} / {story.scenes.length}
              </span>
              <button
                type="button"
                className="icon-btn"
                title="Следующая сцена"
                aria-label="Следующая сцена"
                disabled={index === story.scenes.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                <ArrowRight size={18} />
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
export default function StoryViewer({ story = demoStory }: { story?: Story }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="story-cover">
      <div className="story-cover-meta">
        <BookOpen size={17} />
        <span>{story.genre || "Сценарий"}</span>
        <span>{story.scenes.length} сц.</span>
      </div>
      <h3>{story.scenes[0].title}</h3>
      <p>
        {story.logline || story.scenes[0].action || story.scenes[0].dialogue}
      </p>
      <button type="button" onClick={() => setOpen(true)}>
        <BookOpen size={17} /> Читать сценарий <Maximize2 size={16} />
      </button>
      {open && (
        <Modal title="Сценарий" wide onClose={() => setOpen(false)}>
          <StoryReader story={story} />
        </Modal>
      )}
    </div>
  );
}
