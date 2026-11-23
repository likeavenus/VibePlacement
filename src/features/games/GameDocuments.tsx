import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Undo2, Redo2, Plus, FileText, Heading1, Heading2, Code, Minus, Link2, BookOpen, PanelsTopLeft, Flag, Trash2, Workflow, UsersRound, MapPin, Package, ImagePlus } from "lucide-react";
import { addEdge, Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, type Connection, type Edge, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import type { Game, GameDocument, GameGraphNode, GameStoryEntity } from "../../data/product";
import { storyLayout } from "./storyLayout";
import { readGameImage } from "./imageData";
import { UiSelect } from "../../components/UiSelect";
import "./game-documents.css";

const StoryReference = TiptapNode.create({
  name: "storyReference",
  inline: true,
  group: "inline",
  atom: true,
  addAttributes: () => ({
    nodeId: { default: null, parseHTML: (element) => element.getAttribute("data-story-node-id"), renderHTML: () => ({}) },
    title: { default: "Сцена", parseHTML: (element) => element.getAttribute("data-story-title"), renderHTML: () => ({}) },
    kind: { default: "scene", parseHTML: (element) => element.getAttribute("data-story-kind"), renderHTML: () => ({}) },
  }),
  parseHTML: () => [{ tag: "span[data-story-reference]" }],
  renderHTML: ({ node, HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, {
    "data-story-reference": "", "data-story-node-id": node.attrs.nodeId,
    "data-story-title": node.attrs.title, "data-story-kind": node.attrs.kind,
    role: "button", tabindex: "0",
  }), `${node.attrs.kind === "ending" ? "Финал" : "Сцена"}: ${node.attrs.title}`],
});
const GameImage = TiptapNode.create({
  name: "gameImage",
  group: "block",
  atom: true,
  addAttributes: () => ({ src: { default: null }, alt: { default: "" } }),
  parseHTML: () => [{ tag: "img[data-game-image]" }],
  renderHTML: ({ HTMLAttributes }) => ["img", mergeAttributes(HTMLAttributes, { "data-game-image": "", class: "game-document-image" })],
});
const extensions = [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }), Placeholder.configure({ placeholder: "Начните писать…" }), StoryReference, GameImage];
const emptyContent: GameDocument["content"] = { type: "doc", content: [{ type: "paragraph" }] };
function initialDocuments(game: Game): GameDocument[] {
  const savedOverview = game.documents?.find((document) => document.id === "overview");
  return [{
    id: "overview",
    title: "Описание игры",
    content: savedOverview?.content ?? { type: "doc", content: game.description.split("\n").map((text) => ({ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) })) },
  }, ...(game.documents ?? []).filter((document) => document.id !== "overview" &&
    (!["lore", "mechanics"].includes(document.id) || document.content.content.some((node) => node.type !== "paragraph" || node.content?.length)))];
}
function Toolbar({ editor, storyNodes }: { editor: Editor; storyNodes: GameGraphNode[] }) {
  const [storyReference, setStoryReference] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current.isActive("bold"), italic: current.isActive("italic"), strike: current.isActive("strike"),
    h1: current.isActive("heading", { level: 1 }), h2: current.isActive("heading", { level: 2 }),
    bullet: current.isActive("bulletList"), ordered: current.isActive("orderedList"), quote: current.isActive("blockquote"), code: current.isActive("codeBlock"),
    undo: current.can().undo(), redo: current.can().redo(), link: current.isActive("link"),
  }) });
  const buttons = [
    { name: "Заголовок 1", Icon: Heading1, active: state.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: "Заголовок 2", Icon: Heading2, active: state.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: "Полужирный", Icon: Bold, active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { name: "Курсив", Icon: Italic, active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { name: "Зачёркнутый", Icon: Strikethrough, active: state.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { name: "Список", Icon: List, active: state.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { name: "Нумерованный список", Icon: ListOrdered, active: state.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { name: "Цитата", Icon: Quote, active: state.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { name: "Блок кода", Icon: Code, active: state.code, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { name: "Разделитель", Icon: Minus, run: () => editor.chain().focus().setHorizontalRule().run() },
  ];
  return <div className="document-tools" role="toolbar" aria-label="Форматирование">
    {buttons.map(({ name, Icon, active, run }) => <button key={name} title={name} aria-label={name} aria-pressed={active ?? false} onMouseDown={(event) => event.preventDefault()} onClick={run}><Icon size={18} /></button>)}
    <button title="Ссылка" aria-label="Ссылка" aria-pressed={state.link} onClick={() => { setUrl(String(editor.getAttributes("link").href ?? "")); setLinkOpen(!linkOpen); }}><Link2 size={18} /></button>
    <button title="Изображение" aria-label="Вставить изображение" onClick={() => imageInput.current?.click()}><ImagePlus size={18} /></button>
    <input ref={imageInput} className="document-hidden-file" type="file" accept="image/*" aria-label="Выбрать изображение" onChange={async (event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      try { editor.chain().focus().insertContent({ type: "gameImage", attrs: { src: await readGameImage(file), alt: file.name.replace(/\.[^.]+$/, "") } }).run(); setImageError(""); }
      catch (cause) { setImageError(cause instanceof Error ? cause.message : "Не удалось загрузить изображение"); }
    }} />
    <label className="document-story-reference" title="Вставить ссылку на часть сюжета"><Workflow size={16} /><UiSelect ariaLabel="Вставить ссылку на сцену" value={storyReference} disabled={!storyNodes.length} onChange={(value) => {
      const node = storyNodes.find((item) => item.id === value);
      if (!node) return;
      editor.chain().focus().insertContent({ type: "storyReference", attrs: { nodeId: node.id, title: node.title, kind: node.type } }).run();
      setStoryReference("");
    }} options={[{ value: "", label: "Связать сцену" }, ...storyNodes.map((node) => ({ value: node.id, label: `${node.type === "ending" ? "Финал" : "Сцена"}: ${node.title}` }))]} /></label>
    <button title="Отменить" aria-label="Отменить" disabled={!state.undo} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={18} /></button>
    <button title="Повторить" aria-label="Повторить" disabled={!state.redo} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={18} /></button>
    {imageError && <span className="document-image-error" role="alert">{imageError}</span>}
    {linkOpen && <form className="document-link" onSubmit={(event) => {
      event.preventDefault();
      if (url && !/^https?:\/\/|^mailto:/i.test(url)) { setError("Укажите ссылку с https://"); return; }
      if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      else editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setError(""); setLinkOpen(false);
    }}><input aria-label="Адрес ссылки" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /><button type="submit">Применить</button>{error && <span role="alert">{error}</span>}</form>}
  </div>;
}
function DocumentEditor({ document, update, storyNodes }: { document: GameDocument; update: (content: JSONContent) => void; storyNodes: GameGraphNode[] }) {
  const updateRef = useRef(update);
  updateRef.current = update;
  const editor = useEditor({
    extensions, content: document.content, shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: "game-document-prose", "aria-label": "Текст документа", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: current }) => updateRef.current(current.getJSON()),
  });
  return <div className="document-writing" onClickCapture={(event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-story-node-id]") : null;
    if (target?.dataset.storyNodeId) window.dispatchEvent(new CustomEvent("vibeplacement:focus-story-node", { detail: { nodeId: target.dataset.storyNodeId } }));
  }} onKeyDownCapture={(event) => {
    if ((event.key !== "Enter" && event.key !== " ") || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>("[data-story-node-id]");
    if (!target?.dataset.storyNodeId) return;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("vibeplacement:focus-story-node", { detail: { nodeId: target.dataset.storyNodeId } }));
  }}>{editor && <Toolbar editor={editor} storyNodes={storyNodes} />}<EditorContent editor={editor} /></div>;
}

type StoryGraph = NonNullable<Game["graph"]>;
type MapNodeData = { label: string; kind: "root" | "scene" | "ending"; image?: string };
type MapFlowNode = Node<MapNodeData>;
const mapNodeTypes = { story: StoryMapNode };
const kindNames = { root: "Игра", scene: "Сцена", ending: "Финал" } as const;
const entityNames = { character: "Персонаж", location: "Локация", item: "Предмет" } as const;
const entityIcons = { character: UsersRound, location: MapPin, item: Package } as const;

function StoryMapNode({ data }: NodeProps<MapFlowNode>) {
  return <div className={`document-map-node is-${data.kind}`}>
    {data.kind !== "root" && <Handle type="target" position={Position.Top} />}
    <span>{kindNames[data.kind]}</span>
    <strong>{data.label}</strong>
    {data.image && <img src={data.image} alt="" />}
    {data.kind !== "ending" && <Handle type="source" position={Position.Bottom} />}
  </div>;
}

function storyGraph(game: Game): StoryGraph {
  const source = game.graph;
  const nodes = (source?.nodes ?? []).filter((node) => ["root", "chapter", "scene", "ending", "story"].includes(node.type)).map((node) => ({
    ...node,
    type: node.id === "root" ? "root" as const : node.type === "ending" ? "ending" as const : "scene" as const,
  }));
  if (!nodes.some((node) => node.id === "root")) nodes.unshift({ id: "root", type: "root", title: game.title, description: game.description, position: { x: 0, y: 0 } });
  const ids = new Set(nodes.map((node) => node.id));
  return {
    phase: "editor", answers: source?.answers ?? {}, hiddenTaskIds: source?.hiddenTaskIds ?? [], nodes,
    edges: (source?.edges ?? []).filter((edge) => ids.has(edge.source) && ids.has(edge.target)),
  };
}

function StoryMapPanel({ game, saveGraph, saveEntities }: { game: Game; saveGraph: (graph: StoryGraph) => boolean; saveEntities: (entities: GameStoryEntity[]) => boolean }) {
  const [graph, setGraph] = useState(() => storyGraph(game));
  const graphRef = useRef(graph);
  const [selectedId, setSelectedId] = useState("root");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [imageError, setImageError] = useState("");
  const [panelMode, setPanelMode] = useState<"map" | "catalog">("map");
  const addMenu = useRef<HTMLDetailsElement>(null);
  const [entities, setEntities] = useState<GameStoryEntity[]>(game.storyEntities ?? []);
  const entitiesRef = useRef(entities);
  const [entityType, setEntityType] = useState<GameStoryEntity["type"]>("character");
  const [entityName, setEntityName] = useState("");
  const flowRef = useRef<ReactFlowInstance<MapFlowNode, Edge> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const graphSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveGraphRef = useRef(saveGraph);
  saveGraphRef.current = (next) => {
    // The compact story map edits scenes without deleting board-only annotations.
    const annotations = (game.graph?.nodes ?? []).filter((node) => ["sticky", "rectangle", "ellipse", "diamond", "image"].includes(node.type));
    const annotationIds = new Set(annotations.map((node) => node.id));
    const ids = new Set([...next.nodes.map((node) => node.id), ...annotationIds]);
    const annotationEdges = (game.graph?.edges ?? []).filter((edge) => (annotationIds.has(edge.source) || annotationIds.has(edge.target)) && ids.has(edge.source) && ids.has(edge.target));
    return saveGraph({ ...next, nodes: [...next.nodes, ...annotations], edges: [...next.edges, ...annotationEdges] });
  };
  const selectedNode = graph.nodes.find((node) => node.id === selectedId);
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  const topology = useMemo(() => `${graph.nodes.map((node) => node.id).join(",")}|${graph.edges.map((edge) => `${edge.source}>${edge.target}`).join(",")}`, [graph.nodes, graph.edges]);
  const positions = useMemo(() => storyLayout(graph.nodes, graph.edges).positions, [topology]);
  const flowNodes: MapFlowNode[] = graph.nodes.map((node) => ({
    id: node.id, type: "story", position: positions.get(node.id) ?? node.position,
    selected: node.id === selectedId,
    data: { label: node.id === selectedId && draft.title ? draft.title : node.title, kind: node.id === "root" ? "root" : node.type === "ending" ? "ending" : "scene", image: node.image },
  }));
  const flowEdges: Edge[] = graph.edges.map((edge) => ({ ...edge, type: "smoothstep", label: edge.label, labelStyle: { fill: "var(--ui-edge-label)", fontSize: 13 }, labelBgStyle: { fill: "var(--ui-edge-label-bg)", fillOpacity: 0.95 } }));
  const focusMap = useCallback((id = selectedId) => {
    const flow = flowRef.current;
    if (!flow) return;
    if (window.matchMedia("(max-width: 700px)").matches) {
      const point = positions.get(id) ?? positions.get("root");
      if (point) flow.setCenter(point.x + 75, point.y + 80, { zoom: 0.85, duration: 180 });
    } else {
      flow.fitView({ padding: 0.12, minZoom: 0.5, maxZoom: 0.95, duration: 180 });
    }
  }, [positions, selectedId]);
  const focusStoryNode = useCallback((id: string) => {
    const point = positions.get(id);
    if (point) flowRef.current?.setCenter(point.x + 80, point.y + 42, { zoom: 0.9, duration: 220 });
  }, [positions]);

  useEffect(() => {
    const next = storyGraph(game);
    if (JSON.stringify(next) !== JSON.stringify(graphRef.current)) {
      graphRef.current = next;
      setGraph(next);
      if (!next.nodes.some((node) => node.id === selectedId)) setSelectedId("root");
    }
  }, [game.graph, game.title, game.description, selectedId]);
  useEffect(() => {
    setDraft({ title: selectedNode?.title ?? "", description: selectedNode?.description ?? "" });
  }, [selectedId]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => focusMap());
    return () => cancelAnimationFrame(frame);
  }, [focusMap, topology]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => focusMap());
    });
    observer.observe(canvas);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [focusMap]);
  useEffect(() => {
    const onReference = (event: Event) => {
      const id = (event as CustomEvent<{ nodeId: string }>).detail?.nodeId;
      if (!id || !graphRef.current.nodes.some((node) => node.id === id)) return;
      setPanelMode("map");
      setSelectedId(id);
      setSelectedEdgeId("");
      requestAnimationFrame(() => requestAnimationFrame(() => focusStoryNode(id)));
    };
    window.addEventListener("vibeplacement:focus-story-node", onReference);
    return () => window.removeEventListener("vibeplacement:focus-story-node", onReference);
  }, [focusStoryNode]);
  useEffect(() => {
    const next = game.storyEntities ?? [];
    if (JSON.stringify(next) !== JSON.stringify(entitiesRef.current)) {
      entitiesRef.current = next;
      setEntities(next);
    }
  }, [game.storyEntities]);
  useEffect(() => {
    const flushGraph = () => {
      clearTimeout(graphSaveTimer.current);
      if (graphSaveTimer.current) saveGraphRef.current(graphRef.current);
      graphSaveTimer.current = undefined;
    };
    window.addEventListener("pagehide", flushGraph);
    return () => { window.removeEventListener("pagehide", flushGraph); flushGraph(); };
  }, []);

  function commit(next: StoryGraph) {
    clearTimeout(graphSaveTimer.current);
    graphSaveTimer.current = undefined;
    graphRef.current = next;
    setGraph(next);
    saveGraphRef.current(next);
  }
  function commitEntities(next: GameStoryEntity[]) {
    entitiesRef.current = next;
    setEntities(next);
    saveEntities(next);
  }
  function updateEntity(id: string, patch: Partial<GameStoryEntity>) {
    const next = entitiesRef.current.map((item) => item.id === id ? { ...item, ...patch } : item);
    entitiesRef.current = next;
    setEntities(next);
  }
  function saveDraft() {
    if (!selectedNode || selectedNode.id === "root") return;
    commit({ ...graphRef.current, nodes: graphRef.current.nodes.map((node) => node.id === selectedId ? { ...node, title: draft.title.trim() || "Без названия", description: draft.description } : node) });
  }
  function draftNode(patch: Partial<Pick<GameGraphNode, "title" | "description" | "image">>) {
    if (!selectedNode || selectedNode.id === "root") return;
    const next = { ...graphRef.current, nodes: graphRef.current.nodes.map((node) => node.id === selectedId ? { ...node, ...patch } : node) };
    graphRef.current = next;
    setGraph(next);
    clearTimeout(graphSaveTimer.current);
    graphSaveTimer.current = setTimeout(() => {
      graphSaveTimer.current = undefined;
      saveGraphRef.current(next);
    }, 350);
  }
  function addStoryNode(type: "scene" | "ending") {
    const parentId = graphRef.current.nodes.some((node) => node.id === selectedId) ? selectedId : "root";
    const parent = graphRef.current.nodes.find((node) => node.id === parentId)!;
    if (parent.type === "ending") return;
    const node: GameGraphNode = {
      id: `${type}-${crypto.randomUUID()}`, type,
      title: type === "ending" ? "Новый финал" : "Новая сцена",
      description: "", position: { x: parent.position.x + 280, y: parent.position.y },
    };
    const next = { ...graphRef.current, nodes: [...graphRef.current.nodes, node], edges: [...graphRef.current.edges, { id: `${parentId}-${node.id}`, source: parentId, target: node.id }] };
    commit(next);
    setSelectedId(node.id);
    setSelectedEdgeId("");
    if (addMenu.current) addMenu.current.open = false;
  }
  function createsCycle(source: string, target: string, edges: StoryGraph["edges"]) {
    const visit = (id: string, seen = new Set<string>()): boolean => {
      if (id === source) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return edges.filter((edge) => edge.source === id).some((edge) => visit(edge.target, seen));
    };
    return visit(target);
  }
  function connect(connection: Connection) {
    if (!connection.source || !connection.target || connection.target === "root" || connection.source === connection.target) return;
    if (graphRef.current.nodes.find((node) => node.id === connection.source)?.type === "ending") return;
    if (createsCycle(connection.source, connection.target, graphRef.current.edges)) return;
    const edges = addEdge({ ...connection, id: `${connection.source}-${connection.target}-${crypto.randomUUID()}`, type: "smoothstep" }, graphRef.current.edges as Edge[]).map(({ source, target, id, label }) => ({ id, source, target, label: typeof label === "string" ? label : undefined }));
    commit({ ...graphRef.current, edges });
  }
  function removeSelected() {
    if (!selectedNode || selectedNode.id === "root") return;
    const next = { ...graphRef.current, nodes: graphRef.current.nodes.filter((node) => node.id !== selectedId), edges: graphRef.current.edges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId) };
    commit(next);
    setSelectedId("root");
  }
  function addEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = entityName.trim();
    if (!name) return;
    commitEntities([...entitiesRef.current, { id: crypto.randomUUID(), type: entityType, name, description: "" }]);
    setEntityName("");
  }
  function attachEntity(entityId: string) {
    if (!selectedNode || selectedNode.id === "root" || !entityId) return;
    const node = graphRef.current.nodes.find((item) => item.id === selectedId);
    if (!node || (node.entityIds ?? []).includes(entityId)) return;
    commit({ ...graphRef.current, nodes: graphRef.current.nodes.map((item) => item.id === selectedId ? { ...item, entityIds: [...(item.entityIds ?? []), entityId] } : item) });
  }
  function detachEntity(entityId: string) {
    commit({ ...graphRef.current, nodes: graphRef.current.nodes.map((item) => item.id === selectedId ? { ...item, entityIds: (item.entityIds ?? []).filter((id) => id !== entityId) } : item) });
  }

  return <aside className="document-story-map" aria-label="Карта истории">
    <header><div className="document-map-title"><Workflow size={16} /><span>Карта сюжета</span><small>Визуальный план игры</small></div>
      {selectedNode?.type !== "ending" && <>
      <details ref={addMenu} className="document-map-add"><summary title="Добавить часть истории" aria-label="Добавить часть истории"><Plus size={17} /></summary><div>
        <button onClick={() => addStoryNode("scene")}><PanelsTopLeft size={15} />Сцена</button>
        <button onClick={() => addStoryNode("ending")}><Flag size={15} />Финал</button>
      </div></details>
      </>}
    </header>
    <>
    <div className="document-story-canvas" ref={canvasRef}><ReactFlow<MapFlowNode>
      nodes={flowNodes} edges={flowEdges} nodeTypes={mapNodeTypes}
      onInit={(instance) => { flowRef.current = instance; requestAnimationFrame(() => requestAnimationFrame(() => focusMap())); }}
      nodesDraggable={false} nodesConnectable minZoom={0.16} maxZoom={1.25} fitView fitViewOptions={{ padding: 0.12, minZoom: 0.5, maxZoom: 0.95 }}
      onNodeClick={(_, node) => { saveDraft(); setSelectedId(node.id); setSelectedEdgeId(""); }}
      onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedId(""); }}
      onPaneClick={() => { setSelectedId(""); setSelectedEdgeId(""); }}
      onConnect={connect}
      isValidConnection={(connection) => Boolean(connection.source && connection.target && connection.source !== connection.target && connection.target !== "root" && graph.nodes.find((node) => node.id === connection.source)?.type !== "ending" && !createsCycle(connection.source, connection.target, graph.edges))}
      onNodesChange={() => {}}
      onEdgesChange={() => {}}
      deleteKeyCode={null}
      zoomOnScroll={false} zoomOnDoubleClick={false} panOnDrag
      proOptions={{ hideAttribution: true }}
    ><Background variant={BackgroundVariant.Dots} color="var(--ui-grid-dots)" gap={18} size={1} /><Controls position="top-right" showInteractive={false} /></ReactFlow></div>
    {selectedNode && selectedNode.id !== "root" && <div className="document-map-inspector">
      <div className="document-map-inspector-title"><span>{kindNames[selectedNode.type === "ending" ? "ending" : "scene"]}</span><button type="button" title="Удалить часть сюжета" aria-label="Удалить часть сюжета" onClick={removeSelected}><Trash2 size={15} /></button></div>
      <label className="document-image-upload"><ImagePlus size={16} /><span>{selectedNode.image ? "Заменить изображение" : "Добавить изображение"}<small>Изображение будет видно на карте и в тексте</small></span><input type="file" accept="image/*" aria-label="Изображение сцены" onChange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        try { draftNode({ image: await readGameImage(file) }); setImageError(""); }
        catch (error) { setImageError(error instanceof Error ? error.message : "Не удалось загрузить изображение"); }
      }} /></label>
      {selectedNode.image && <div className="document-image-preview"><img src={selectedNode.image} alt="Изображение выбранной сцены" /><button type="button" onClick={() => draftNode({ image: undefined })}>Убрать</button></div>}
      {imageError && <p className="document-image-error" role="alert">{imageError}</p>}
      <input aria-label="Название части сюжета" value={draft.title} maxLength={100} onChange={(event) => { const title = event.target.value; setDraft((value) => ({ ...value, title })); draftNode({ title }); }} onBlur={saveDraft} />
      <textarea aria-label="Описание части сюжета" rows={3} maxLength={2000} value={draft.description} placeholder="Кратко: что происходит?" onChange={(event) => { const description = event.target.value; setDraft((value) => ({ ...value, description })); draftNode({ description }); }} onBlur={saveDraft} />
    </div>}
    {selectedEdge && <div className="document-map-inspector">
      <div className="document-map-inspector-title"><span>Переход между частями</span><button type="button" title="Удалить связь" aria-label="Удалить связь" onClick={() => { commit({ ...graphRef.current, edges: graphRef.current.edges.filter((edge) => edge.id !== selectedEdgeId) }); setSelectedEdgeId(""); }}><Trash2 size={15} /></button></div>
      <input key={selectedEdge.id} aria-label="Условие или выбор" maxLength={120} defaultValue={selectedEdge.label ?? ""} placeholder="Подпись выбора или условия" onBlur={(event) => commit({ ...graphRef.current, edges: graphRef.current.edges.map((edge) => edge.id === selectedEdgeId ? { ...edge, label: event.target.value.trim() || undefined } : edge) })} />
      <small>Например: «Пойти за проводником»</small>
    </div>}
    {!selectedNode && !selectedEdge && <p className="document-map-hint">Выберите сцену, чтобы править её рядом с документом</p>}
    </>
  </aside>;
}

