import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Film, Image as ImageIcon, LoaderCircle } from "lucide-react";
import type { ViewerKind } from "../../data/types";
import { getBundle, type AssetBundle } from "../../data/assets";
import { BundleViewer } from "./BundleViewer";
import { DesignPreview, MotionPreview } from "./CreativePreview";
const SpineViewer = lazy(() => import("./SpineViewer"));
const ModelViewer = lazy(() => import("./ModelViewer"));
const AudioViewer = lazy(() => import("./AudioViewer"));
const ImageViewer = lazy(() => import("./ImageViewer"));
const StoryViewer = lazy(() => import("./StoryViewer"));
function UploadedMedia({ assetId }: { assetId: string }) {
  const [bundle, setBundle] = useState<AssetBundle>(),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBundle(undefined);
    setError("");
    getBundle(assetId)
      .then((value) => {
        if (active) {
          if (!value) setError("Файл не найден в этом браузере.");
          else setBundle(value);
        }
      })
      .catch(() => {
        if (active) setError("Не удалось прочитать файл.");
      });
    return () => {
      active = false;
    };
  }, [assetId]);
  if (error)
    return (
      <div className="viewer-fallback" role="alert">
        {error}
      </div>
    );
  return bundle ? (
    <BundleViewer bundle={bundle} />
  ) : (
    <div className="viewer-fallback">
      <LoaderCircle className="spin" />
    </div>
  );
}
export function Viewer({
  kind,
  assetId,
}: {
  kind: ViewerKind;
  assetId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const loading = (
    <div className="viewer-fallback">
      <LoaderCircle size={23} className="spin" />
    </div>
  );
  return (
    <div ref={ref} className={`work-viewer viewer-${kind}`}>
      <Suspense fallback={loading}>
        {kind === "spine" ? (
          visible ? (
            <SpineViewer assetId={assetId} active={visible} />
          ) : (
            loading
          )
        ) : assetId ? (
          visible ? (
            <UploadedMedia assetId={assetId} />
          ) : (
            loading
          )
        ) : kind === "model" ? (
          visible ? (
            <ModelViewer />
          ) : (
            loading
          )
        ) : kind === "audio" ? (
          <AudioViewer />
        ) : kind === "image" ? (
          <ImageViewer />
        ) : kind === "design" ? (
          <DesignPreview />
        ) : kind === "motion" ? (
          <MotionPreview />
        ) : kind === "pixel" ? (
          <div className="viewer-fallback viewer-placeholder"><ImageIcon size={34} strokeWidth={1.35} /><span>Превью появится после загрузки</span></div>
        ) : kind === "script" ? (
          <StoryViewer />
        ) : kind === "game" ? (
          <div className="game-bundle-placeholder">ИГРА</div>
        ) : (
          <div className="viewer-fallback viewer-placeholder"><Film size={34} strokeWidth={1.35} /><span>Видео появится после загрузки</span></div>
        )}
      </Suspense>
    </div>
  );
}
