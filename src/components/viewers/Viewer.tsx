import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Film, LoaderCircle } from "lucide-react";
import type { ViewerKind } from "../../data/types";
import { PixelScene } from "./PixelScene";
import { getBundle, type AssetBundle } from "../../data/assets";
import { BundleViewer } from "./BundleViewer";
import { DesignPreview, MotionPreview } from "./CreativePreview";
import { publicAsset } from "../../data/urls";
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
          <>
            <PixelScene />
            <span className="viewer-badge">16-BIT / WOODLAND</span>
          </>
        ) : kind === "script" ? (
          <StoryViewer />
        ) : (
          <>
            <video
              controls
              playsInline
              preload="metadata"
              poster={publicAsset("assets/flower-poster.jpg")}
              src={publicAsset("assets/flower.mp4")}
              aria-label="Видео: маленькая жизнь"
            />
            <span className="viewer-badge">
              <Film size={12} /> MOOD FILM
            </span>
          </>
        )}
      </Suspense>
    </div>
  );
}
