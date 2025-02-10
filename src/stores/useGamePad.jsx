import { create } from "zustand";

export const useGamepadStore = create((set, get) => ({
  gamepad: {},
  buttons: [],
  buttonsCache: [],
  buttonsState: [],
  buttonsStatus: [],
  axesStatus: [],
  addGamepad: (gamepad) =>
    set(() => {
      console.log(gamepad);
      return { gamepad };
    }),
  removeGamepad: (index) => set(() => ({ gamepad: {} })),
}));
