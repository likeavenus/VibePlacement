import { useState } from "react";
import { Expand, Minus, Plus, RotateCcw, Columns2 } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Modal } from "../Modal";
import { publicAsset } from "../../data/urls";
const demoImage = publicAsset("assets/alpine.jpg");
export default function ImageViewer({
  source = demoImage,
}: {
  source?: string;
}) {
  const [expanded, setExpanded] = useState(false),
    [compare, setCompare] = useState(false),
    [split, setSplit] = useState(50);
  return (
    <div className="image-viewer">
      <img
        src={source}
        alt={source === demoImage ? "Горный пейзаж" : "Изображение автора"}
        className={source === demoImage ? "graded-image" : ""}
      />
      {compare && (
        <>
          <img
            src={source}
            alt="Исходный кадр"
            className="before-image"
            style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
          />
          <div className="compare-line" style={{ left: split + "%" }} />
          <input
            type="range"
            min="0"
            max="100"
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="compare-range"
            aria-label="Сравнение до и после"
          />
          <span className="compare-before">ДО</span>
          <span className="compare-after">ПОСЛЕ</span>
        </>
      )}
      {source === demoImage && (
        <span className="viewer-badge">VISUAL EXPLORATION / 04</span>
      )}
      <div className="viewer-actions">
        {source === demoImage && (
          <button
            type="button"
            className={`icon-btn ${compare ? "selected" : ""}`}
            title="До / после"
            aria-label="Сравнить до и после"
            onClick={() => setCompare(!compare)}
          >
            <Columns2 size={15} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          title="Открыть изображение"
          aria-label="Увеличить изображение"
          onClick={() => setExpanded(true)}
        >
          <Expand size={15} />
        </button>
      </div>
      {expanded && (
        <Modal
          title={
            source === demoImage ? "Миры, которых ещё не было" : "Работа автора"
          }
          wide
          onClose={() => setExpanded(false)}
        >
          <TransformWrapper initialScale={1} minScale={1} maxScale={5}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="zoom-toolbar">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Приблизить"
                    onClick={() => zoomIn()}
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Отдалить"
                    onClick={() => zoomOut()}
                  >
                    <Minus size={20} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Сбросить масштаб"
                    onClick={() => resetTransform()}
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
                <TransformComponent
                  wrapperStyle={{ width: "100%" }}
                  contentStyle={{ width: "100%" }}
                >
                  <img
                    className={`expanded-image ${source === demoImage ? "graded-image" : ""}`}
                    src={source}
                    alt="Изображение в полном размере"
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
          {source === demoImage && (
            <p className="asset-credit">
              Fronalpstock · Hannes Röst ·{" "}
              <a
                href="https://commons.wikimedia.org/wiki/File:Fronalpstock_big.jpg"
                target="_blank"
                rel="noreferrer"
              >
                Wikimedia Commons
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 3.0
              </a>
              . Размер и цвет изменены.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
