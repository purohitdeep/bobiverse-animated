import { create } from "zustand";

interface StarMapState {
  selectedStarId: string;
  selectedBookId: string;
  selectedChapterScopeId: string;
  focalYear: number;
  setSelectedStarId: (starId: string) => void;
  setSelectedBookId: (bookId: string) => void;
  setSelectedChapterScopeId: (scopeId: string) => void;
  setFocalYear: (year: number) => void;
}

export const useStarMapStore = create<StarMapState>((set) => ({
  selectedStarId: "sol",
  // Start at the first curated boundary of the first book so the default
  // view cannot disclose late-story content.
  selectedBookId: "we-are-legion",
  selectedChapterScopeId: "book-1-arrival-epsilon-eridani",
  focalYear: 2134,
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setSelectedBookId: (selectedBookId) => set({ selectedBookId }),
  setSelectedChapterScopeId: (selectedChapterScopeId) =>
    set({ selectedChapterScopeId }),
  setFocalYear: (focalYear) => set({ focalYear }),
}));
