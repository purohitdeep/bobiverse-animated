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
  selectedBookId: "all-these-worlds",
  selectedChapterScopeId: "book-3-finale",
  focalYear: 2133,
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setSelectedBookId: (selectedBookId) => set({ selectedBookId }),
  setSelectedChapterScopeId: (selectedChapterScopeId) =>
    set({ selectedChapterScopeId }),
  setFocalYear: (focalYear) => set({ focalYear }),
}));
