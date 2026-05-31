import { create } from "zustand";

interface StarMapState {
  selectedStarId: string;
  focalYear: number;
  setSelectedStarId: (starId: string) => void;
  setFocalYear: (year: number) => void;
}

export const useStarMapStore = create<StarMapState>((set) => ({
  selectedStarId: "sol",
  focalYear: 2133,
  setSelectedStarId: (selectedStarId) => set({ selectedStarId }),
  setFocalYear: (focalYear) => set({ focalYear }),
}));
