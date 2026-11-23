import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type UiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  options: UiSelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function UiSelect({ value, options, onChange, ariaLabel, className = "", disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    if (!open) return;
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${menuId}-${highlighted}`)?.scrollIntoView({ block: "nearest" });
  }, [menuId, open, highlighted]);

  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  function showMenu() {
    const index = options.findIndex((option) => option.value === value && !option.disabled);
    setHighlighted(index < 0 ? enabled[0] : index); setOpen(true);
  }

  return (
    <div ref={rootRef} className={`ui-select ${open ? "is-open" : ""} ${className}`.trim()} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-select-trigger"
        role="combobox"
        aria-controls={open ? menuId : undefined}
        aria-activedescendant={open ? `${menuId}-${highlighted}` : undefined}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || !enabled.length}
        onClick={() => open ? setOpen(false) : showMenu()}
        onKeyDown={(event) => {
          if (event.key === "Tab") { setOpen(false); return; }
          if (!open && !["ArrowDown", "ArrowUp"].includes(event.key)) return;
          if (!["Escape", "ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) return;
          event.preventDefault(); event.stopPropagation();
          if (!open) { showMenu(); return; }
          if (event.key === "Escape") { setOpen(false); return; }
          if (event.key === "Enter" || event.key === " ") { if (enabled.includes(highlighted)) onChange(options[highlighted].value); setOpen(false); return; }
          const step = event.key === "ArrowDown" ? 1 : -1;
          setHighlighted(event.key === "Home" ? enabled[0] : event.key === "End" ? enabled[enabled.length - 1] : enabled[(enabled.indexOf(highlighted) + step + enabled.length) % enabled.length]);
        }}
      >
        <span>{selected?.label ?? "Выберите"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="ui-select-menu" id={menuId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              id={`${menuId}-${index}`}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={`ui-select-option ${index === highlighted ? "is-highlighted" : ""}`}
              key={option.value}
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
