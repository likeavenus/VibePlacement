import { useCallback, useEffect, useRef, useState } from "react";
import {
  Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, MarkerType,
  addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
  type NodeProps, type Viewport, type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, Workflow, X, Flag, PanelsTopLeft, CornerDownRight, Split, ImagePlus, StickyNote, Square, Circle, Diamond, LoaderCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { taskStatus, type Game, type GameGraphNode } from "../../data/product";
import { readGameImage } from "./imageData";
import "./game-flow.css";

type EditorData = {
  label: string;
  text: string;
  kind: "root" | "scene" | "ending" | "sticky" | "rectangle" | "ellipse" | "diamond" | "image";
  image?: string;
  entityIds?: string[];
  status?: string;
  workId?: string;
  taskId?: string;
  onEdit: (text: string) => void;
  onEditLabel: (text: string) => void;
  onEditImage: (image?: string) => void;
  onEditCommit: () => void;
};
type EditorFlowNode = Node<EditorData>;
type Graph = NonNullable<Game["graph"]>;
type Props = {
  game: Game;
  saveGraph: (graph: Graph) => boolean;
  onPreview: (workId: string) => void;
  standalone?: boolean;
};
const emptyGraph: Graph = { phase: "editor", answers: {}, nodes: [], edges: [], hiddenTaskIds: [] };

const storyKindLabel: Record<EditorData["kind"], string> = { root: "ИГРА", scene: "СЦЕНА", ending: "ФИНАЛ", sticky: "ЗАМЕТКА", rectangle: "ПРЯМОУГОЛЬНИК", ellipse: "ЭЛЛИПС", diamond: "РОМБ", image: "ИЗОБРАЖЕНИЕ" };
const storyKinds = new Set(["root", "chapter", "scene", "ending", "story"]);
const geometryKinds = new Set(["rectangle", "ellipse", "diamond"]);

function EditorNode({ data }: NodeProps<EditorFlowNode>) {
  if (geometryKinds.has(data.kind)) {
    return <div className={`gf-shape-frame is-${data.kind}`}>
      <Handle type="target" position={Position.Left} />
      <div className={`gf-editor-node gf-shape is-${data.kind}${data.image ? " has-image" : ""}`}>
      <span className="gf-shape-background" aria-hidden="true" style={data.image ? { backgroundImage: `url(${JSON.stringify(data.image)})` } : undefined} />
      <textarea
        className="gf-shape-text nodrag nopan nowheel"
        aria-label="Текст внутри фигуры"
        placeholder="Текст"
        value={data.text}
        onChange={(event) => { data.onEdit(event.target.value); data.onEditCommit(); }}
        onKeyDown={(event) => event.stopPropagation()}
      />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>;
  }
  return <div className={`gf-editor-node is-${data.kind}`}>
    {data.kind !== "root" && <Handle type="target" position={Position.Left} />}
    {data.image && <img className="gf-node-image" src={data.image} alt="" draggable={false} />}
    {data.kind !== "image" && <><span className="gf-node-kicker">{storyKindLabel[data.kind]}</span><strong>{data.label}</strong></>}
    {data.kind !== "root" && data.text.trim() && <p>{data.text}</p>}
    {data.status && <span className="gf-status">{data.status}</span>}
    {data.kind !== "ending" && <Handle type="source" position={Position.Right} />}
  </div>;
}
const editorTypes = { editor: EditorNode };

function planNodes(game: Game): GameGraphNode[] {
  const nodes = (game.graph?.nodes ?? []).filter((node) => storyKinds.has(node.type) || ["sticky", "rectangle", "ellipse", "diamond", "image"].includes(node.type)).map((node) => ({
    ...node,
    type: node.type as GameGraphNode["type"],
  }));
  if (!nodes.some((node) => node.id === "root")) nodes.unshift({ id: "root", type: "root", title: game.title, description: game.description, position: { x: 0, y: 80 } });
  return nodes;
}

export function GamePlan({ game, saveGraph, onPreview, standalone = false }: Props) {
  const [selected, setSelected] = useState("");
  const boardImageInput = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const latest = useRef({ game, saveGraph });
  latest.current = { game, saveGraph };
  const nodesRef = useRef<EditorFlowNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const lastSaved = useRef<Graph | undefined>(undefined);
  const previousTasks = useRef(game.tasks);
  const hiddenTaskIds = useRef<string[]>(game.graph?.hiddenTaskIds ?? []);
  const viewport = useRef<Viewport | undefined>(undefined);
  const flowElement = useRef<HTMLDivElement>(null);
  const [connectMenu, setConnectMenu] = useState<{ x: number; y: number; flowX: number; flowY: number; source: string } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [imageError, setImageError] = useState("");
  const [nodes, setNodes] = useState<EditorFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const updateNodes = useCallback((next: EditorFlowNode[]) => {
    nodesRef.current = next;
    setNodes(next);
  }, []);
  const updateEdges = useCallback((next: Edge[]) => {
    edgesRef.current = next;
    setEdges(next);
  }, []);
  const persist = useCallback(() => {
    const graph: Graph = {
      phase: "editor", answers: latest.current.game.graph?.answers ?? {},
      hiddenTaskIds: hiddenTaskIds.current,
      nodes: nodesRef.current.map((node) => ({
        id: node.id, type: node.data.kind,
        title: node.data.label, description: node.data.text, position: node.position,
        taskId: node.data.taskId, workId: node.data.workId, entityIds: node.data.entityIds,
        image: node.data.image,
      })),
      edges: edgesRef.current.map((edge) => ({
        id: edge.id, source: edge.source, target: edge.target,
        label: typeof edge.label === "string" ? edge.label : undefined,
      })),
    };
    if (latest.current.saveGraph(graph)) lastSaved.current = graph;
  }, []);
  const editNode = useCallback((id: string, text: string) => {
    updateNodes(nodesRef.current.map((node) => node.id === id ? { ...node, data: { ...node.data, text } } : node));
  }, [updateNodes]);
  const editNodeLabel = useCallback((id: string, label: string) => {
    updateNodes(nodesRef.current.map((node) => node.id === id ? { ...node, data: { ...node.data, label } } : node));
  }, [updateNodes]);
  const editNodeImage = useCallback((id: string, image?: string) => {
    updateNodes(nodesRef.current.map((node) => node.id === id ? { ...node, data: { ...node.data, image } } : node));
  }, [updateNodes]);
  const toFlowNode = useCallback((node: GameGraphNode): EditorFlowNode => {
    return {
      id: node.id, type: "editor", position: node.position, deletable: node.id !== "root",
      data: {
        label: node.title, text: node.description,
        kind: node.id === "root" ? "root" : node.type === "ending" ? "ending" : node.type === "sticky" || node.type === "rectangle" || node.type === "ellipse" || node.type === "diamond" || node.type === "image" ? node.type : "scene",
        image: node.image,
        status: undefined,
        taskId: undefined, workId: undefined,
        entityIds: node.entityIds,
        onEdit: (text) => editNode(node.id, text), onEditLabel: (label) => editNodeLabel(node.id, label),
        onEditImage: (image) => editNodeImage(node.id, image), onEditCommit: persist,
      },
    };
  }, [editNode, editNodeLabel, editNodeImage, persist]);

  useEffect(() => {
    const graph = game.graph ?? emptyGraph;
    // A save echo must not replace React Flow's measured nodes during dragging.
    if (graph === lastSaved.current && game.tasks === previousTasks.current) return;
    previousTasks.current = game.tasks;
    hiddenTaskIds.current = graph.hiddenTaskIds;
    const current = new Map(nodesRef.current.map((node) => [node.id, node]));
    updateNodes(planNodes(game).map((node) => ({ ...current.get(node.id), ...toFlowNode(node) })));
    const ids = new Set(planNodes(game).map((node) => node.id));
    updateEdges(graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge) => ({ ...edge, animated: true })));
  }, [game, toFlowNode, updateNodes, updateEdges]);

  const onNodesChange = useCallback((changes: NodeChange<EditorFlowNode>[]) => {
    const allowed = changes.filter((change) => change.type !== "remove" || change.id !== "root");
    updateNodes(applyNodeChanges(allowed, nodesRef.current));
    if (allowed.some((change) => change.type === "remove")) {
      const ids = new Set(nodesRef.current.map((node) => node.id));
      updateEdges(edgesRef.current.filter((edge) => ids.has(edge.source) && ids.has(edge.target)));
      persist();
    }
  }, [updateNodes, updateEdges, persist]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    updateEdges(applyEdgeChanges(changes, edgesRef.current));
    if (changes.some((change) => change.type === "remove")) persist();
  }, [updateEdges, persist]);
  const connect = useCallback((connection: Connection) => {
    if (connection.source === connection.target) return;
    if (!connection.source || !connection.target || connection.target === "root") return;
    if (nodesRef.current.find((node) => node.id === connection.source)?.data.kind === "ending") return;
    const canReach = (from: string, target: string, seen = new Set<string>()): boolean => {
      if (from === target) return true;
      if (seen.has(from)) return false;
      seen.add(from);
      return edgesRef.current.filter((edge) => edge.source === from).some((edge) => canReach(edge.target, target, seen));
    };
    const sourceNode = nodesRef.current.find((node) => node.id === connection.source);
    const targetNode = nodesRef.current.find((node) => node.id === connection.target);
    if (!sourceNode || !targetNode) return;
    if (storyKinds.has(sourceNode.data.kind) && storyKinds.has(targetNode.data.kind) && canReach(connection.target, connection.source)) return;
    updateEdges(addEdge({ ...connection, animated: true }, edgesRef.current));
    persist();
  }, [updateEdges, persist]);
  const saveEdgeLabel = useCallback((id: string, label: string) => {
    updateEdges(edgesRef.current.map((edge) => edge.id === id ? { ...edge, label: label.trim() || undefined } : edge));
    persist();
  }, [updateEdges, persist]);

  function removeNode(id: string) {
    const node = nodesRef.current.find((item) => item.id === id);
    if (!node || id === "root") return;
    if (node.data.taskId && !hiddenTaskIds.current.includes(node.data.taskId)) {
      hiddenTaskIds.current = [...hiddenTaskIds.current, node.data.taskId];
    }
    updateNodes(nodesRef.current.filter((item) => item.id !== id));
    updateEdges(edgesRef.current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelected((value) => value === id ? "" : value);
    setNodeMenu(null);
    persist();
  }
  function addNode(kind: "scene" | "ending", at?: { x: number; y: number }, source?: string, edgeLabel?: string) {
    const selectedIsStory = nodesRef.current.some((item) => item.id === selected && storyKinds.has(item.data.kind));
    const parentId = source ?? (selectedIsStory ? selected : "root");
    const parent = nodesRef.current.find((item) => item.id === parentId);
    if (!parent || !storyKinds.has(parent.data.kind) || parent.data.kind === "ending") return;
    const siblingIndex = edgesRef.current.filter((edge) => edge.source === parentId).length;
    const node = toFlowNode({
      id: `${kind}-${crypto.randomUUID()}`, type: kind,
      title: kind === "ending" ? "Новый финал" : "Новая сцена", description: "",
      position: at ?? (parent ? { x: parent.position.x + 300, y: parent.position.y + siblingIndex * 190 } : { x: 320, y: 80 }),
    });
    if (!at) {
      let overlap = true;
      while (overlap) {
        overlap = false;
        for (const existing of nodesRef.current) {
          if (Math.abs(existing.position.x - node.position.x) < 260 && Math.abs(existing.position.y - node.position.y) < Math.max(190, (existing.measured?.height ?? 160) + 30)) {
            node.position.y = existing.position.y + Math.max(190, (existing.measured?.height ?? 160) + 30);
            overlap = true;
          }
        }
      }
    }
    updateNodes([...nodesRef.current, node]);
    if (parent) updateEdges(addEdge({ id: `${parentId}-${node.id}`, source: parentId, target: node.id, animated: true, label: edgeLabel }, edgesRef.current));
    persist();
    setConnectMenu(null);
    setNodeMenu(null);
  }
  function addBoardItem(kind: "sticky" | "rectangle" | "ellipse" | "diamond" | "image", image?: string) {
    const labels = { sticky: "Новая заметка", rectangle: "Прямоугольник", ellipse: "Эллипс", diamond: "Ромб", image: "Изображение" };
    const rect = flowElement.current?.getBoundingClientRect();
    const view = viewport.current ?? { x: 48, y: 50, zoom: 1 };
    const center = rect ? { x: (rect.width / 2 - view.x) / view.zoom, y: (rect.height / 2 - view.y) / view.zoom } : { x: 320, y: 180 };
    const node = toFlowNode({ id: `${kind}-${crypto.randomUUID()}`, type: kind, title: labels[kind], description: "", ...(image ? { image } : {}), position: { x: center.x - 120, y: center.y - 65 } });
    updateNodes([...nodesRef.current, node]);
    setSelected(node.id);
    setSelectedEdgeId("");
    setNodeMenu(null);
    setConnectMenu(null);
    persist();
  }
  const onConnectEnd: OnConnectEnd = useCallback((event, connection) => {
    if (!connection.fromNode || connection.toNode || connection.isValid === true) return;
    if (connection.fromHandle?.type !== "source" || connection.fromNode.data.kind === "ending" || !storyKinds.has(connection.fromNode.data.kind as string)) return;
    const rect = flowElement.current?.getBoundingClientRect();
    if (!rect) return;
    const point = event instanceof MouseEvent ? event : event.changedTouches[0];
    if (!point) return;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const view = viewport.current ?? { x: 0, y: 0, zoom: 1 };
    setConnectMenu({ x: Math.max(8, Math.min(rect.width - 220, x)), y: Math.max(8, Math.min(rect.height - 170, y)), flowX: (x - view.x) / view.zoom, flowY: (y - view.y) / view.zoom, source: connection.fromNode.id });
  }, []);
  const selectedNode = nodes.find((node) => node.id === selected);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const labelsByNode = new Map(nodes.map((node) => [node.id, node.data.label]));
  const storyNodes = nodes.filter((node) => storyKinds.has(node.data.kind));
  useEffect(() => {
    if (!nodeMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNodeMenu(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [nodeMenu]);
  return <section className={`gf-plan${selectedNode || selectedEdge ? " has-inspector" : ""}`}>
    <div className="gf-plan-toolbar">
      <div><Workflow size={18} /><strong>Сюжетная карта</strong><span>{Math.max(0, storyNodes.length - 1)}</span></div>
      <div className="gf-board-tools" role="group" aria-label="Инструменты доски">
        <div className="gf-tool-group" role="group" aria-label="Сюжет">
          <button type="button" aria-label="Добавить сцену" title="Добавить сцену" disabled={selectedNode?.data.kind === "ending"} onClick={() => addNode("scene")}><PanelsTopLeft size={20} /></button>
          <button type="button" aria-label="Добавить финал" title="Добавить финал" disabled={selectedNode?.data.kind === "ending"} onClick={() => addNode("ending")}><Flag size={20} /></button>
        </div>
        <div className="gf-tool-group" role="group" aria-label="Изображения и заметки">
          <button type="button" aria-label={uploadingImage ? "Загрузка изображения" : "Добавить изображение"} title={uploadingImage ? "Загрузка изображения" : "Добавить изображение"} disabled={uploadingImage} onClick={() => boardImageInput.current?.click()}>{uploadingImage ? <LoaderCircle size={20} className="gf-upload-spinner" /> : <ImagePlus size={20} />}</button>
          <button type="button" aria-label="Добавить стикер" title="Добавить стикер" onClick={() => addBoardItem("sticky")}><StickyNote size={20} /></button>
        </div>
        <div className="gf-tool-group" role="group" aria-label="Фигуры">
          <button type="button" aria-label="Прямоугольник" title="Прямоугольник" onClick={() => addBoardItem("rectangle")}><Square size={20} /></button>
          <button type="button" aria-label="Эллипс" title="Эллипс" onClick={() => addBoardItem("ellipse")}><Circle size={20} /></button>
          <button type="button" aria-label="Ромб" title="Ромб" onClick={() => addBoardItem("diamond")}><Diamond size={20} /></button>
        </div>
        <div className="gf-tool-group" role="group" aria-label="Действия">
          {(selectedNode && selectedNode.id !== "root" || selectedEdge) && <button type="button" title="Удалить выбранное" aria-label="Удалить выбранное" onClick={() => {
            if (selectedNode) removeNode(selectedNode.id);
            else { updateEdges(edgesRef.current.filter((edge) => edge.id !== selectedEdgeId)); persist(); setSelectedEdgeId(""); }
          }}><Trash2 size={20} /></button>}
          {!standalone && <Link className="gf-window-link" to={`/games/${game.id}?board=1`} target="_blank" rel="noopener noreferrer" title="Открыть доску в отдельном окне" aria-label="Открыть доску в отдельном окне"><ExternalLink size={20} /></Link>}
        </div>
        <input ref={boardImageInput} type="file" accept="image/*" hidden onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setUploadingImage(true);
          setImageError("");
          try { addBoardItem("image", await readGameImage(file)); }
          catch (error) { setImageError(error instanceof Error ? error.message : "Не удалось загрузить изображение"); }
          finally { setUploadingImage(false); }
        }} />
      </div>
    </div>
    <div className="gf-editor-flow" ref={flowElement}>
    {nodes.length === 1 && storyNodes.length === 1 && <div className="gf-empty-overlay">
      <button type="button" className="secondary-btn" onClick={() => addNode("scene", undefined, "root")}><Plus size={16} />Добавить первую сцену</button>
    </div>}
    {imageError && <div className="gf-board-error" role="alert"><span>{imageError}</span><button type="button" aria-label="Закрыть сообщение" onClick={() => setImageError("")}><X size={16} /></button></div>}
    <ReactFlow<EditorFlowNode>
      nodes={nodes} edges={edges} nodeTypes={editorTypes}
      defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" }, interactionWidth: 28 }}
      connectOnClick
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect}
      onConnectEnd={onConnectEnd}
      deleteKeyCode={null}
      onNodeContextMenu={(event, node) => {
        event.preventDefault();
        const rect = flowElement.current?.getBoundingClientRect();
        if (!rect) return;
        setConnectMenu(null);
        setSelectedEdgeId("");
        setNodeMenu({
          x: Math.max(8, Math.min(rect.width - 190, event.clientX - rect.left)),
          y: Math.max(8, Math.min(rect.height - 112, event.clientY - rect.top)),
          id: node.id,
        });
      }}
      onPaneContextMenu={(event) => { event.preventDefault(); setNodeMenu(null); }}
      onNodeClick={(_, node) => { setNodeMenu(null); setSelectedEdgeId(""); setSelected(node.id); }} onEdgeClick={(_, edge) => { setSelected(""); setSelectedEdgeId(edge.id); }} onPaneClick={() => { setNodeMenu(null); setConnectMenu(null); setSelected(""); setSelectedEdgeId(""); }}
      onNodeDragStop={(_, __, moved) => {
        const positions = new Map(moved.map((node) => [node.id, node.position]));
        updateNodes(nodesRef.current.map((node) => positions.has(node.id) ? { ...node, position: positions.get(node.id)!, dragging: false } : node));
        persist();
      }}
      defaultViewport={viewport.current ?? { x: 48, y: 50, zoom: 1 }}
      fitView={standalone}
      onMoveEnd={(_, value) => { viewport.current = value; }}
      minZoom={0.4} maxZoom={1.6}
      fitViewOptions={{ minZoom: 0.6, maxZoom: 1, padding: 0.15 }}
    >
      <Background variant={BackgroundVariant.Lines} color="var(--ui-grid)" gap={24} lineWidth={1} />
      <Controls showInteractive={false} />
      {connectMenu && <div className="gf-connect-menu" style={{ left: connectMenu.x, top: connectMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
        <span>Создать связанную ноду</span>
        <button onClick={() => addNode("scene", { x: connectMenu.flowX, y: connectMenu.flowY }, connectMenu.source)}>Сцена</button>
        <button onClick={() => addNode("ending", { x: connectMenu.flowX, y: connectMenu.flowY }, connectMenu.source)}>Финал</button>
      </div>}
      {nodeMenu && <div className="gf-node-context-menu" role="menu" style={{ left: nodeMenu.x, top: nodeMenu.y }} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
        {storyKinds.has(nodes.find((node) => node.id === nodeMenu.id)?.data.kind ?? "") && nodes.find((node) => node.id === nodeMenu.id)?.data.kind !== "ending" && <>
          <button role="menuitem" onClick={() => { setSelected(nodeMenu.id); addNode("scene", undefined, nodeMenu.id); }}><CornerDownRight size={15} />Продолжить сценой</button>
          <button role="menuitem" onClick={() => { setSelected(nodeMenu.id); addNode("scene", undefined, nodeMenu.id, "Новый выбор"); }}><Split size={15} />Добавить развилку</button>
          <span className="gf-menu-divider" />
        </>}
        <button role="menuitem" disabled={nodeMenu.id === "root"} onClick={() => removeNode(nodeMenu.id)}><Trash2 size={15} />Удалить</button>
      </div>}
    </ReactFlow></div>
    {selectedNode && !nodeMenu && <aside className="gf-inspector">
      <button aria-label="Закрыть панель" className="icon-btn" onClick={() => setSelected("")}><X size={16} /></button>
      <span className="gf-node-kicker">{storyKindLabel[selectedNode.data.kind]}</span>
      {selectedNode.data.kind === "root" ? <strong>{selectedNode.data.label}</strong> : !geometryKinds.has(selectedNode.data.kind) && <>
        <label className="gf-edge-label">Название<input aria-label="Название выбранной сцены" value={selectedNode.data.label} maxLength={100} onChange={(event) => { editNodeLabel(selectedNode.id, event.target.value); persist(); }} /></label>
        <label className="gf-edge-label">Описание<textarea aria-label="Описание выбранной сцены" value={selectedNode.data.text} rows={5} onChange={(event) => { editNode(selectedNode.id, event.target.value); persist(); }} /></label>
      </>}
      <label className="gf-image-upload"><ImagePlus size={16} /><span>{geometryKinds.has(selectedNode.data.kind) ? (selectedNode.data.image ? "Заменить фон" : "Добавить фон") : (selectedNode.data.image ? "Заменить изображение" : "Добавить изображение")}</span><input type="file" accept="image/*" aria-label="Загрузить изображение к узлу" onChange={async (event) => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        if (!file) return;
        try { editNodeImage(selectedNode.id, await readGameImage(file)); persist(); setImageError(""); }
        catch (error) { setImageError(error instanceof Error ? error.message : "Не удалось загрузить изображение"); }
      }} /></label>
      {selectedNode.data.image && <div className="gf-image-preview"><img src={selectedNode.data.image} alt="Предпросмотр изображения сцены" /><button type="button" onClick={() => { editNodeImage(selectedNode.id); persist(); }}>Убрать изображение</button></div>}
      {storyKinds.has(selectedNode.data.kind) && game.tasks.filter((task) => task.storyNodeId === selectedNode.id).map((task) => <div className="gf-linked-task" key={task.id}><strong>{task.title}</strong><span>{taskStatus[task.status]}</span>{task.workId && <button className="secondary-btn" onClick={() => onPreview(task.workId!)}>Открыть работу</button>}</div>)}
      {edges.filter((edge) => edge.source === selectedNode.id).map((edge) => <label className="gf-edge-label" key={edge.id}>Переход к {labelsByNode.get(edge.target) ?? "части сюжета"}<input key={`${edge.id}-${edge.label ?? ""}`} aria-label={`Подпись перехода к ${labelsByNode.get(edge.target) ?? "части сюжета"}`} defaultValue={typeof edge.label === "string" ? edge.label : ""} maxLength={120} placeholder="Выбор или условие" onBlur={(event) => saveEdgeLabel(edge.id, event.target.value)} /></label>)}
    </aside>}
    {selectedEdge && !nodeMenu && <aside className="gf-inspector gf-edge-inspector">
      <button aria-label="Закрыть панель" className="icon-btn" onClick={() => setSelectedEdgeId("")}><X size={16} /></button>
      <span className="gf-node-kicker">ВЫБОР ИЛИ УСЛОВИЕ</span>
      <strong>{labelsByNode.get(selectedEdge.source)} → {labelsByNode.get(selectedEdge.target)}</strong>
      <input aria-label="Подпись перехода" key={`${selectedEdge.id}-${selectedEdge.label ?? ""}`} defaultValue={typeof selectedEdge.label === "string" ? selectedEdge.label : ""} maxLength={120} placeholder="Например: Пойти за проводником" onBlur={(event) => saveEdgeLabel(selectedEdge.id, event.target.value)} />
      <button className="text-action" onClick={() => { updateEdges(edgesRef.current.filter((edge) => edge.id !== selectedEdge.id)); persist(); setSelectedEdgeId(""); }}>Удалить переход</button>
    </aside>}
  </section>;
}
