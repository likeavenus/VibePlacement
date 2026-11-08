import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { newScene, type Story, type Scene } from "../../data/story";

export function StoryEditor({
  value,
  onChange,
}: {
  value: Story;
  onChange: (story: Story) => void;
}) {
  const update = (id: string, patch: Partial<Scene>) =>
    onChange({
      ...value,
      scenes: value.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  const move = (index: number, delta: number) => {
    const scenes = [...value.scenes];
    [scenes[index], scenes[index + delta]] = [
      scenes[index + delta],
      scenes[index],
    ];
    onChange({ ...value, scenes });
  };
  return (
    <section className="story-editor" aria-label="Редактор сцен">
      <div className="story-editor-meta">
        <label>
          Логлайн
          <textarea
            aria-label="Логлайн"
            maxLength={500}
            rows={2}
            value={value.logline}
            onChange={(e) => onChange({ ...value, logline: e.target.value })}
          />
        </label>
        <label>
          Жанр
          <input
            aria-label="Жанр сценария"
            maxLength={80}
            value={value.genre}
            onChange={(e) => onChange({ ...value, genre: e.target.value })}
          />
        </label>
      </div>
      {value.scenes.map((scene, index) => (
        <fieldset key={scene.id} className="scene-editor">
          <legend>Сцена {index + 1}</legend>
          <div className="scene-tools">
            <button
              type="button"
              className="icon-btn"
              aria-label={`Поднять сцену ${index + 1}`}
              title="Выше"
              disabled={!index}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={17} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Опустить сцену ${index + 1}`}
              title="Ниже"
              disabled={index === value.scenes.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={17} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Удалить сцену"
              aria-label={`Удалить сцену ${index + 1}`}
              disabled={value.scenes.length === 1}
              onClick={() =>
                onChange({
                  ...value,
                  scenes: value.scenes
                    .filter((s) => s.id !== scene.id)
                    .map((s) => (s.next === scene.id ? { ...s, next: "" } : s)),
                })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
          <label>
            Название сцены
            <input
              required
              maxLength={120}
              aria-label="Название сцены"
              value={scene.title}
              onChange={(e) => update(scene.id, { title: e.target.value })}
            />
          </label>
          <label>
            Место и время
            <input
              maxLength={160}
              aria-label="Место и время"
              placeholder="ИНТ. ЗАЛ ОЖИДАНИЯ · ВЕЧЕР"
              value={scene.location}
              onChange={(e) => update(scene.id, { location: e.target.value })}
            />
          </label>
          <label>
            Действие
            <textarea
              rows={4}
              aria-label="Действие"
              maxLength={12000}
              value={scene.action}
              onChange={(e) => update(scene.id, { action: e.target.value })}
            />
          </label>
          <label>
            Персонаж
            <input
              maxLength={80}
              value={scene.speaker}
              aria-label="Персонаж"
              onChange={(e) => update(scene.id, { speaker: e.target.value })}
            />
          </label>
          <label>
            Реплика
            <textarea
              rows={3}
              aria-label="Реплика"
              maxLength={12000}
              value={scene.dialogue}
              onChange={(e) => update(scene.id, { dialogue: e.target.value })}
            />
          </label>
          <label>
            Переход
            <select
              value={scene.next}
              aria-label="Переход"
              onChange={(e) => update(scene.id, { next: e.target.value })}
            >
              <option value="">Финал / без перехода</option>
              {value.scenes
                .filter((s) => s.id !== scene.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
            </select>
          </label>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary-btn"
        disabled={value.scenes.length >= 30}
        onClick={() =>
          onChange({ ...value, scenes: [...value.scenes, newScene()] })
        }
      >
        <Plus size={17} /> Добавить сцену
      </button>
    </section>
  );
}
