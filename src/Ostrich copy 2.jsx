import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CylinderCollider,
  CuboidCollider,
  useRapier,
  vec3,
} from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { KinematicCharacterController } from "@dimforge/rapier3d-compat";
import { useGamepadStore } from "./stores/useGamePad";

export default function Ostrich() {
  const ostrich = useGLTF("./nla_ostrich.glb");
  const animations = useAnimations(ostrich.animations, ostrich.scene);
  const [smoothedCameraPosition] = useState(
    () => new THREE.Vector3(10, 20, 10)
  );
  const [smoothedCameraTarget] = useState(() => new THREE.Vector3());

  const [subscribeKeys, getKeys] = useKeyboardControls();

  // https://codesandbox.io/embed/rapier-character-controller-043f02
  const rapier = useRapier();
  const controller = useRef(); /// kinematiccharactercontroller
  const collider = useRef(); // rapier collider
  const body = useRef(); // rapier rigid body
  const ostrichRef = useRef();

  // animation
  const currentAnimation = useRef("idle-1");
  const animationTime = useRef(null);

  const transitionMap = {
    "idle-1": {
      walk: { fadeOut: 0.3, fadeIn: 0.5 }, // Slow rise to walk
      run: { fadeOut: 0.2, fadeIn: 0.5 }, // Even slower rise to run
    },
    walk: {
      "idle-1": { fadeOut: 0.5, fadeIn: 0.3 }, // Quick drop to 'idle-1'
      run: { fadeOut: 0.3, fadeIn: 0.4 }, // Gradual rise to run
    },
    run: {
      "idle-1": { fadeOut: 0.5, fadeIn: 0.2 }, // Very quick drop to idle
      walk: { fadeOut: 0.5, fadeIn: 0.3 }, // Quick drop to walk
    },
  };

  function transitionTo(newAnimation) {
    const current = currentAnimation.current;
    if (newAnimation === current) return;

    const transition = transitionMap[current][newAnimation];
    // Fade out current with its duration
    animations.actions[current].fadeOut(transition.fadeOut);

    // Fade in new with its duration
    animations.actions[newAnimation].reset();
    animations.actions[newAnimation].fadeIn(transition.fadeIn);
    animations.actions[newAnimation].play();

    currentAnimation.current = newAnimation;
  }

  function animateFromIdle() {
    const currentTimeMillis = Date.now();
    if (
      animationTime.current === null &&
      currentAnimation.current === "idle-1"
    ) {
      animationTime.current = Date.now();
      transitionTo("walk");
      return;
    }
    if (animationTime.current && currentAnimation.current === "walk") {
      if (
        (currentTimeMillis - animationTime.current) / 1000 >
        transitionMap[currentAnimation.current]["run"].fadeIn // convert to milliseconds
      ) {
        transitionTo("run");
      }
    }
  }

  function animateFromRun() {
    animationTime.current = null;
    transitionTo("idle-1");
  }

  useEffect(() => {
    // set up character controller
    const offsetFromGameWorld = 0.01;
    const char = rapier.world.createCharacterController(offsetFromGameWorld);
    char.setApplyImpulsesToDynamicBodies(true);
    char.enableAutostep(5, 0.1, false);
    char.enableSnapToGround(1);

    controller.current = char;

    // set up animations
    const idleAction = animations.actions["idle-1"];

    if (idleAction) {
      idleAction.play();
      idleAction.setEffectiveWeight(1);
    }
  }, [rapier, animations]);

  useFrame((state, delta) => {
    const gamepad = navigator.getGamepads()?.[0];

    if (gamepad) {
      const leftRight = gamepad.axes[0];
      const forwardBack = -gamepad.axes[1];
      const deadzone = 0.1;

      // Only move if stick is pushed beyond deadzone
      const movementX = Math.abs(leftRight) > deadzone ? leftRight : 0;
      const movementZ = Math.abs(forwardBack) > deadzone ? forwardBack : 0;

      if (Math.abs(movementX) > 0 || Math.abs(movementZ) > 0) {
        animateFromIdle();

        if (controller.current && body.current && collider.current) {
          try {
            const position = vec3(body.current.translation());
            const movement = vec3();

            // Calculate target angle from stick input
            const targetAngle = Math.atan2(movementX, -movementZ); // Note: Negative movementZ because forward is negative in this space

            // Get current rotation
            const currentRotation = ostrichRef.current.rotation.y;

            // Calculate difference and normalize to -π to π
            let angleDiff = targetAngle - currentRotation;
            angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

            // Define turn parameters
            const turnThreshold = Math.PI / 4; // 45 degrees
            const turnSpeed = 0.1;

            // Set movement based on facing direction
            if (Math.abs(angleDiff) > turnThreshold) {
              // Large angle difference - focus on turning
              ostrichRef.current.rotation.y += Math.sign(angleDiff) * turnSpeed;

              // Reduced movement while turning
              movement.z = -movementZ * 0.2; // Reduced to 20% speed
              movement.x = movementX * 0.2;
            } else {
              // Small enough angle - regular movement
              movement.z = -movementZ;
              movement.x = movementX;

              // Smooth rotation towards target
              ostrichRef.current.rotation.y += angleDiff * 0.1;
            }

            // Apply movement
            movement.normalize().multiplyScalar(0.1);

            // Update collider movement and get new position of rigid body
            controller.current.computeColliderMovement(
              collider.current,
              movement
            );
            let correctedMovement = controller.current.computedMovement();
            position.add(vec3(correctedMovement));
            body.current.setNextKinematicTranslation(position);
          } catch (err) {
            console.error("Movement error:", err);
          }
        }
      } else {
        animateFromRun();
      }
    }

    // CAMERA LOGIC
    const ostrichPosition = body.current.translation();

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
  });

  return (
    <RigidBody
      type="kinematicPosition"
      ref={body}
      canSleep={false}
      colliders={false}
      friction={1}
      linearDamping={10} // Reduced from 10
      angularDamping={10} // Reduced from 10
      position={[0, 1, 0]} // Lower starting position
      mass={1}
    >
      <primitive object={ostrich.scene} ref={ostrichRef} />
      <CylinderCollider
        args={[1, 0.3]} // Increased height (2 units total)
        position={[0, 1, 0]} // Match RigidBody position
        ref={collider}
      />
    </RigidBody>
  );
}
