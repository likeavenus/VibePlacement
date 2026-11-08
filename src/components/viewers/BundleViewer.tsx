import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { AssetBundle } from "../../data/assets";
import { readStory, type Story } from "../../data/story";
const UploadedModel = lazy(() => import("./UploadedModel"));
const AudioViewer = lazy(() => import("./AudioViewer"));
const ImageViewer = lazy(() => import("./ImageViewer"));
const StoryViewer = lazy(() => import("./StoryViewer"));
export function BundleViewer({ bundle }: { bundle: AssetBundle }) {
  const [urls, setUrls] = useState<string[]>([]),
    [index, setIndex] = useState(0),
    [story, setStory] = useState<Story>(),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setIndex(0);
    setError("");
    setStory(undefined);
    const next = ["image", "audio", "video"].includes(bundle.kind)
      ? bundle.files.map((file) => URL.createObjectURL(file))
      : [];
    setUrls(next);
    if (bundle.kind === "script")
      readStory(bundle.files[0])
        .then((value) => {
          if (active) setStory(value);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
      next.forEach(URL.revokeObjectURL);
    };
  }, [bundle]);
  const loading = (
    <div className="viewer-fallback">
      <LoaderCircle className="spin" />
    </div>
  );
  if (error)
    return (
      <div className="viewer-fallback" role="alert">
        {error}
      </div>
    );
  return (
    <Suspense fallback={loading}>
      {bundle.kind === "model" ? (
        <UploadedModel file={bundle.files[0]} />
      ) : bundle.kind === "script" ? (
        story ? (
          <StoryViewer story={story} />
        ) : (
          loading
        )
      ) : !urls.length ? (
        loading
      ) : bundle.kind === "image" ? (
        <div className="image-gallery">
          <ImageViewer source={urls[index] ?? urls[0]} />
          {urls.length > 1 && (
            <div className="gallery-controls">
              <button
                type="button"
                className="icon-btn"
                aria-label="Предыдущий экран"
                disabled={!index}
                onClick={() => setIndex(index - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <span>
                {index + 1} / {urls.length}
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Следующий экран"
                disabled={index === urls.length - 1}
                onClick={() => setIndex(index + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      ) : bundle.kind === "audio" ? (
        <AudioViewer source={urls[0]} />
      ) : (
        <video
          src={urls[0]}
          controls
          playsInline
          preload="metadata"
          aria-label="Видео автора"
        />
      )}
    </Suspense>
  );
}
