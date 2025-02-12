import { Physics } from "@react-three/rapier";
import Lights from "./Lights";
import Logo from "./Logo";
import CharacterController from "./CharacterController";
import Level from "./Level";
import { useEffect, useRef } from "react";
import { useGamepadStore } from "./stores/useGamePad";
import Ostrich from "./Ostrich";
import NewOstrich from "./NewOstrich";
import { Perf } from "r3f-perf";
import { useFrame, useThree } from "@react-three/fiber";
import { useGesture } from "@use-gesture/react";
import * as THREE from "three";

const MAX = 1.9;
const MIN = 0.7;

export default function Experience() {
  const { camera } = useThree();
  const targetZoom = useRef(1);
  const currentZoom = useRef(1);
  const zoomLevel = useRef(1);

  // useGesture(
  //   {
  //     onWheel: ({ offset: [, y] }) => {
  //       camera.zoom = Math.exp(-y / 500);
  //       camera.updateProjectionMatrix();
  //     },
  //   },
  //   {
  //     target: document,
  //   }
  // );

  useGesture(
    {
      onWheel: ({ delta: [, dy] }) => {
        // const amount =
        //   zoomLevel.current === 1 ? 250 : zoomLevel.current === 2 ? 200 : 150; // 3
        let z = targetZoom.current;
        z *= Math.exp(-dy / 300);
        if (z < MAX && z > MIN) {
          targetZoom.current *= Math.exp(-dy / 300);
        }
        // zoomLevel.current = (zoomLevel.current + 1) % 3;
      },
    },
    { target: document }
  );

  useFrame(() => {
    // Lerp the zoom
    currentZoom.current = THREE.MathUtils.lerp(
      currentZoom.current,
      targetZoom.current,
      0.1 // adjust this for faster/slower lerp
    );
    camera.zoom = currentZoom.current;
    camera.updateProjectionMatrix();
  });

  useEffect(() => {
    window.addEventListener("gamepadconnected", (event) => {
      const gamepad = event.gamepad;
      // addGamepad(gamepad);
    });
    window.addEventListener("gamepaddisconnected", (event) => {
      const index = event.gamepad.index;
      // removeGamepad(index);
    });
  }, []);

  return (
    <>
      <Perf />
      <color args={["rebeccapurple"]} attach="background" />
      <Lights />
      <Logo />
      <Physics>
        {/* <Ostrich /> */}

        <NewOstrich />
        {/* <CharacterController /> */}
        <Level />
      </Physics>
    </>
  );
}
