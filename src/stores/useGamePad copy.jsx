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
  update: () => {
    const gp = get().gamepad;
    if (!gp || !gp.buttons) return;

    const currentStatus = [...get().buttonsStatus];
    const newButtonsStatus = new Array(gp.buttons.length);
    const pressedButtons = [];

    gp.buttons.forEach((button, index) => {
      newButtonsStatus[index] = button.pressed;
      if (button.pressed) {
        pressedButtons.push(get().buttons[index]);
      }
    });

    // Update both cache and current status in one set operation
    set({
      buttonsCache: currentStatus, // Previous state becomes cache
      buttonsStatus: newButtonsStatus, // New state becomes current
    });

    return pressedButtons;
  },
  // update: () => {
  //   // https://developer.mozilla.org/en-US/docs/Games/Techniques/Controls_Gamepad_API#querying_the_gamepad_object
  //   if (!get().gamepad) return;
  //   // clear the cache
  //   set((state) => ({ buttonsCache: [] }));

  //   const newButtonsStatus = [...get().buttonsStatus];
  //   const newButtonsCache = []
  //   for (let i = 0; i < newButtonsStatus.length; i++) {
  //     set((state) => (newButtonsCache[i] = newButtonsStatus[i]));
  //   }

  //   set((state) => ({ buttonsStatus: [] }));

  //   const gp = get().gamepad || {};
  //   console.log('made it!')

  //   const pressed = [];
  //   if (gp.buttons) {
  //     ({ gamepad })
  //     for (let i = 0; i < gp.buttons.length; i++) {
  //       if (gp.buttons[i].pressed) {
  //         pressed.push(get().buttons[i]);
  //         console.log('pressed', )
  //       }
  //     }
  //   }
  //   console.log('pressed', pressed);

  //   const axes = [];
  //   if (gp.axes) {
  //     for (let i = 0; i < gp.axes.length; i++) {
  //       axes.push(gp.axes[i].toFixed(2));
  //     }
  //   }

  //   set((state) => ({ axesStatus: axes }));
  //   set((state) => ({ buttonsStatus: pressed }));
  // },
}));

/**
 *  update: () => {
    const gamepad = get().gamepad;
    if (!gamepad.buttons) return;
    // clear the cache
    
    set((state) => ({ buttonsCache: [...state.buttons] }));
    const buttons = Array.from(gamepad.buttons, button => button.pressed);
    const axes = Array.from(gamepad.axes);

    set((state) => ({
      buttons,
      axesStatus: axes,
      buttonsState: buttons
    }));
  },
 */
