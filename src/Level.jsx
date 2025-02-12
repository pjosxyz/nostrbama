import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

function RefCubes() {
  const cubes = useMemo(() => {
    const cubeData = [];
    const gridSize = 5; // Space between cubes
    const extent = 20; // How far out to place cubes

    for (let x = -extent; x <= extent; x += gridSize) {
      for (let z = -extent; z <= extent; z += gridSize) {
        // Skip center area to leave space for ostrich start position
        if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;

        // Random height between 0.2 and 0.4
        const height = 0.2 + Math.random() * 0.2;

        cubeData.push({
          position: [x, height / 2, z],
          scale: [0.2, height, 0.2],
          rotation: [0, Math.random() * Math.PI * 2, 0],
        });
      }
    }
    return cubeData;
  }, []);

  return (
    <group>
      {cubes.map((cube, index) => (
        <mesh
          key={index}
          position={cube.position}
          scale={cube.scale}
          rotation={cube.rotation}
          castShadow
        >
          <boxGeometry />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}
    </group>
  );
}

export default function Level() {
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#FFB833" />{" "}
          {/* Slightly darker orange for better contrast */}
        </mesh>
        <CuboidCollider
          args={[25, 0.1, 25]}
          position={[0, -0.1, 0]}
          restitution={0}
          friction={1}
        />
      </RigidBody>
      <RefCubes />
      {/* <RigidBody type="dynamic" colliders="cuboid">
        <mesh receiveShadow>
          <boxGeometry args={[2, 2, 2]} position={[0, 1, 0]} />
          <meshStandardMaterial color={'orangered'} />
        </mesh>
      </RigidBody> */}
    </>
  );
}
