import { useRef } from "react";

export default function Lights() {
  const light = useRef();

  return (
    <>
      <directionalLight
        ref={light}
        castShadow
        position={[4, 4, 1]}
        intensity={4.5}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={50} // Increased to match plane size
        shadow-camera-top={25} // Half of plane size
        shadow-camera-right={25} // Half of plane size
        shadow-camera-bottom={-25}
        shadow-camera-left={-25}
      />
      <ambientLight intensity={1.5} />
    </>
  );
}
