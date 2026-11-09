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
  onPublish,
}: {
  onClose: () => void;
  onPublish: () => void;
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
          : "assets"
        : step === 1
          ? "publish"
          : "join";
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
      ? "От идеи до своей игры"
      : role === "maker"
        ? step === 1
          ? "Начни с идеи игры"
          : "Не всё нужно делать с нуля"
        : step === 1
          ? "Покажи, что создаёшь"
          : "Найди свою команду";
  const description =
    step === 0
      ? "Здесь встречаются авторы игр и креаторы. Выбери, с чего хочешь начать. Оба пути всегда доступны."
      : role === "maker"
        ? step === 1
          ? "Добавь название и идею. Внутри игры — задачи, бюджет и набор людей на нужные роли."
          : "В каталоге — ассеты и услуги. Смотри работы прямо в браузере и подбирай их под задачи игры."
        : step === 1
          ? "Выбери направление, добавь файлы и укажи формат: портфолио, услуга или ассет на продажу."
          : "Отфильтруй игры по жанру и своей роли. На странице проекта — идея, условия и отклик.";
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
          <span>Быстрый старт · {step + 1} / 3</span>
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
                else {
                  navigate("/");
                  onPublish();
                }
              }}
            >
              {role === "maker" ? "Создать игру" : "Опубликовать работу"}
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
