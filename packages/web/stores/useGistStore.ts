import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Gist, GistProvider } from '@/types/gist';

interface GistState {
  // Provider state
  providers: GistProvider[];
  currentProvider: GistProvider | null;

  // Gist data
  gists: Gist[];
  selectedGist: Gist | null;
  selectedFile: string | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // UI state
  isCreateModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Actions
  setCurrentProvider: (provider: GistProvider | null) => void;
  addProvider: (provider: GistProvider) => void;
  removeProvider: (id: string) => void;
  toggleProvider: (id: string) => void;

  setGists: (gists: Gist[]) => void;
  setSelectedGist: (gist: Gist | null) => void;
  setSelectedFile: (filename: string | null) => void;
  addGist: (gist: Gist) => void;
  updateGistInStore: (id: string, gist: Partial<Gist>) => void;
  removeGistFromStore: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setCreateModalOpen: (open: boolean) => void;
  setDetailModalOpen: (open: boolean) => void;
}

export const useGistStore = create<GistState>()(
  persist(
    (set, get) => ({
      providers: [],
      currentProvider: null,
      gists: [],
      selectedGist: null,
      selectedFile: null,
      isLoading: false,
      error: null,
      isCreateModalOpen: false,
      isDetailModalOpen: false,

      setCurrentProvider: (provider) => set({ currentProvider: provider }),

      addProvider: (provider) => {
        const providers = get().providers;
        if (!providers.find((p) => p.id === provider.id)) {
          set({ providers: [...providers, provider] });
        }
      },

      removeProvider: (id) => {
        const { providers, currentProvider } = get();
        set({
          providers: providers.filter((p) => p.id !== id),
          currentProvider: currentProvider?.id === id ? null : currentProvider,
        });
      },

      toggleProvider: (id) => {
        const { providers } = get();
        set({
          providers: providers.map((p) =>
            p.id === id ? { ...p, enabled: !p.enabled } : p,
          ),
        });
      },

      setGists: (gists) => set({ gists }),
      setSelectedGist: (gist) => set({ selectedGist: gist }),
      setSelectedFile: (filename) => set({ selectedFile: filename }),

      addGist: (gist) => {
        const gists = get().gists;
        set({ gists: [gist, ...gists] });
      },

      updateGistInStore: (id, gistUpdate) => {
        const { gists, selectedGist } = get();
        set({
          gists: gists.map((g) => (g.id === id ? { ...g, ...gistUpdate } : g)),
          selectedGist:
            selectedGist?.id === id
              ? { ...selectedGist, ...gistUpdate }
              : selectedGist,
        });
      },

      removeGistFromStore: (id) => {
        const { gists, selectedGist } = get();
        set({
          gists: gists.filter((g) => g.id !== id),
          selectedGist: selectedGist?.id === id ? null : selectedGist,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
      setDetailModalOpen: (open) => set({ isDetailModalOpen: open }),
    }),
    {
      name: 'gist-storage',
      partialize: (state) => ({
        providers: state.providers,
        currentProvider: state.currentProvider,
      }),
    },
  ),
);
