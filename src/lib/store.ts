import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Influencer,
  ReferenceImage,
  Video,
  WorkspaceView,
  VideoStatus,
  RosterFolder,
  RosterItem,
  PipelineState,
  PipelineStep,
  StepStatus,
  GeneratedFace,
  ReferenceGrid,
  ReferenceVideo,
  CompositeResult,
  AnimationResult,
} from "./types";

interface ActiveGeneration {
  influencerId: string;
  status: VideoStatus;
  progress: number;
  stageLabel: string;
}

function createEmptyPipeline(): PipelineState {
  return {
    activeStep: 1,
    steps: {
      1: { status: "empty", options: [], selected: null },
      2: { status: "empty", grid: null, confirmed: false },
      3: { status: "empty", video: null },
      4: { status: "empty", options: [], selected: null },
      5: { status: "empty", result: null, retryCount: 0 },
    },
  };
}

interface PersonaStore {
  influencers: Influencer[];
  rosterOrder: RosterItem[];
  folders: RosterFolder[];
  activeInfluencerId: string | null;
  activeView: WorkspaceView;
  activeGeneration: ActiveGeneration | null;

  // Pipeline (ephemeral, not persisted)
  pipeline: PipelineState | null;
  initPipeline: () => void;
  clearPipeline: () => void;
  setActiveStep: (step: PipelineStep) => void;
  updateStepStatus: (step: PipelineStep, status: StepStatus) => void;
  setStepOptions: (step: 1, options: GeneratedFace[]) => void;
  selectFace: (face: GeneratedFace) => void;
  setReferenceGrid: (grid: ReferenceGrid) => void;
  confirmGrid: () => void;
  setReferenceVideo: (video: ReferenceVideo) => void;
  setCompositeOptions: (options: CompositeResult[]) => void;
  selectComposite: (composite: CompositeResult) => void;
  setAnimationResult: (result: AnimationResult) => void;
  goToStep: (step: PipelineStep) => void;
  injectAsset: (step: PipelineStep, asset: File) => void;

  createInfluencer: (id: string, name: string, niche: string) => void;
  deleteInfluencer: (id: string) => void;
  updateInfluencer: (
    id: string,
    patch: Partial<Pick<Influencer, "name" | "niche">>
  ) => void;
  setActiveInfluencer: (id: string | null) => void;
  setActiveView: (view: WorkspaceView) => void;

  // Roster ordering
  reorderRoster: (newOrder: RosterItem[]) => void;
  createFolder: (folderId: string, name: string, influencerIds: string[]) => void;
  toggleFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  removeFromFolder: (folderId: string, influencerId: string) => void;
  addToFolder: (folderId: string, influencerId: string) => void;
  deleteFolder: (folderId: string) => void;

  addReferenceImage: (influencerId: string, image: ReferenceImage) => void;
  updateImageStatus: (
    influencerId: string,
    imageId: string,
    status: ReferenceImage["status"],
    reason?: string,
    classification?: Pick<ReferenceImage, "angle" | "expression" | "framing">
  ) => void;
  removeReferenceImage: (influencerId: string, imageId: string) => void;

  addVideo: (influencerId: string, video: Video) => void;
  updateVideo: (
    influencerId: string,
    videoId: string,
    patch: Partial<Video>
  ) => void;
  deleteVideo: (influencerId: string, videoId: string) => void;
  setActiveGeneration: (gen: ActiveGeneration | null) => void;
}

