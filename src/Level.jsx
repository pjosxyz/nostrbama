import { CuboidCollider, RigidBody } from "@react-three/rapier";

export default function Level() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshBasicMaterial color="orange" />
      </mesh>
      <CuboidCollider 
        args={[25, 0.1, 25]} 
        position={[0, -0.1, 0]}
        restitution={0}
        friction={1}
      />
    </RigidBody>
  );
}