import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { AudioLines, Pause, Play, Volume2, VolumeX } from "lucide-react";
let sample: Blob | undefined;
function demoAudio() {
  if (sample) return sample;
  const rate = 22050,
    duration = 12,
    length = rate * duration;
  const buffer = new ArrayBuffer(44 + length * 2),
    v = new DataView(buffer);
  const str = (offset: number, text: string) =>
    [...text].forEach((char, i) => v.setUint8(offset + i, char.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const t = i / rate,
      beat = t % 0.5,
      freq = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 220][
        Math.floor(t * 2) % 8
      ];
    const melody =
      Math.sin(2 * Math.PI * freq * t) * Math.exp(-beat * 9) * 0.24;
    const pad =
      (Math.sin(2 * Math.PI * 130.81 * t) + Math.sin(2 * Math.PI * 196 * t)) *
      0.045;
    const kick =
      Math.sin(2 * Math.PI * (48 * beat + 5 * (1 - Math.exp(-beat * 30)))) *
      Math.exp(-beat * 24) *
      0.18;
    const fade = Math.min(1, t * 4, (duration - t) * 2);
    v.setInt16(44 + i * 2, (melody + pad + kick) * fade * 32767, true);
  }
  sample = new Blob([buffer], { type: "audio/wav" });
  return sample;
}
export default function AudioViewer({ source }: { source?: string }) {
  const container = useRef<HTMLDivElement>(null),
    wave = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false),
    [ready, setReady] = useState(false),
    [muted, setMuted] = useState(false),
    [time, setTime] = useState(0),
    [error, setError] = useState(false),
    [duration, setDuration] = useState(12);
  useEffect(() => {
    if (!container.current) return;
    let alive = true;
    const instance = WaveSurfer.create({
      container: container.current,
      height: 62,
      waveColor: "#6b557f",
      progressColor: "#d9b2f3",
      cursorColor: "#eed4ff",
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      normalize: true,
    });
    wave.current = instance;
    instance.on("ready", () => {
      if (alive) {
        setReady(true);
        setDuration(instance.getDuration());
      }
    });
    instance.on("play", () => setPlaying(true));
    instance.on("pause", () => setPlaying(false));
    instance.on("timeupdate", setTime);
    instance.on("finish", () => {
      setPlaying(false);
      instance.setTime(0);
    });
    (source ? instance.load(source) : instance.loadBlob(demoAudio())).catch(
      () => {
        if (alive) setError(true);
      },
    );
    return () => {
      alive = false;
      instance.destroy();
      wave.current = null;
    };
  }, [source]);
  return (
    <div className="audio-viewer">
      <div className="audio-heading">
        <span className="audio-symbol">
          <AudioLines size={25} />
        </span>
        <div>
          <strong>{source ? "АУДИО АВТОРА" : "AFTER HOURS"}</strong>
          <span>
            {source ? "original audio" : "volna.sound / game ambience"}
          </span>
        </div>
        <span className="audio-format">WAV</span>
      </div>
      <div ref={container} className="waveform" aria-label="Звуковая волна" />
      <div className="audio-controls">
        <button
          type="button"
          className="play-btn"
          disabled={!ready || error}
          aria-label={playing ? "Приостановить аудио" : "Воспроизвести аудио"}
          onClick={() => wave.current?.playPause().catch(() => setError(true))}
        >
          {playing ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </button>
        <span>
          {error
            ? "Ошибка аудио"
            : `0:${Math.floor(time).toString().padStart(2, "0")}`}{" "}
          <small>
            / {Math.floor(duration / 60)}:
            {Math.floor(duration % 60)
              .toString()
              .padStart(2, "0")}
          </small>
        </span>
        <button
          type="button"
          className="icon-btn"
          title={muted ? "Включить звук" : "Выключить звук"}
          aria-label={muted ? "Включить звук" : "Выключить звук"}
          onClick={() => {
            wave.current?.setMuted(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
    </div>
  );
}
