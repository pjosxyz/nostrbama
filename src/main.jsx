import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Experience from "./Experience";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import Controls from "./Controls";
import { KeyboardControls } from "@react-three/drei";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "KeyW"] },
        { name: "backward", keys: ["ArrowDown", "KeyS"] },
        { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
        { name: "rightward", keys: ["ArrowRight", "KeyD"] },
        { name: "jump", keys: ["Space"] },
      ]}
    >
      <Leva collapsed />
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 200, position: [2.5, 4, 6] }}
      >
        <Controls />
        <Experience />
      </Canvas>
    </KeyboardControls>
  </StrictMode>
);
