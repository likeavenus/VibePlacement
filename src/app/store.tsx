import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";
import { seedProjects, works, creators } from "../data/mock";
import { profileSettingsSchema, type ProfileSettings } from "../data/people";
import {
  categorySchema,
  commentSchema,
  gameSchema,
  gameDocumentSchema,
  purchaseSchema,
  seedComments,
  seedGames,
  type Game,
  type GameTask,
  type GameDocument,
  type GameStoryEntity,
} from "../data/product";
import type { Creator, Project, Work } from "../data/types";
import {
  agreementSchema,
  responseSchema,
  projectMetaSchema,
  projectLinkSchema,
  initialAgreement,
  type Agreement,
  type ProjectResponse,
  type ProjectLink,
} from "../data/projects";
const workSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: categorySchema,
  viewer: z.enum([
    "model",
    "image",
    "design",
    "motion",
    "audio",
    "pixel",
    "script",
    "video",
    "spine",
    "game",
  ]),
  creatorId: z.string(),
  price: z.number().nonnegative(),
  tags: z.array(z.string()),
  label: z.string(),
  color: z.string(),
  description: z.string(),
  assetId: z.string().optional(),
  saleType: z.enum(["service", "asset", "showcase"]).optional(),
  animations: z.array(z.string()).optional(),
  gamePage: z.object({
    videoUrl: z.string().url().optional(),
    platform: z.string().max(80),
    version: z.string().max(32),
  }).optional(),
});
const projectSchema = z.object({
  gameId: z.string().optional(),
  meta: projectMetaSchema.optional(),
  links: z.array(projectLinkSchema).max(8).optional(),
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: categorySchema,
  tags: z.array(z.string()),
  roles: z.array(z.string()),
  filledRoles: z.array(z.object({ role: z.string(), assignee: z.string() })).optional(),
  roleOffers: z.array(z.object({ role: z.string(), amount: z.number().nonnegative() })).optional(),
  payment: z.enum(["fixed", "revshare", "mixed"]),
  budget: z.number().finite().nonnegative(),
  members: z.number(),
  slots: z.number(),
  creatorId: z.string(),
  art: z.enum(["station", "landscape", "code"]),
});
const stateSchema = z.object({
  profile: profileSettingsSchema.optional().catch(undefined),
  agreements: z.array(agreementSchema).default([]),
  projectResponses: z.array(responseSchema).default([]),
  favorites: z.array(z.string()),
  projectList: z.array(projectSchema),
  applications: z.array(z.string()),
  categories: z.array(z.string()),
  publications: z.array(workSchema),
  games: z.array(gameSchema),
  comments: z.array(commentSchema),
  purchases: z.array(purchaseSchema),
});
type State = z.infer<typeof stateSchema>;
const initial: State = {
  agreements: [],
  projectResponses: [],
  favorites: [],
  projectList: seedProjects,
  applications: [],
  categories: [],
  publications: [],
  games: seedGames,
  comments: seedComments,
  purchases: [],
};
function read(): State {
  try {
    const raw = localStorage.getItem("vibeplacement:state-v2");
    if (raw) {
      const data = JSON.parse(raw);
      // Retired directions must not invalidate unrelated saved games and comments.
      if (Array.isArray(data.publications))
        data.publications = data.publications.filter(
          (work: Work) => !["code", "shader"].includes(work.category),
        );
      for (const project of data.projectList ?? [])
        if (project.category === "code") project.category = "ux";
      for (const game of data.games ?? [])
        for (const task of game.tasks ?? []) {
          if (task.category === "code") task.category = "ux";
          if (task.workId === "inventory") task.workId = "game-ui";
        }
      if (Array.isArray(data.favorites))
        data.favorites = data.favorites.filter(
          (id: string) => !["inventory", "shader"].includes(id),
        );
      const parsed = stateSchema.safeParse(data);
      return parsed.success
        ? {
            ...parsed.data,
            projectList: [
              ...parsed.data.projectList,
              ...seedProjects.filter(
                (seed) =>
                  !parsed.data.projectList.some(
                    (project) => project.id === seed.id,
                  ),
              ),
            ],
          }
        : initial;
    }
    // Preserve the previous prototype's user data while retiring its shader examples.
    const legacy = (key: string) =>
      JSON.parse(localStorage.getItem("kadrift:" + key) ?? "null");
    const oldProjects = z.array(projectSchema).safeParse(legacy("projects-v1"));
    const oldFavorites = z.array(z.string()).safeParse(legacy("favorites"));
    return {
      ...initial,
      favorites: oldFavorites.success
        ? oldFavorites.data.filter((id) => id !== "shader")
        : [],
      projectList: oldProjects.success
        ? [
            ...oldProjects.data.filter((p) => p.id !== "flow"),
            ...seedProjects.filter(
              (p) => !oldProjects.data.some((old) => old.id === p.id),
            ),
          ]
        : seedProjects,
    };
  } catch {
    return initial;
  }
}
function useStoreValue() {
  const [state, setState] = useState(read),
    current = useRef(state);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== "vibeplacement:state-v2" || !event.newValue) return;
      const next = read();
      current.current = next;
      setState(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const commit = (update: (previous: State) => State): boolean => {
    const next = update(current.current);
    try {
      localStorage.setItem("vibeplacement:state-v2", JSON.stringify(next));
    } catch {
      setToast("Не удалось сохранить. Освободите место в браузере.");
      return false;
    }
    current.current = next;
    setState(next);
    return true;
  };
  const workList: Work[] = [...state.publications, ...works];
  const creatorList: Creator[] = creators.map((creator) => creator.id === "denis" && state.profile ? {
    ...creator, ...state.profile,
    initials: state.profile.name.split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toLocaleUpperCase("ru"),
  } : creator);
  return {
    ...state,
    workList,
    creatorList,
    creatorById: (id: string) => creatorList.find((creator) => creator.id === id) ?? creatorList[0],
    saveProfile: (profile: ProfileSettings) => {
      const result = profileSettingsSchema.safeParse(profile);
      if (!result.success) { setToast("Проверьте поля профиля"); return false; }
      return commit((s) => ({ ...s, profile: result.data }));
    },
    toast,
    setToast,
    toggleFavorite: (id: string) =>
      commit((s) => ({
        ...s,
        favorites: s.favorites.includes(id)
          ? s.favorites.filter((x) => x !== id)
          : [...s.favorites, id],
      })),
    addProject: (project: Project) =>
      commit((s) => ({ ...s, projectList: [project, ...s.projectList] })),
    saveProjectLinks: (projectId: string, links: ProjectLink[]) => {
      if (
        !current.current.projectList.some(
          (p) => p.id === projectId && p.creatorId === "denis",
        ) ||
        !z.array(projectLinkSchema).max(8).safeParse(links).success
      )
        return false;
      return commit((s) => ({
        ...s,
        projectList: s.projectList.map((p) =>
          p.id === projectId ? { ...p, links } : p,
        ),
      }));
    },
    saveAgreement: (agreement: Agreement) => {
      const project = current.current.projectList.find(
        (p) => p.id === agreement.projectId,
      );
      if (
        !project ||
        project.creatorId !== "denis" ||
        agreement.authorId !== "denis" ||
        !agreementSchema.safeParse(agreement).success
      )
        return false;
      const previous =
        current.current.agreements
          .filter((a) => a.projectId === project.id)
          .at(-1) ?? initialAgreement(project);
      if (agreement.version !== previous.version + 1) return false;
      return commit((s) => ({
        ...s,
        agreements: [...s.agreements, agreement],
      }));
    },
    respondToProject: (response: ProjectResponse) => {
      const project = current.current.projectList.find(
        (p) => p.id === response.projectId,
      );
      if (
        !project ||
        project.creatorId === "denis" ||
        response.applicantId !== "denis" ||
        !project.roles.includes(response.role) ||
        !responseSchema.safeParse(response).success
      )
        return false;
      const latest =
        current.current.agreements
          .filter((a) => a.projectId === project.id)
          .at(-1) ?? initialAgreement(project);
      if (JSON.stringify(latest) !== JSON.stringify(response.agreement))
        return false;
      if (
        current.current.projectResponses.some(
          (r) =>
            r.projectId === response.projectId &&
            r.applicantId === response.applicantId &&
            r.agreement.id === latest.id,
        )
      )
        return false;
      return commit((s) => ({
        ...s,
        projectResponses: [...s.projectResponses, response],
        applications: s.applications.includes(project.id)
          ? s.applications
          : [...s.applications, project.id],
      }));
    },
    apply: (id: string) =>
      commit((s) => ({
        ...s,
        applications: s.applications.includes(id)
          ? s.applications
          : [...s.applications, id],
      })),
    proposeCategory: (name: string) =>
      commit((s) => ({ ...s, categories: [...s.categories, name] })),
    publish: (work: Work) =>
      commit((s) => ({ ...s, publications: [work, ...s.publications] })),
    addGame: (game: Game) =>
      commit((s) => ({ ...s, games: [game, ...s.games] })),
    saveGameDocuments: (gameId: string, documents: GameDocument[]) => {
      if (!z.array(gameDocumentSchema).safeParse(documents).success) return false;
      const textContent = (node: GameDocument["content"]["content"][number]): string =>
        [node.text ?? "", ...(node.content ?? []).map(textContent)].filter(Boolean).join(" ");
      const description = documents.find((document) => document.id === "overview")?.content.content.map(textContent).join("\n") ?? "";
      return commit((s) => ({ ...s, games: s.games.map((game) => game.id === gameId ? { ...game, documents, description } : game) }));
    },
    saveGameTeam: (gameId: string, team: NonNullable<Game["team"]>) =>
      commit((s) => ({
        ...s,
        games: s.games.map((game) => game.id === gameId ? { ...game, team } : game),
        projectList: s.projectList.map((project) => project.gameId !== gameId ? project : {
          ...project,
          roles: team.filter((slot) => !slot.assignee).map((slot) => slot.role),
          filledRoles: team.filter((slot) => slot.assignee).map(({ role, assignee }) => ({ role, assignee })),
          members: 1 + team.filter((slot) => slot.assignee).length,
          slots: 1 + team.length,
        }),
      })),
    saveGameStoryEntities: (gameId: string, storyEntities: GameStoryEntity[]) =>
      commit((s) => ({ ...s, games: s.games.map((game) => game.id === gameId ? { ...game, storyEntities } : game) })),
    saveGameGraph: (gameId: string, graph: NonNullable<Game["graph"]>, newTask?: GameTask) =>
      commit((s) => ({
        ...s,
        games: s.games.map((game) =>
          game.id === gameId ? { ...game, graph, tasks: [...game.tasks, ...(newTask && !game.tasks.some((task) => task.id === newTask.id) ? [newTask] : [])].map((task) => {
            const node = graph.nodes.find((node) => node.taskId === task.id);
            const hasStoryNode = graph.nodes.some((node) => node.id === task.storyNodeId);
            return { ...task, storyNodeId: task.storyNodeId && hasStoryNode ? task.storyNodeId : undefined, ...(node ? { title: node.title.trim() || task.title, brief: node.description } : {}) };
          }) } : game,
        ),
      })),
    saveTask: (gameId: string, task: GameTask) =>
      commit((s) => ({
        ...s,
        games: s.games.map((game) =>
          game.id === gameId
            ? {
                ...game,
                tasks: game.tasks.some((t) => t.id === task.id)
                  ? game.tasks.map((t) => (t.id === task.id ? task : t))
                  : [...game.tasks, task],
              }
            : game,
        ),
      })),
    removeTask: (gameId: string, taskId: string) =>
      commit((s) => ({
        ...s,
        games: s.games.map((game) =>
          game.id === gameId
            ? { ...game, tasks: game.tasks.filter((t) => t.id !== taskId) }
            : game,
        ),
      })),
    addComment: (workId: string, body: string) =>
      commit((s) => ({
        ...s,
        comments: [
          ...s.comments,
          {
            id: crypto.randomUUID(),
            workId,
            authorId: "denis",
            body: body.trim().slice(0, 1000),
            createdAt: new Date().toISOString(),
          },
        ],
      })),
    deleteComment: (id: string) =>
      commit((s) => ({
        ...s,
        comments: s.comments.filter(
          (c) => c.id !== id || c.authorId !== "denis",
        ),
      })),
    purchase: (workId: string, gameId?: string) => {
      const work = workList.find((w) => w.id === workId);
      if (
        !work ||
        work.saleType !== "asset" ||
        work.creatorId === "denis" ||
        current.current.purchases.some(
          (p) => p.workId === workId && p.buyerId === "denis",
        )
      )
        return false;
      return commit((s) => ({
        ...s,
        purchases: [
          ...s.purchases,
          {
            id: crypto.randomUUID(),
            workId,
            buyerId: "denis",
            sellerId: work.creatorId,
            amount: work.price,
            fee: Math.round(work.price * 0.1),
            createdAt: new Date().toISOString(),
            gameId,
          },
        ],
        games: s.games.map((game) =>
          game.id === gameId
            ? {
                ...game,
                tasks: [
                  ...game.tasks,
                  {
                    id: crypto.randomUUID(),
                    title: work.title,
                    category: work.category,
                    brief: "Покупка из библиотеки",
                    budget: work.price,
                    status: "done",
                    assignee: work.creatorId,
                    animations: work.animations ?? [],
                    deadline: "",
                    workId,
                  },
                ],
              }
            : game,
        ),
      }));
    },
  };
}
const Context = createContext<ReturnType<typeof useStoreValue> | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  return (
    <Context.Provider value={useStoreValue()}>{children}</Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw new Error("StoreProvider missing");
  return store;
}
