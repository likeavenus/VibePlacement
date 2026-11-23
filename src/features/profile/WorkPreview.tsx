import { useEffect, useState } from "react";
import { Box, FileText, Music2, Play, Image as ImageIcon } from "lucide-react";
import type { Work } from "../../data/types";
import { getBundle } from "../../data/assets";
import { WorkDetail } from "../studio/WorkDetail";

export function WorkPreview({ work }: { work: Work }) {
  const [source, setSource] = useState<string>();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setSource(undefined);
    if (work.assetId) void getBundle(work.assetId).then((bundle) => {
      if (!active || !bundle) return;
      const file = bundle.cover ?? (bundle.kind === "image" ? bundle.files.find((item) => item.type.startsWith("image/")) : undefined);
      if (file) { url = URL.createObjectURL(file); setSource(url); }
    }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [work.assetId]);
  const poster = source;
  const Icon = work.viewer === "audio" ? Music2 : work.viewer === "model" ? Box : work.viewer === "script" ? FileText : ["video", "motion", "spine"].includes(work.viewer) ? Play : ImageIcon;
  return <>
    <button type="button" className="people-work-preview" title={work.title} onClick={() => setOpen(true)}>
      <span className="people-work-media">{poster ? <img src={poster} alt="" loading="lazy" /> : <Icon size={30} strokeWidth={1.4} />}</span>
      <span>{work.title}</span>
    </button>
    {open && <WorkDetail work={work} onClose={() => setOpen(false)} />}
  </>;
}
