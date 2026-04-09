import { create } from "zustand";
import { api } from "./api";
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
      1: { status: "empty", video: null },
      2: { status: "empty", options: [], selected: null },
      3: { status: "empty", result: null, retryCount: 0 },
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

  // Pipeline API actions (async, wired to backend)
  startPipelineRun: (influencerId: string, prompt: string, template: string, duration: number, resolution: string) => Promise<{ runId: string; videoId: string } | null>;
  advancePipelineStep: (runId: string, inputs: Record<string, any>) => Promise<any>;
  pollPipelineStatus: (runId: string) => Promise<any>;
  retryPipelineStep: (runId: string) => Promise<any>;
  abandonPipeline: (runId: string) => Promise<void>;
}

export const usePersonaStore = create<PersonaStore>()((set) => ({
      influencers: [],
      rosterOrder: [],
      folders: [],
      activeInfluencerId: null,
      activeView: "profile",
      activeGeneration: null,
      pipeline: null,

      // ── Pipeline actions (3-step: Motion → Composite → Animate) ──
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

      setReferenceVideo: (video) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[1] = { ...steps[1], video, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 2 } };
        }),

      setCompositeOptions: (options) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[2] = { ...steps[2], options, status: "selecting" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      selectComposite: (composite) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[2] = { ...steps[2], selected: composite, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps, activeStep: 3 } };
        }),

      setAnimationResult: (result) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          steps[3] = { ...steps[3], result, status: "confirmed" };
          return { pipeline: { ...state.pipeline, steps } };
        }),

      goToStep: (step) =>
        set((state) => {
          if (!state.pipeline) return state;
          const current = state.pipeline.activeStep;
          if (step > current && state.pipeline.steps[current].status !== "confirmed") {
            return state;
          }
          const steps = { ...state.pipeline.steps };
          if (step < current) {
            for (let s = step + 1; s <= 3; s++) {
              const k = s as PipelineStep;
              if (k === 1) steps[1] = { status: "empty", video: null };
              else if (k === 2) steps[2] = { status: "empty", options: [], selected: null };
              else if (k === 3) steps[3] = { status: "empty", result: null, retryCount: 0 };
            }
          }
          return { pipeline: { ...state.pipeline, steps, activeStep: step } };
        }),

      injectAsset: (step, _asset) =>
        set((state) => {
          if (!state.pipeline) return state;
          const steps = { ...state.pipeline.steps };
          for (let s = 1; s < step; s++) {
            const k = s as PipelineStep;
            if (steps[k].status !== "confirmed") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (steps as any)[k] = { ...(steps as any)[k], status: "confirmed" };
            }
          }
          for (let s = step + 1; s <= 3; s++) {
            const k = s as PipelineStep;
            if (k === 1) steps[1] = { status: "empty", video: null };
            else if (k === 2) steps[2] = { status: "empty", options: [], selected: null };
            else if (k === 3) steps[3] = { status: "empty", result: null, retryCount: 0 };
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
        api.influencers.create(name, niche).catch((err) => {
          console.error("Failed to create influencer on server:", err);
        });
      },

      deleteInfluencer: (id) => {
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
        }));
        api.influencers.delete(id).catch((err) => {
          console.error("Failed to delete influencer on server:", err);
        });
      },

      updateInfluencer: (id, patch) => {
        set((state) => ({
          influencers: state.influencers.map((i) =>
            i.id === id ? { ...i, ...patch } : i
          ),
        }));
        api.influencers.update(id, patch).catch((err) => {
          console.error("Failed to update influencer on server:", err);
        });
      },

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

      // Pipeline API actions
      startPipelineRun: async (influencerId, prompt, template, duration, resolution) => {
        try {
          const result = await api.pipeline.create(influencerId, prompt, template, duration, resolution);
          return result;
        } catch (err) {
          console.error("Failed to start pipeline:", err);
          return null;
        }
      },

      advancePipelineStep: async (runId, inputs) => {
        try {
          return await api.pipeline.advance(runId, inputs);
        } catch (err) {
          console.error("Failed to advance step:", err);
          throw err;
        }
      },

      pollPipelineStatus: async (runId) => {
        try {
          return await api.pipeline.status(runId);
        } catch (err) {
          console.error("Failed to poll pipeline:", err);
          throw err;
        }
      },

      retryPipelineStep: async (runId) => {
        try {
          return await api.pipeline.retry(runId);
        } catch (err) {
          console.error("Failed to retry:", err);
          throw err;
        }
      },

      abandonPipeline: async (runId) => {
        try {
          await api.pipeline.abandon(runId);
          set({ pipeline: null });
        } catch (err) {
          console.error("Failed to abandon pipeline:", err);
        }
      },
    }));
