import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Check, X, ArrowRight, ArrowDown } from "lucide-react";
import type { Game } from "../../data/product";
import "./game-onboarding.css";

const steps = [
  { id: "genre", title: "Жанр игры", options: ["RPG / Action-RPG", "Platformer / Metroidvania", "Shooter / Action", "Strategy / RTS", "Visual Novel", "Survival / Horror", "Simulator / Puzzle", "+ Свой жанр"] },
  { id: "engine", title: "Движок", options: ["Godot", "Unity", "Unreal Engine", "Web / Three.js", "Пока выбираю"] },
  { id: "team", title: "С чего начать", options: ["Сначала оформить идею", "Художник", "Программист", "Сценарист", "Аниматор", "Композитор", "+ Свои роли"] },
  { id: "payment", title: "Формат участия", options: ["Оплата за работу", "Доля от выручки", "Комбинированный"] },
] as const;
type Answer = { value: string; option: number };
type Answers = Partial<Record<(typeof steps)[number]["id"], Answer[]>>;
type SurveyData = {
  label: string;
  mobile: boolean;
  heading?: boolean;
  number?: number;
  selected?: boolean;
  disabled?: boolean;
  custom?: boolean;
  placeholder?: string;
  choose?: (value: string) => void;
  multiple?: boolean;
  next?: () => void;
  remove?: () => void;
};
type SurveyFlowNode = Node<SurveyData>;

function SurveyNode({ data }: NodeProps<SurveyFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const input = data.mobile ? Position.Top : Position.Left;
  const output = data.mobile ? Position.Bottom : Position.Right;
  if (data.heading) return <div className="survey-heading" data-survey-step={data.number}>
    <Handle type="target" position={input} />
    <span className="survey-step">{data.selected ? <Check size={17} /> : data.number}</span>
    <strong>{data.label}{data.multiple && <small>Можно выбрать несколько</small>}</strong>
    {data.next && <button type="button" className="survey-next icon-btn nodrag nopan" title="К следующему этапу" aria-label="К следующему этапу" onClick={data.next}>{data.mobile ? <ArrowDown size={20} /> : <ArrowRight size={20} />}</button>}
  </div>;
  return <div className={`survey-answer ${data.selected ? "is-selected" : ""}`}>
    <Handle type="target" position={input} />
    {data.custom && editing && !data.disabled ? <form className="nodrag nopan" onSubmit={(event) => {
      event.preventDefault();
      if (value.trim()) { data.choose?.(value.trim()); setEditing(false); }
    }}>
      <input className="nodrag nopan" aria-label={data.placeholder} placeholder={data.placeholder} autoFocus maxLength={data.placeholder === "Название жанра" ? 36 : 240} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setEditing(false); } }} />
      <button type="submit" className="icon-btn" title="Подтвердить" aria-label="Подтвердить" disabled={!value.trim()}><Check size={18} /></button>
    </form> : <button type="button" className="survey-choice nodrag nopan" disabled={data.disabled} aria-pressed={!!data.selected} onClick={() => {
      if (data.disabled) return;
      if (data.custom) { if (data.selected) setValue(data.label); setEditing(true); }
      else data.choose?.(data.label);
    }}><span>{data.label}</span>{data.selected && <Check size={18} />}</button>}
    {data.custom && data.selected && !editing && <button type="button" className="survey-remove icon-btn nodrag nopan" aria-label={`Убрать: ${data.label}`} title="Убрать вариант" onClick={data.remove}><X size={16} /></button>}
    <Handle type="source" position={output} />
  </div>;
}
const nodeTypes = { survey: SurveyNode };

