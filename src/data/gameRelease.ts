export function youtubeEmbedUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return undefined;
    const host = url.hostname.toLowerCase();
    if (!new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]).has(host)) return undefined;
    const path = url.pathname.split("/").filter(Boolean);
    const id = host.includes("youtu.be") ? path[0] : url.searchParams.get("v") ?? (path[0] === "embed" || path[0] === "shorts" ? path[1] : undefined);
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : undefined;
  } catch {
    return undefined;
  }
}
