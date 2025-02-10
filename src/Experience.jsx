import { Physics } from "@react-three/rapier";
import Lights from "./Lights";
import Logo from "./Logo";
import Player from "./Player";
import Level from "./Level";
import { useEffect } from "react";
import { useGamepadStore } from "./stores/useGamePad";

export default function Experience() {
  const addGamepad = useGamepadStore((state) => state.addGamepad);
  const removeGamepad = useGamepadStore((state) => state.removeGamepad);

  useEffect(() => {
    window.addEventListener("gamepadconnected", (event) => {
      const gamepad = event.gamepad;
      addGamepad(gamepad);
    });
    window.addEventListener("gamepaddisconnected", (event) => {
      console.log("gamepad disconnected");
      const index = event.gamepad.index;
      removeGamepad(index);
    });
  }, []);

  return (
    <>
      <color args={["rebeccapurple"]} attach="background" />
      <Physics>
        <Lights />
        <Player />
        <Logo />
        <Level />
      </Physics>
    </>
  );
}
