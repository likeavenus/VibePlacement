import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";

const PendingContext = createContext<(delta: number) => void>(() => {});
export function RoutePending() {
  const pending = useContext(PendingContext);
  useLayoutEffect(() => {
    pending(1);
    return () => pending(-1);
  }, [pending]);
  return (
    <div className="page-skeleton" aria-label="Загрузка страницы">
      <div />
      <div />
      <div />
    </div>
  );
}
export function NavigationProgress({ children }: { children: ReactNode }) {
  const location = useLocation(),
    [active, setActive] = useState(true),
    [pending, setPending] = useState(0),
    [finishing, setFinishing] = useState(false);
  const started = useRef(performance.now()),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trackPending = useCallback(
    (delta: number) => setPending((count) => Math.max(0, count + delta)),
    [],
  );
  const begin = useCallback(() => {
    clearTimeout(timer.current);
    started.current = performance.now();
    setFinishing(false);
    setActive(true);
  }, []);
  useLayoutEffect(() => {
    begin();
  }, [location.key, begin]);
  useEffect(() => {
    if (!active || pending) return;
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        timer.current = setTimeout(
          () => {
            setFinishing(true);
            timer.current = setTimeout(() => {
              setActive(false);
              setFinishing(false);
            }, 180);
          },
          Math.max(0, 260 - (performance.now() - started.current)),
        );
      });
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      clearTimeout(timer.current);
    };
  }, [active, pending, location.key]);
  useEffect(() => {
    const onPop = () => flushSync(begin);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearTimeout(timer.current);
    };
  }, [begin]);
  return (
    <PendingContext.Provider value={trackPending}>
      <div
        onClickCapture={(event) => {
          if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          const anchor = (event.target as Element).closest("a[href]");
          if (
            !(anchor instanceof HTMLAnchorElement) ||
            anchor.target === "_blank" ||
            anchor.hasAttribute("download")
          )
            return;
          const url = new URL(anchor.href);
          const targetPath = import.meta.env.MODE === "github"
            ? url.hash.slice(1)
            : url.pathname + url.search + url.hash;
          if (
            url.origin === window.location.origin &&
            targetPath !== location.pathname + location.search + location.hash
          )
            flushSync(begin);
        }}
      >
        {active && (
          <div
            role="progressbar"
            aria-label="Загрузка страницы"
            className={`navigation-progress ${finishing ? "complete" : ""}`}
          >
            <div />
            <span className="sr-only">Загрузка страницы</span>
          </div>
        )}
        {children}
      </div>
    </PendingContext.Provider>
  );
}