export const usePersonaStore = create<PersonaStore>()(
  persist(
    (set) => ({
      influencers: [],
      rosterOrder: [],
      folders: [],
      activeInfluencerId: null,
      activeView: "profile",
      activeGeneration: null,
      pipeline: null,

      // ── Pipeline actions ────────────────────────────────────
      initPipeline: () => set({ pipeline: createEmptyPipeline() }),
      clearPipeline: () => set({ pipeline: null }),

      setActiveStep: (step) =>
        set((state) => {
          if (!state.pipeline) return state;
          return { pipeline: { ...state.pipeline, activeStep: step } };
        }),

      updateStepStatus: (step, status) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (steps as any)[step] = { ...(steps as any)[step], status };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      setStepOptions: (_step, options) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[1] = { ...steps[1], options, status: "selecting" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      selectFace: (face) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[1] = { ...steps[1], selected: face, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 2 } };
        }),

      setReferenceGrid: (grid) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[2] = { ...steps[2], grid, status: "selecting" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      confirmGrid: () =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[2] = { ...steps[2], confirmed: true, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 3 } };
        }),

      setReferenceVideo: (video) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[3] = { ...steps[3], video, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 4 } };
        }),

      setCompositeOptions: (options) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[4] = { ...steps[4], options, status: "selecting" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      selectComposite: (composite) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[4] = { ...steps[4], selected: composite, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 5 } };
        }),

      setAnimationResult: (result) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[5] = { ...steps[5], result, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      goToStep: (step) =>
        set((state) => {
          if (!state.pipeline) return state;
          const current = state.pipeline.activeStep;
          // Going forward: only if current step is confirmed
          if (step > current && state.pipeline.steps[current].status !== "confirmed") {
            return state;
          }
          const steps = { ...state.pipeline.steps };
          // Going backward: reset all downstream steps
          if (step < current) {
            for (let s = step + 1; s <= 5; s++) {
              const k = s as PipelineStep;
              if (k === 1) steps[1] = { status: "empty", options: [], selected: null };
              else if (k === 2) steps[2] = { status: "empty", grid: null, confirmed: false };
              else if (k === 3) steps[3] = { status: "empty", video: null };
              else if (k === 4) steps[4] = { status: "empty", options: [], selected: null };
              else if (k === 5) steps[5] = { status: "empty", result: null, retryCount: 0 };
            }
          }
          return { pipeline: { ...state.pipeline, steps, activeStep: step } };
        }),

      injectAsset: (step, _asset) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          // Mark steps before as confirmed with placeholder data
          for (let s = 1; s < step; s++) {
            const k = s as PipelineStep;
            if (steps[k].status !== "confirmed") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (steps as any)[k] = { ...(steps as any)[k], status: "confirmed" };
            }
          }
          // Reset steps after
          for (let s = step + 1; s <= 5; s++) {
            const k = s as PipelineStep;
            if (k === 1) steps[1] = { status: "empty", options: [], selected: null };
            else if (k === 2) steps[2] = { status: "empty", grid: null, confirmed: false };
            else if (k === 3) steps[3] = { status: "empty", video: null };
            else if (k === 4) steps[4] = { status: "empty", options: [], selected: null };
            else if (k === 5) steps[5] = { status: "empty", result: null, retryCount: 0 };
          }
          return { pipeline: { ...state.pipeline, steps, activeStep: step } };
        }),

      createInfluencer: (id, name, niche) => {
        const hues = [340, 210, 140, 30, 270, 180];
        const hue = hues[Math.floor(Math.random() * hues.length)];
        set((state) => ({
          influencers: [
            ...state.influencers,
            {
              id,
              name,
              niche,
              bio: "",
              avatarGradient: `linear-gradient(135deg, hsl(${hue}, 40%, 70%) 0%, hsl(${hue + 30}, 50%, 60%) 100%)`,
              avatarInitial: name.charAt(0).toUpperCase(),
              referenceImages: [],
              videos: [],
              createdAt: new Date().toISOString(),
            },
          ],
          rosterOrder: [
            ...state.rosterOrder,
            { type: "influencer" as const, id },
          ],
          activeInfluencerId: id,
          activeView: "references",
        }));
      },

      deleteInfluencer: (id) =>
        set((state) => ({
          influencers: state.influencers.filter((i) => i.id !== id),
          rosterOrder: state.rosterOrder.filter(
            (item) => !(item.type === "influencer" && item.id === id)
          ),
          folders: state.folders.map((f) => ({
            ...f,
            influencerIds: f.influencerIds.filter((iid) => iid !== id),
          })),
          activeInfluencerId:
            state.activeInfluencerId === id ? null : state.activeInfluencerId,
        })),

      updateInfluencer: (id, patch) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === id ? { ...i, ...patch } : i
          ),
        })),

      setActiveInfluencer: (id) =>
        set({ activeInfluencerId: id, activeView: "profile", pipeline: null }),

      setActiveView: (view) => set({ activeView: view }),

      // Roster ordering
      reorderRoster: (newOrder) => set({ rosterOrder: newOrder }),

      createFolder: (folderId, name, influencerIds) =>
        set((state) => {
          // Find position of the first influencer being grouped
          const firstIdx = state.rosterOrder.findIndex(
            (item) =>
              item.type === "influencer" && influencerIds.includes(item.id)
          );
          // Remove the influencers from roster order
          const cleaned = state.rosterOrder.filter(
            (item) =>
              !(item.type === "influencer" && influencerIds.includes(item.id))
          );
          // Insert folder at the position of the first influencer
          const insertAt = Math.min(firstIdx, cleaned.length);
          const newOrder = [
            ...cleaned.slice(0, insertAt),
            { type: "folder" as const, folderId },
            ...cleaned.slice(insertAt),
          ];
          return {
            rosterOrder: newOrder,
            folders: [
              ...state.folders,
              { id: folderId, name, influencerIds, expanded: true },
            ],
          };
        }),

      toggleFolder: (folderId) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, expanded: !f.expanded } : f
          ),
        })),

      renameFolder: (folderId, name) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, name } : f
          ),
        })),

      removeFromFolder: (folderId, influencerId) =>
        set((state) => {
          const folder = state.folders.find((f) => f.id === folderId);
          if (!folder) return state;
          const newInfluencerIds = folder.influencerIds.filter(
            (id) => id !== influencerId
          );
          // Find folder position in roster order
          const folderIdx = state.rosterOrder.findIndex(
            (item) => item.type === "folder" && item.folderId === folderId
          );
          const newOrder = [...state.rosterOrder];
          // Insert the influencer after the folder
          newOrder.splice(folderIdx + 1, 0, {
            type: "influencer",
            id: influencerId,
          });
          // If folder has 0-1 items left, dissolve it
          if (newInfluencerIds.length <= 1) {
            const remaining = newInfluencerIds[0];
            const dissolved = newOrder.filter(
              (item) => !(item.type === "folder" && item.folderId === folderId)
            );
            if (remaining) {
              const fIdx = dissolved.findIndex(
                (item) =>
                  item.type === "influencer" && item.id === influencerId
              );
              dissolved.splice(fIdx, 0, {
                type: "influencer",
                id: remaining,
              });
            }
            return {
              rosterOrder: dissolved,
              folders: state.folders.filter((f) => f.id !== folderId),
            };
          }
          return {
            rosterOrder: newOrder,
            folders: state.folders.map((f) =>
              f.id === folderId
                ? { ...f, influencerIds: newInfluencerIds }
                : f
            ),
          };
        }),

      addToFolder: (folderId, influencerId) =>
        set((state) => ({
          rosterOrder: state.rosterOrder.filter(
            (item) => !(item.type === "influencer" && item.id === influencerId)
          ),
          folders: state.folders.map((f) =>
            f.id === folderId
              ? { ...f, influencerIds: [...f.influencerIds, influencerId] }
              : f
          ),
        })),

      deleteFolder: (folderId) =>
        set((state) => {
          const folder = state.folders.find((f) => f.id === folderId);
          if (!folder) return state;
          const folderIdx = state.rosterOrder.findIndex(
            (item) => item.type === "folder" && item.folderId === folderId
          );
          const newOrder = [...state.rosterOrder];
          // Replace folder with its contents
          newOrder.splice(
            folderIdx,
            1,
            ...folder.influencerIds.map((id) => ({
              type: "influencer" as const,
              id,
            }))
          );
          return {
            rosterOrder: newOrder,
            folders: state.folders.filter((f) => f.id !== folderId),
          };
        }),

      addReferenceImage: (influencerId, image) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? { ...i, referenceImages: [...i.referenceImages, image] }
              : i
          ),
        })),

      updateImageStatus: (influencerId, imageId, status, reason, classification) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? {
                  ...i,
                  referenceImages: i.referenceImages.map((img) =>
                    img.id === imageId
                      ? {
                          ...img,
                          status,
                          rejectionReason: reason,
                          ...(classification ?? {}),
                        }
                      : img
                  ),
                }
              : i
          ),
        })),

      removeReferenceImage: (influencerId, imageId) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? {
                  ...i,
                  referenceImages: i.referenceImages.filter(
                    (img) => img.id !== imageId
                  ),
                }
              : i
          ),
        })),

      addVideo: (influencerId, video) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? { ...i, videos: [video, ...i.videos] }
              : i
          ),
        })),

      updateVideo: (influencerId, videoId, patch) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? {
                  ...i,
                  videos: i.videos.map((v) =>
                    v.id === videoId ? { ...v, ...patch } : v
                  ),
                }
              : i
          ),
        })),

      deleteVideo: (influencerId, videoId) =>
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === influencerId
              ? { ...i, videos: i.videos.filter((v) => v.id !== videoId) }
              : i
          ),
        })),

      setActiveGeneration: (gen) => set({ activeGeneration: gen }),
    }),
    {
      name: "persona-store",
      partialize: (state) => ({
        influencers: state.influencers,
        rosterOrder: state.rosterOrder,
        folders: state.folders,
      }),
    }
  )
);
