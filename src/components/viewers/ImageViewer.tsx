import { useState } from "react";
import { Expand, Minus, Plus, RotateCcw, Image as ImageIcon } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Modal } from "../Modal";
export default function ImageViewer({
  source,
}: {
  source?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!source) return <div className="viewer-fallback viewer-placeholder"><ImageIcon size={34} strokeWidth={1.35} /><span>Изображение появится после загрузки</span></div>;
  return (
    <div className="image-viewer">
      <img
        src={source}
        alt="Изображение автора"
      />
      <div className="viewer-actions">
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
          title="Работа автора"
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
                    className="expanded-image"
                    src={source}
                    alt="Изображение в полном размере"
                  />
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </Modal>
      )}
    </div>
  );
}
