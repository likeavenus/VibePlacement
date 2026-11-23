import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Gamepad2,
  Palette,
  X,
} from "lucide-react";

const key = "vibeplacement:guide-v1";
export function guideSeen() {
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return false;
  }
}
type Role = "maker" | "creator";
export function Guide({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0),
    [role, setRole] = useState<Role>("maker");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const finish = () => {
    try {
      localStorage.setItem(key, "done");
    } catch {
      /* The guide still closes when storage is unavailable. */
    }
    closeRef.current();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingBottom;
    document.body.style.overflow = "hidden";
    document.body.style.paddingBottom = `${window.innerHeight}px`;
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finishRef.current();
      }
      if (event.key !== "Tab") return;
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      );
      if (!buttons?.length) return;
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingBottom = previousPadding;
      window.removeEventListener("keydown", trap);
      requestAnimationFrame(() =>
        previousFocus.current?.focus({ preventScroll: true }),
      );
    };
  }, []);
  const target =
    step === 0
      ? null
      : role === "maker"
        ? step === 1
          ? "make"
          : "people"
        : step === 1
          ? "join"
          : "profile";
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    if (!target) {
      setRect(null);
      return;
    }
    navigate("/", { replace: true });
    let frame = 0,
      attempts = 0;
    const measure = () => {
      const element = document.querySelector<HTMLElement>(
        `[data-guide="${target}"]`,
      );
      if (!element) {
        if (attempts++ < 120) frame = requestAnimationFrame(measure);
        return;
      }
      const bounds = element.getBoundingClientRect();
      const panelTop =
        window.innerHeight - (panel.current?.offsetHeight ?? 350) - 28;
      if (bounds.bottom > panelTop - 24 || bounds.top < 85)
        window.scrollTo({
          top: window.scrollY + bounds.top - 110,
          behavior: "instant",
        });
      setRect(element.getBoundingClientRect());
    };
    const update = () => {
      const element = document.querySelector(`[data-guide="${target}"]`);
      if (element) setRect(element.getBoundingClientRect());
    };
    frame = requestAnimationFrame(measure);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target, navigate]);
  const title =
    step === 0
      ? "Игроцех"
      : role === "maker"
        ? step === 1
          ? "Начни с идеи игры"
          : "Найди участников"
        : step === 1
          ? "Найди проект"
          : "Оформи свой профиль";
  const description =
    step === 0
      ? "Создавай игру, находи креаторов, публикуй работы."
      : role === "maker"
        ? step === 1
          ? "Добавь идею, затем запланируй задачи и найди команду."
          : "Выбирай специалистов по навыкам, портфолио и доступности."
        : step === 1
          ? "Выбери игру по жанру и открытой роли."
          : "Добавь работы и навыки, чтобы авторы игр могли оценить твой опыт.";
  return (
    <div className={`guide-layer ${rect ? "has-target" : ""}`}>
      <div className="guide-shade" />
      {rect && (
        <div
          className="guide-spotlight"
          data-testid="guide-spotlight"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <div
        className="guide-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        aria-describedby="guide-description"
        tabIndex={-1}
        ref={panel}
      >
        <div className="guide-top">
          <span>Шаг {step + 1} из 3</span>
          <button
            className="icon-btn"
            aria-label="Закрыть гайд"
            onClick={finish}
          >
            <X size={20} />
          </button>
        </div>
        <div className="guide-progress" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i key={i} className={step >= i ? "active" : ""} />
          ))}
        </div>
        <div key={`${role}-${step}`} className="guide-slide">
          <h2 id="guide-title">{title}</h2>
          <p id="guide-description">{description}</p>
          {step === 0 && (
            <div
              className="guide-roles"
              role="group"
              aria-label="С чего начать"
            >
              <button
                aria-pressed={role === "maker"}
                onClick={() => setRole("maker")}
              >
                <Gamepad2 size={22} />
                <span>Создаю игру</span>
                {role === "maker" && <Check size={16} />}
              </button>
              <button
                aria-pressed={role === "creator"}
                onClick={() => setRole("creator")}
              >
                <Palette size={22} />
                <span>Я креатор</span>
                {role === "creator" && <Check size={16} />}
              </button>
            </div>
          )}
        </div>
        <div className="guide-actions">
          {step === 0 ? (
            <button className="text-action" onClick={finish}>
              Пропустить
            </button>
          ) : (
            <button
              className="icon-btn"
              title="Предыдущий шаг"
              aria-label="Назад"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          {step < 2 ? (
            <button className="primary-btn" onClick={() => setStep(step + 1)}>
              Дальше
              <ArrowRight size={17} />
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={() => {
                finish();
                if (role === "maker") navigate("/games?new=1");
                else navigate("/discover");
              }}
            >
              {role === "maker" ? "Создать игру" : "Найти проект"}
              <ArrowRight size={17} />
            </button>
          )}
        </div>
        {step === 2 && (
          <button className="guide-explore text-action" onClick={finish}>
            Сначала осмотрюсь
          </button>
        )}
      </div>
    </div>
  );
}
