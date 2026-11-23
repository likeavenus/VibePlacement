type Item = { id: string };
type Link = { source: string; target: string };

// A spanning forest places each scene once, including merged paths and old cycles.
export function storyLayout(nodes: Item[], edges: Link[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) {
      const list = children.get(edge.source) ?? [];
      list.push(edge.target);
      children.set(edge.source, list);
    }
  }
  const depthById = new Map<string, number>();
  const order: { id: string; depth: number }[] = [];
  const roots = [...new Set(["root", ...ids])].filter((id) => ids.has(id));
  for (const root of roots) {
    if (depthById.has(root)) continue;
    depthById.set(root, 0);
    const queue = [root];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      const depth = depthById.get(id)!;
      order.push({ id, depth });
      for (const child of children.get(id) ?? []) {
        if (depthById.has(child)) continue;
        depthById.set(child, depth + 1);
        queue.push(child);
      }
    }
  }
  const positions = new Map<string, { x: number; y: number }>();
  const lanesByDepth = new Map<number, number>();
  for (const { id, depth } of order) {
    const lane = lanesByDepth.get(depth) ?? 0;
    positions.set(id, { x: lane * 180, y: depth * 125 });
    lanesByDepth.set(depth, lane + 1);
  }
  const outline: { id: string; depth: number }[] = [];
  const visited = new Set<string>();
  for (const root of roots) {
    const stack = [{ id: root, depth: 0 }];
    while (stack.length) {
      const entry = stack.pop()!;
      if (visited.has(entry.id)) continue;
      visited.add(entry.id);
      outline.push(entry);
      const next = children.get(entry.id) ?? [];
      for (let index = next.length - 1; index >= 0; index--) stack.push({ id: next[index], depth: entry.depth + 1 });
    }
  }
  return { order: outline, positions };
}