export function GameOnboarding({ onClose, onCreate }: { onClose: () => void; onCreate: (game: Game) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 700px)").matches);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(max-width: 700px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    return () => { media.removeEventListener("change", change); dialog.current?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const revealStep = useCallback((index: number) => {
    const heading = scroll.current?.querySelector<HTMLElement>(`[data-survey-step="${index + 1}"]`);
    if (!heading || !scroll.current || !body.current) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    const headingRect = heading.getBoundingClientRect();
    const bodyRect = body.current.getBoundingClientRect();
    if (mobile || headingRect.top < bodyRect.top || headingRect.bottom > bodyRect.bottom) {
      body.current.scrollTo({ top: body.current.scrollTop + headingRect.top - bodyRect.top - 12, behavior });
    }
    if (!mobile) {
      const scrollRect = scroll.current.getBoundingClientRect();
      if (headingRect.left < scrollRect.left + 16 || headingRect.right > scrollRect.left + scroll.current.clientWidth - 16) {
        scroll.current.scrollTo({ left: scroll.current.scrollLeft + headingRect.left - scrollRect.left - (scroll.current.clientWidth - headingRect.width) / 2, behavior });
      }
    }
  }, [mobile]);
  const nodes = useMemo<SurveyFlowNode[]>(() => steps.flatMap((step, index) => {
    const answer = answers[step.id] ?? [];
    const multiple = step.id === "genre" || step.id === "team";
    const locked = steps.slice(0, index).some((previous) => !answers[previous.id]?.length);
    const position = { x: mobile ? 8 : 16 + index * 344, y: mobile ? 12 + steps.slice(0, index).reduce((sum, item) => sum + 100 + item.options.length * 72, 0) : 12 };
    const heading: SurveyFlowNode = {
      id: step.id, type: "survey", position, style: { width: 264, pointerEvents: "auto" },
      data: { label: step.title, mobile, heading: true, selected: !!answer.length, number: index + 1, multiple, next: multiple && answer.length ? () => revealStep(index + 1) : undefined },
    };
    return [heading, ...step.options.map((option, optionIndex): SurveyFlowNode => {
      const selectedAnswer = answer.find((item) => item.option === optionIndex);
      const selected = !!selectedAnswer;
      const custom = multiple && optionIndex === step.options.length - 1;
      const disabled = locked;
      return {
        id: `${step.id}-${optionIndex}`, type: "survey", position: { x: position.x, y: position.y + 60 + optionIndex * 72 },
        // Static React Flow nodes otherwise disable pointer events, including child buttons.
        style: { width: 264, pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.4 : 1 },
        data: { label: selectedAnswer?.value ?? option, mobile, selected, disabled, multiple, custom, placeholder: step.id === "team" ? "Роли через запятую" : "Название жанра", remove: () => setAnswers((old) => ({ ...old, [step.id]: (old[step.id] ?? []).filter((item) => item.option !== optionIndex) })), choose: (value) => {
          setAnswers((old) => {
            const previous = old[step.id] ?? [];
            let next = [{ value, option: optionIndex }];
            if (multiple && !(step.id === "team" && optionIndex === 0)) {
              next = previous.filter((item) => item.option !== optionIndex && !(step.id === "team" && item.option === 0));
              if (custom || !previous.some((item) => item.option === optionIndex)) next.push({ value, option: optionIndex });
            }
            return { ...old, [step.id]: next };
          });
          const nextStep = steps[index + 1];
          if (!multiple && nextStep && !answers[nextStep.id]?.length) revealStep(index + 1);
        } },
      };
    })];
  }), [answers, mobile, revealStep]);
  const edges: Edge[] = steps.slice(0, -1).flatMap((step, index) => {
    const selected = answers[step.id] ?? [];
    const nextSelected = answers[steps[index + 1].id] ?? [];
    // Fan in/out instead of drawing every possible pair of selected answers.
    const pairs = selected.length && nextSelected.length ? [...selected.map((answer) => [answer, nextSelected[0]] as const), ...nextSelected.slice(1).map((answer) => [selected[0], answer] as const)] : [];
    return pairs.map(([answer, nextAnswer]) => ({
      id: `${step.id}-${answer.option}-${steps[index + 1].id}-${nextAnswer.option}`,
      source: `${step.id}-${answer.option}`,
      target: `${steps[index + 1].id}-${nextAnswer.option}`,
      type: "smoothstep",
      animated: true,
      className: "gf-active-edge",
    }));
  });
  const completed = steps.filter((step) => answers[step.id]?.length).length;
  const pendingStep = steps.findIndex((step) => !answers[step.id]?.length);
  const ready = title.trim() && description.trim() && completed === steps.length;
  function create() {
    if (!ready || !answers.genre?.length || !answers.engine?.length) return;
    const savedAnswers = Object.fromEntries(Object.entries(answers).map(([key, answer]) => [key, answer.map((item) => item.value).join(", ")]));
    const roles = [...new Set((answers.team ?? []).filter((item) => item.option !== 0).flatMap((item) => item.value.split(/[,;\n]/)).map((role) => role.trim().slice(0, 80)).filter(Boolean))].slice(0, 30);
    const genres = answers.genre.map((item) => item.value);
    onCreate({ id: crypto.randomUUID(), title: title.trim(), description: description.trim(), genre: genres.join(", "), genres, engine: answers.engine[0].value, budget: 0, payment: answers.payment?.[0]?.option === 2 ? "mixed" : answers.payment?.[0]?.option === 1 ? "revshare" : "fixed", team: roles.map((role) => ({ id: crypto.randomUUID(), role, assignee: "" })), tasks: [], documents: [], graph: {
      phase: "editor", answers: savedAnswers, nodes: [{ id: "root", type: "root", title: title.trim(), description: description.trim(), position: { x: 0, y: 0 } }], edges: [], hiddenTaskIds: [],
    } });
  }
  return <dialog ref={dialog} className="survey-dialog" aria-labelledby="survey-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="survey-header"><h2 id="survey-title">Новая игра</h2><button className="icon-btn" type="button" aria-label="Закрыть" onClick={onClose}><X size={20} /></button></header>
    <div className="survey-body" ref={body}>
      <div className="survey-basics">
        <label>Название<input autoFocus aria-label="Название игры" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название игры" maxLength={80} /></label>
        <label className="survey-description">Идея<textarea aria-label="Идея игры" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="О чём игра" maxLength={600} rows={2} /></label>
      </div>
      <div className={`survey-scroll ${mobile ? "is-mobile" : ""}`} ref={scroll}>
        <div className="survey-canvas" style={{ width: mobile ? 280 : 32 + (steps.length - 1) * 344 + 264, height: mobile ? steps.reduce((sum, step) => sum + 100 + step.options.length * 72, 24) : 652 }}>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} nodesFocusable={false} edgesFocusable={false} panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} preventScrolling={false} defaultViewport={{ x: 0, y: 0, zoom: 1 }} minZoom={1} maxZoom={1}>
            <Background color="var(--ui-onboarding-dots)" gap={24} />
          </ReactFlow>
        </div>
      </div>
    </div>
    <footer className="survey-footer"><span role="status" aria-live="polite">{completed === steps.length ? "Все ответы выбраны" : `Шаг ${pendingStep + 1} из ${steps.length}: ${steps[pendingStep].title.toLowerCase()}`}</span><button className="primary-btn" type="button" disabled={!ready} onClick={create}>Создать игру</button></footer>
  </dialog>;
}
