import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useEffect } from "react";

export default function Logo() {
  const logo = useGLTF("./LOGO_TIDY_2.glb");

  useEffect(() => {
    logo.scene.traverse((child) => {
      if (child.isMesh) {
        const material = new THREE.MeshPhongMaterial({
          color: child.material.color || 0xFF8555,
        });
        material.flatShading = true;
        child.material = material;
      }
    });
  }, [logo]);

  return <primitive object={logo.scene} position={[-3, 3, 0]} />;
}
