import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  vec3,
} from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const IDLE = 4;
const WALK = 9;
const RUN = 6;
const PECK_ATTACK = 1;
const JUMP_ATTACK = 2;
export default function NewOstrich() {
  // camera positioning
  const [smoothedCameraPosition] = useState(
    () => new THREE.Vector3(10, 20, 10)
  );
  const [smoothedCameraTarget] = useState(() => new THREE.Vector3());

  const ostrich = useGLTF("./nla_ostrich--01_1k.glb");

  const { mixer, actions, names } = useAnimations(
    ostrich.animations,
    ostrich.scene
  );
  const currentAction = useRef(null);

  const rapier = useRapier();
  const [, getKeys] = useKeyboardControls();
  const ostrichRef = useRef();
  const rigidBodyRef = useRef();
  const collider = useRef();
  const charController = useRef();
  const isClicking = useRef(false);

  // SET UP
  useEffect(() => {
    // load animation
    fadeToAction("idle-1");

    // set up rapier character controller
    const offsetFromGameWorld = 0.01;
    const c = rapier.world.createCharacterController(offsetFromGameWorld);
    c.setApplyImpulsesToDynamicBodies(true);
    c.enableAutostep(5, 0.1, false);
    c.enableSnapToGround(1);
    charController.current = c;

    // for pointer controls
    const onPointerDown = (e) => {
      const eventType = e.type;
      let clicking = false;
      if (eventType === "touchstart") {
        if (e.touches.length === 1) {
          clicking = true;
        }
        if (e.touches.length === 2) {
          // need to handle camera zoom ie pinch
        }
      } else {
        // mousedown event
        clicking = true;
      }
      isClicking.current = clicking;
    };

    const onPointerUp = (e) => {
      const eventType = e.type;
      let clicking = true;
      if (eventType === "touchstart") {
        if (e.touches.length === 1) {
          clicking = false;
        }
        if (e.touches.length === 2) {
          // need to handle camera zoom ie pinch
        }
      } else {
        // mousedown event
        clicking = false;
      }
      isClicking.current = clicking;
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("mouseup", onPointerUp);
    // document.addEventListener("wheel");
    // touch
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("touchend", onPointerUp);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("mouseup", onPointerUp);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("touchend", onPointerUp);
      fadeToAction("idle-1", 0.1);
    };
  }, []);

  // Helper function to handle crossfade
  const fadeToAction = (actionName, duration = 0.5) => {
    const nextAction = actions[actionName];
    const current = currentAction.current;

    // Don't crossfade to the action that's already playing
    if (current === nextAction) return;

    if (current) {
      // Fade from current to next
      nextAction.reset().setLoop(THREE.LoopRepeat).play();
      nextAction.crossFadeFrom(current, duration, true);
    } else {
      // No current action, just play the next one
      nextAction.reset().play();
    }

    currentAction.current = nextAction;
  };

  useFrame((state, delta) => {
    const { forward, backward, leftward, rightward } = getKeys();

    if (forward || backward || leftward || rightward || isClicking.current) {
      try {
        fadeToAction("run");

        const position = vec3(rigidBodyRef.current.translation());
        const movement = vec3();

        // Handle keyboard input
        if (getKeys().forward) {
          movement.z -= 0.1; // Moving forward in world space
        }
        if (getKeys().backward) {
          movement.z += 0.1;
        }
        if (getKeys().leftward) {
          movement.x -= 0.1;
        }
        if (getKeys().rightward) {
          movement.x += 0.1;
        }

        // Handle mouse input with isometric transformation
        if (isClicking.current) {
          const pointer = state.pointer;
          const MOVEMENT_SCALE = 0.1;

          // Transform screen coordinates to world coordinates
          // Using 45-degree rotation for isometric view
          movement.x += (+pointer.y + pointer.x) * MOVEMENT_SCALE * 0.707;
          movement.z += (-pointer.y + pointer.x) * MOVEMENT_SCALE * 0.707;
        }

        // Normalize movement vector if it's longer than 1
        if (movement.length() > 1) {
          movement.normalize();
          // movement.multiplyScalar(0.1); // Apply movement speed
          movement.y = -0.5;
        }

        // rotate the ostrich to face movement direction
        if (movement.length() !== 0) {
          const angleToTurnTo = Math.atan2(movement.x, movement.z);
          const characterRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            angleToTurnTo
          );
          ostrichRef.current.quaternion.slerp(characterRotation, 0.1);
        }

        charController.current.computeColliderMovement(
          collider.current,
          movement
        );
        let correctedMovement = charController.current.computedMovement();
        position.add(vec3(correctedMovement));
        rigidBodyRef.current.setNextKinematicTranslation(position);
      } catch (err) {
        console.log(err);
      }
    } else {
      fadeToAction("idle-1", 0.2);
    }

    const ostrichPosition = rigidBodyRef.current.translation();
    cameraLogic(
      state,
      ostrichPosition,
      smoothedCameraTarget,
      smoothedCameraPosition,
      delta
    );
  });
  return (
    <RigidBody
      type="kinematicPosition"
      colliders={false}
      canSleep={false}
      friction={1}
      mass={1}
      linearDamping={10}
      angularDamping={10}
      position={[0, 0, 0]}
      ref={rigidBodyRef}
    >
      <primitive object={ostrich.scene} ref={ostrichRef} />
      <CapsuleCollider args={[1, 0.55]} position={[0, 2, 0]} ref={collider} />
    </RigidBody>
  );
}

function cameraLogic(
  state,
  ostrichPosition,
  smoothedCameraTarget,
  smoothedCameraPosition,
  delta
) {
  const cameraPosition = new THREE.Vector3();
  cameraPosition.copy(ostrichPosition);
  cameraPosition.z += 4.25;
  cameraPosition.y += 7;
  cameraPosition.x -= 4;

  const cameraTarget = new THREE.Vector3();
  cameraTarget.copy(ostrichPosition);
  cameraTarget.y += 0.25;

  smoothedCameraPosition.lerp(cameraPosition, 5 * delta);
  smoothedCameraTarget.lerp(cameraTarget, 5 * delta);

  state.camera.position.copy(smoothedCameraPosition);
  state.camera.lookAt(smoothedCameraTarget);
}
