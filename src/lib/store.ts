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
} from "./types";

interface ActiveGeneration {
  influencerId: string;
  status: VideoStatus;
  progress: number;
  stageLabel: string;
}

interface PersonaStore {
  influencers: Influencer[];
  rosterOrder: RosterItem[];
  folders: RosterFolder[];
  activeInfluencerId: string | null;
  activeView: WorkspaceView;
  activeGeneration: ActiveGeneration | null;

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
        set({ activeInfluencerId: id, activeView: "profile" }),

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