export default function GameDocuments({ game, save, saveGraph, saveEntities }: { game: Game; save: (documents: GameDocument[]) => boolean; saveGraph: (graph: StoryGraph) => boolean; saveEntities: (entities: GameStoryEntity[]) => boolean }) {
  const [documents, setDocuments] = useState(() => initialDocuments(game));
  const [active, setActive] = useState(documents[0].id);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const current = useRef(documents);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;
  const flush = () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    const ok = saveRef.current(current.current);
    pending.current = !ok;
    setStatus(ok ? "Сохранено" : "Не удалось сохранить");
  };
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (pending.current) saveRef.current(current.current);
  }, []);
  useEffect(() => {
    const saveOnExit = () => { if (pending.current) { pending.current = !saveRef.current(current.current); } };
    window.addEventListener("pagehide", saveOnExit);
    return () => window.removeEventListener("pagehide", saveOnExit);
  }, []);
  function change(next: GameDocument[], render = false) {
    current.current = next; pending.current = true;
    if (render) setDocuments(next);
    setStatus("Сохраняется"); clearTimeout(timer.current); timer.current = setTimeout(flush, 600);
  }
  const selected = current.current.find((item) => item.id === active)!;
  return <section className="game-documents">
    <nav className="document-nav" aria-label="Документы игры">
      {documents.map((item) => <button key={item.id} type="button" className={item.id === active ? "is-active" : ""} aria-current={item.id === active ? "page" : undefined} onClick={() => setActive(item.id)}><FileText size={16} /><span>{item.title}</span></button>)}
      {sectionName === null ? <button type="button" aria-label="Добавить раздел" title="Добавить раздел" onClick={() => setSectionName("")}><Plus size={16} /></button> : <form className="document-new-section" onSubmit={(event) => {
        event.preventDefault();
        const title = sectionName.trim();
        if (!title) return;
        const item = { id: crypto.randomUUID(), title, content: emptyContent };
        change([...current.current, item], true); setActive(item.id); setSectionName(null);
      }}><input aria-label="Название раздела" placeholder="Название раздела" autoFocus maxLength={80} value={sectionName} onChange={(event) => setSectionName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSectionName(null); }} /><button disabled={!sectionName.trim()}>Создать</button><button type="button" onClick={() => setSectionName(null)}>Отмена</button></form>}
    </nav>
    <div className="document-page">
      <div className="document-heading"><h2>{selected.title}</h2><span role="status">{status}</span></div>
      <DocumentEditor key={active} document={selected} storyNodes={(game.graph?.nodes ?? []).filter((node) => node.type === "scene" || node.type === "chapter" || node.type === "ending")} update={(content) => change(current.current.map((item) => item.id === active ? { ...item, content: content as GameDocument["content"] } : item))} />
    </div>
    <StoryMapPanel game={game} saveGraph={saveGraph} saveEntities={saveEntities} />
  </section>;
}
