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
  const rapier = useRapier();
  const controller = useRef();
  const collider = useRef();
  const body = useRef();
  const ostrichRef = useRef();

  // Animation state
  const currentAnimation = useRef("idle-1");
  const currentSpeed = useRef(0);
  const targetSpeed = useRef(0);

  // Movement thresholds
  const DEADZONE = 0.1;
  const WALK_THRESHOLD = 0.4;
  const RUN_THRESHOLD = 0.8;

  // Speed configurations
  const WALK_SPEED = 0.05;
  const RUN_SPEED = 0.15;

  const transitionMap = {
    "idle-1": {
      walk: { fadeOut: 0.3, fadeIn: 0.5 },
      run: { fadeOut: 0.2, fadeIn: 0.5 },
      "attack-1": { fadeOut: 0.5, fadeIn: 0.2 },
    },
    walk: {
      "idle-1": { fadeOut: 0.5, fadeIn: 0.3 },
      run: { fadeOut: 0.3, fadeIn: 0.4 },
      "attack-1": { fadeOut: 0.5, fadeIn: 0.2 },
    },
    run: {
      "idle-1": { fadeOut: 0.5, fadeIn: 0.2 },
      walk: { fadeOut: 0.5, fadeIn: 0.3 },
      "attack-1": { fadeOut: 0.5, fadeIn: 0.2 },
    },
    "attack-1": {
      "idle-1": { fadeOut: 0.5, fadeIn: 0.1 },
      walk: { fadeOut: 0.5, fadeIn: 0.3 },
      run: { fadeOut: 0.3, fadeIn: 0.4 },
    },
  };

  function transitionTo(newAnimation, blendWeight = 1) {
    const current = currentAnimation.current;
    if (newAnimation === current) {
      // Update weight of current animation
      animations.actions[current].setEffectiveWeight(blendWeight);
      return;
    }

    const transition = transitionMap[current][newAnimation];

    // Fade out current animation
    animations.actions[current].fadeOut(transition.fadeOut);

    // Fade in new animation with specified weight
    animations.actions[newAnimation].reset();
    animations.actions[newAnimation].fadeIn(transition.fadeIn);
    animations.actions[newAnimation].setEffectiveWeight(blendWeight);
    animations.actions[newAnimation].play();

    currentAnimation.current = newAnimation;
  }

  function updateMovementState(intensity) {
    // Calculate movement speed based on intensity
    if (intensity <= DEADZONE) {
      transitionTo("idle-1");
      targetSpeed.current = 0;
    } else if (intensity <= WALK_THRESHOLD) {
      // Map intensity to walk animation weight
      const walkWeight = (intensity - DEADZONE) / (WALK_THRESHOLD - DEADZONE);
      transitionTo("walk", walkWeight);
      targetSpeed.current = WALK_SPEED * walkWeight;
    } else if (intensity <= RUN_THRESHOLD) {
      // Blend between walk and run
      const runProgress =
        (intensity - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD);
      transitionTo("run", runProgress);
      targetSpeed.current = WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runProgress;
    } else {
      // Full run
      transitionTo("run");
      const speedMultiplier =
        1 + ((intensity - RUN_THRESHOLD) / (1 - RUN_THRESHOLD)) * 0.2; // Up to 20% faster
      targetSpeed.current = RUN_SPEED * speedMultiplier;
    }
  }

  useEffect(() => {
    // Set up character controller
    const offsetFromGameWorld = 0.01;
    const char = rapier.world.createCharacterController(offsetFromGameWorld);
    char.setApplyImpulsesToDynamicBodies(true);
    char.enableAutostep(5, 0.1, false);
    char.enableSnapToGround(1);
    controller.current = char;

    // Initialize idle animation
    const idleAction = animations.actions["idle-1"];
    animations.actions["attack-1"].setEffectiveTimeScale(5);
    if (idleAction) {
      idleAction.play();
      idleAction.setEffectiveWeight(1);
    }

    // Enable shadows for all meshes in the model
    ostrich.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        // Optionally, also make sure materials are set up for shadows
        if (child.material) {
          child.material.shadowSide = THREE.FrontSide;
        }
      }
    });
  }, [rapier, animations, ostrich.scene]);

  useFrame((state, delta) => {
    const gamepad = navigator.getGamepads()?.[0];

    if (gamepad) {
      // ATTACK
      if (gamepad.buttons[0].pressed) {
        // animations.actions["attack-1"].setEffectiveTimeScale(5);
        transitionTo("attack-1");
      } else {
        transitionTo("idle-1");
      }
      if (gamepad.buttons[2].pressed) {
        animations.actions["attack-2"].play();
      } else {
        animations.actions["attack-2"].stop();
        animations.actions["attack-2"].reset();
      }

      // MOVEMENT
      const leftRight = gamepad.axes[0];
      const forwardBack = -gamepad.axes[1];

      // Calculate overall movement intensity
      const intensity = Math.min(
        1,
        Math.sqrt(leftRight * leftRight + forwardBack * forwardBack)
      );

      updateMovementState(intensity);

      // Smoothly interpolate current speed to target speed
      currentSpeed.current = THREE.MathUtils.lerp(
        currentSpeed.current,
        targetSpeed.current,
        delta * 5
      );

      if (
        intensity > DEADZONE &&
        controller.current &&
        body.current &&
        collider.current
      ) {
        try {
          const position = vec3(body.current.translation());
          const movement = vec3();

          // Calculate target angle from stick input
          const targetAngle = Math.atan2(leftRight, -forwardBack);
          const currentRotation = ostrichRef.current.rotation.y;

          // Calculate difference and normalize to -π to π
          let angleDiff = targetAngle - currentRotation;
          angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

          // Adjust turn speed based on movement intensity
          const turnThreshold = Math.PI / 4;
          const turnSpeed = 0.1 * Math.min(1, intensity * 1.5); // Slower turning at low intensity

          if (Math.abs(angleDiff) > turnThreshold) {
            // Large angle difference - focus on turning
            ostrichRef.current.rotation.y += Math.sign(angleDiff) * turnSpeed;
            movement.z = -forwardBack * 0.2;
            movement.x = leftRight * 0.2;
          } else {
            movement.z = -forwardBack;
            movement.x = leftRight;
            ostrichRef.current.rotation.y += angleDiff * 0.1;
          }

          // Apply movement with current speed
          movement.normalize().multiplyScalar(currentSpeed.current);

          // Update collider movement
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
    }

    // Camera logic remains the same
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
      linearDamping={10}
      angularDamping={10}
      position={[0, 0, 0]}
      mass={1}
    >
      <primitive object={ostrich.scene} ref={ostrichRef} />
      <CylinderCollider args={[1, 0.3]} position={[0, 0, 0]} ref={collider} />
    </RigidBody>
  );
}
