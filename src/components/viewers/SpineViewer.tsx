import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import {
  Spine,
  SkinsAndAnimationBoundsProvider,
  SpineDebugRenderer,
} from "@esotericsoftware/spine-pixi-v8";
import {
  Bone,
  Expand,
  LoaderCircle,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
} from "lucide-react";
import { loadSpineAsset } from "./spineAssets";
import type { AssetBundle } from "../../data/assets";
import { Modal } from "../Modal";
interface Props {
  assetId?: string;
  draft?: AssetBundle;
  active?: boolean;
  expanded?: boolean;
  onReady?: (ready: boolean) => void;
}
export default function SpineViewer({
  assetId,
  draft,
  active = true,
  expanded = false,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    instance = useRef<{
      app: Application;
      spine: Spine;
      fit: () => void;
    } | null>(null);
  const [animations, setAnimations] = useState<string[]>([]),
    [animation, setAnimation] = useState(""),
    [skins, setSkins] = useState<string[]>([]),
    [skin, setSkin] = useState(""),
    [playing, setPlaying] = useState(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [loop, setLoop] = useState(true),
    [speed, setSpeed] = useState(1),
    [zoom, setZoom] = useState(1),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(1),
    [bones, setBones] = useState(false),
    [background, setBackground] = useState("#232b32"),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const controls = useRef({ playing, loop, speed, active });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  controls.current = { playing, loop, speed, active: active && !open };
  const readyCallback = useRef(onReady);
  readyCallback.current = onReady;
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false,
      app: Application | undefined,
      initialized = false,
      cleanupAsset: (() => void) | undefined,
      observer: ResizeObserver | undefined;
    setError("");
    setAnimations([]);
    readyCallback.current?.(false);
    const cleanup = () => {
      observer?.disconnect();
      if (initialized) {
        app?.destroy(true, { children: true });
        initialized = false;
      }
      cleanupAsset?.();
      cleanupAsset = undefined;
    };
    (async () => {
      const asset = await loadSpineAsset(assetId, draft);
      cleanupAsset = asset.dispose;
      if (cancelled) {
        cleanup();
        return;
      }
      app = new Application();
      await app.init({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        preference: "webgl",
        preserveDrawingBuffer: true,
      });
      initialized = true;
      if (cancelled) {
        cleanup();
        return;
      }
      node.appendChild(app.canvas);
      app.canvas.setAttribute("aria-label", "Скелетная анимация персонажа");
      const first =
        asset.skeletonData.animations.find((a) => a.name === "walk")?.name ??
        asset.skeletonData.animations[0]?.name;
      if (!first) throw new Error("В персонаже нет анимаций.");
      const spine = new Spine({
        skeletonData: asset.skeletonData,
        autoUpdate: false,
        boundsProvider: new SkinsAndAnimationBoundsProvider(first, [], 0.1),
      });
      app.stage.addChild(spine);
      spine.state.setAnimation(0, first, true);
      spine.update(0);
      const fit = () => {
        if (!app || cancelled) return;
        app.renderer.resize(node.clientWidth, node.clientHeight);
        const bounds = spine.boundsProvider!.calculateBounds(spine);
        const scale =
          zoomRef.current *
          Math.min(
            node.clientWidth / (bounds.width * 1.25),
            node.clientHeight / (bounds.height * 1.18),
          );
        spine.scale.set(scale);
        spine.position.set(
          node.clientWidth / 2 - (bounds.x + bounds.width / 2) * scale,
          node.clientHeight / 2 - (bounds.y + bounds.height / 2) * scale,
        );
      };
      fit();
      observer = new ResizeObserver(fit);
      observer.observe(node);
      instance.current = { app, spine, fit };
      setAnimations(asset.skeletonData.animations.map((a) => a.name));
      setAnimation(first);
      setSkins(asset.skeletonData.skins.map((s) => s.name));
      setSkin(
        asset.skeletonData.defaultSkin?.name ??
          asset.skeletonData.skins[0]?.name ??
          "",
      );
      setDuration(asset.skeletonData.findAnimation(first)!.duration);
      setTime(0);
      setZoom(1);
      readyCallback.current?.(true);
      let elapsed = 0;
      app.ticker.add((ticker) => {
        if (cancelled || !controls.current.active) return;
        const entry = spine.state.getCurrent(0);
        if (controls.current.playing) {
          spine.update(
            Math.min(ticker.deltaMS / 1000, 0.05) * controls.current.speed,
          );
          if (entry && !entry.loop && entry.trackTime >= entry.animationEnd)
            setPlaying(false);
        }
        elapsed += ticker.deltaMS;
        if (elapsed > 80 && entry) {
          setTime(entry.getAnimationTime());
          elapsed = 0;
        }
      });
    })().catch((err) => {
      cleanup();
      if (!cancelled) {
        setError(
          err instanceof Error ? err.message : "Не удалось открыть персонажа.",
        );
        readyCallback.current?.(false);
      }
    });
    return () => {
      cancelled = true;
      instance.current = null;
      cleanup();
    };
  }, [assetId, draft]);
  useEffect(() => {
    const current = instance.current;
    if (!current || !animation) return;
    const { spine } = current;
    spine.skeleton.setToSetupPose();
    spine.state.clearTracks();
    spine.state.setAnimation(0, animation, loop);
    spine.update(0);
    spine.boundsProvider = new SkinsAndAnimationBoundsProvider(
      animation,
      skin ? [skin] : [],
      0.1,
    );
    current.fit();
    setZoom(1);
    setTime(0);
    setDuration(spine.skeleton.data.findAnimation(animation)?.duration ?? 1);
  }, [animation, loop]);
  useEffect(() => {
    const current = instance.current;
    if (!current || !skin) return;
    current.spine.skeleton.setSkinByName(skin);
    current.spine.skeleton.setSlotsToSetupPose();
    current.spine.update(0);
    current.spine.boundsProvider = new SkinsAndAnimationBoundsProvider(
      animation,
      [skin],
      0.1,
    );
    current.fit();
    setZoom(1);
  }, [skin]);
  useEffect(() => {
    const current = instance.current;
    if (!current) return;
    current.fit();
  }, [zoom]);
  useEffect(() => {
    if (instance.current) {
      instance.current.spine.debug = bones
        ? new SpineDebugRenderer()
        : undefined;
      instance.current.spine.update(0);
    }
  }, [bones]);
  const seek = (value: number) => {
    const current = instance.current;
    if (!current) return;
    const entry = current.spine.state.getCurrent(0);
    if (entry) {
      entry.trackTime = value;
      current.spine.update(0);
      setTime(value);
      setPlaying(false);
    }
  };
  return (
    <div
      className={`spine-viewer ${expanded ? "spine-expanded" : ""}`}
      style={{ backgroundColor: background }}
    >
      <div className="spine-stage" ref={host} />
      {!animations.length && !error && (
        <div className="spine-loading">
          <LoaderCircle className="spin" size={22} />
        </div>
      )}
      {error && (
        <div className="spine-error" role="alert">
          {error}
        </div>
      )}
      <span className="spine-badge">
        <Bone size={12} /> SPINE 4.2
      </span>
      {!expanded && (
        <button
          type="button"
          className="icon-btn spine-expand"
          title="Открыть анимации"
          aria-label="Открыть анимации"
          onClick={() => setOpen(true)}
        >
          <Expand size={15} />
        </button>
      )}
      <div className="spine-controls">
        <div className="spine-primary-controls">
          <button
            type="button"
            className="icon-btn"
            disabled={!animations.length}
            title={playing ? "Пауза" : "Воспроизвести"}
            aria-label={
              playing ? "Приостановить анимацию" : "Воспроизвести анимацию"
            }
            onClick={() => {
              if (time >= duration) seek(0);
              setPlaying(!playing);
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <select
            aria-label="Анимация"
            value={animation}
            onChange={(e) => {
              setAnimation(e.target.value);
              setPlaying(true);
            }}
            disabled={!animations.length}
          >
            {!animations.length && <option>Загрузка...</option>}
            {animations.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button
            type="button"
            className={`icon-btn ${loop ? "selected" : ""}`}
            title="Зациклить"
            aria-label="Зациклить анимацию"
            aria-pressed={loop}
            onClick={() => setLoop(!loop)}
          >
            <Repeat2 size={16} />
          </button>
          <select
            aria-label="Скорость анимации"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {[0.25, 0.5, 1, 1.5, 2].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </div>
        <input
          aria-label="Позиция анимации"
          type="range"
          min={0}
          max={Math.max(duration, 0.001)}
          step="0.001"
          value={Math.min(time, duration)}
          onChange={(e) => seek(Number(e.target.value))}
        />
        {expanded && (
          <div className="spine-extra-controls">
            <label>
              Скин
              <select
                aria-label="Скин персонажа"
                value={skin}
                onChange={(e) => setSkin(e.target.value)}
              >
                {skins.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Масштаб
              <input
                aria-label="Масштаб персонажа"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className={`icon-btn ${bones ? "selected" : ""}`}
              title="Показать кости"
              aria-label="Показать кости"
              aria-pressed={bones}
              onClick={() => setBones(!bones)}
            >
              <Bone size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Сбросить"
              aria-label="Сбросить анимацию"
              onClick={() => {
                setZoom(1);
                seek(0);
              }}
            >
              <RotateCcw size={17} />
            </button>
            <div className="background-swatches">
              {["#232b32", "#e5e8dc", "#6f7c73"].map((color) => (
                <button
                  type="button"
                  key={color}
                  title={`Фон ${color}`}
                  aria-label={`Фон ${color}`}
                  aria-pressed={background === color}
                  style={{ background: color }}
                  onClick={() => setBackground(color)}
                />
              ))}
            </div>
            <span className="spine-time">
              {time.toFixed(2)} / {duration.toFixed(2)} с
            </span>
          </div>
        )}
      </div>
      {open && (
        <Modal title="Персонаж / анимации" wide onClose={() => setOpen(false)}>
          <SpineViewer assetId={assetId} draft={draft} expanded />
          <p className="asset-credit">
            {!assetId && !draft && (
              <>
                Spineboy © Esoteric Software · официальный демонстрационный
                персонаж ·{" "}
              </>
            )}
            Spine runtime 4.2
          </p>
        </Modal>
      )}
    </div>
  );
}
