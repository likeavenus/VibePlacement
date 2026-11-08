import { useEffect, useRef } from "react";
export function PixelScene({ station = false }: { station?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const rect = (
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
    ) => {
      c.fillStyle = color;
      c.fillRect(x, y, w, h);
    };
    rect(0, 0, 320, 180, station ? "#333b60" : "#7b9a9b");
    rect(0, 55, 320, 65, station ? "#826e85" : "#a7bca4");
    for (let i = 0; i < 8; i++) {
      rect(i * 47, 30 + (i % 3) * 5, 34, 5, "#cad5b1");
      rect(i * 47 + 7, 25 + (i % 3) * 5, 21, 5, "#cad5b1");
    }
    for (let i = 0; i < 20; i++) {
      const x = i * 19;
      const y = 53 + ((i * 13) % 22);
      rect(x, y, 22, 70, "#628a7b");
      rect(x + 4, y - 9, 14, 20, "#628a7b");
    }
    rect(0, 108, 320, 72, "#486b58");
    rect(0, 119, 320, 61, "#365548");
    rect(0, 144, 320, 36, "#789281");
    rect(0, 148, 320, 32, "#8eaa96");
    for (let i = 0; i < 37; i++)
      rect((i * 47) % 320, 151 + ((i * 11) % 27), 8 + (i % 12), 2, "#bad0aa");
    rect(90, 111, 151, 34, "#887957");
    rect(87, 115, 160, 4, "#c3b78b");
    rect(112, 72, 105, 48, "#c1bb95");
    rect(112, 96, 105, 24, "#9b9d78");
    for (let i = 0; i < 6; i++) rect(112, 75 + i * 7, 105, 1, "#899177");
    for (let i = 0; i < 8; i++)
      rect(102 + i * 6, 72 - i * 4, 125 - i * 12, 5, "#495c57");
    for (let i = 0; i < 5; i++)
      rect(110 + i * 8, 69 - i * 5, 107 - i * 16, 2, "#7e8c77");
    rect(193, 39, 9, 24, "#a7a18b");
    rect(191, 37, 13, 4, "#cdc6a6");
    rect(157, 87, 18, 33, "#4a655c");
    rect(160, 90, 12, 17, "#d6bc76");
    rect(168, 111, 2, 2, "#e8d4a1");
    for (const x of [123, 186]) {
      rect(x, 86, 19, 21, "#58665a");
      rect(x + 2, 88, 15, 16, "#dfc689");
      rect(x + 9, 87, 2, 19, "#697365");
      rect(x + 1, 96, 17, 2, "#697365");
    }
    rect(149, 121, 35, 5, "#b2a37a");
    rect(145, 126, 43, 4, "#c4b58e");
    for (const x of [23, 55, 263, 294]) {
      rect(x + 7, 67, 6, 65, "#645f49");
      for (let i = 0; i < 5; i++) {
        rect(
          x - 12 + i * 4,
          92 - i * 12,
          44 - i * 8,
          13,
          i % 2 ? "#486f55" : "#3b604c",
        );
        rect(x - 8 + i * 4, 92 - i * 12, 13, 4, "#6c8d61");
      }
    }
    for (let i = 0; i < 60; i++) {
      const x = (i * 67) % 320;
      const y = 125 + (i % 16);
      rect(x, y, 2, 3, i % 3 ? "#8d9f69" : "#d9c591");
    }
    rect(226, 112, 5, 8, "#d7b98d");
    rect(224, 119, 9, 10, "#d48c65");
    rect(224, 129, 3, 6, "#353f46");
    rect(230, 129, 3, 6, "#353f46");
    if (station) {
      rect(0, 155, 320, 3, "#3e464a");
      rect(0, 168, 320, 3, "#3e464a");
      for (let x = 0; x < 320; x += 13) rect(x, 153, 4, 20, "#586060");
      rect(246, 95, 3, 43, "#b8a17a");
      rect(233, 94, 30, 10, "#d0bc85");
    }
  }, [station]);
  return (
    <canvas
      ref={ref}
      width={320}
      height={180}
      className="pixel-scene"
      role="img"
      aria-label={
        station
          ? "Пиксельная станция среди деревьев"
          : "Пиксельный дом у реки в хвойном лесу"
      }
    />
  );
}
