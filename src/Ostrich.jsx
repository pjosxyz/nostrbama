import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CylinderCollider,
  CuboidCollider,
  useRapier,
  vec3,
  TrimeshCollider,
} from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGamepadStore } from "./stores/useGamePad";
import { button } from "leva";

export default function Ostrich() {
  const ostrich = useGLTF("./nla_ostrich--01_1k.glb");
  const animations = ostrich.animations;
  const { mixer, actions } = useAnimations(animations, ostrich.scene);
  console.log(actions, mixer);
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
  const beakBone = useRef();
  const beakBody = useRef();
  const beakCollider = useRef();

  // animation mixer

  // Updated animation state management
  const baseAnimation = useRef("idle-1"); // Track base movement animation
  const isAttacking = useRef(false);
  const currentSpeed = useRef(0);
  const targetSpeed = useRef(0);
  const fagRef = useRef(0);

  // Movement thresholds
  const DEADZONE = 0.1;
  const WALK_THRESHOLD = 0.4;
  const RUN_THRESHOLD = 0.8;

  // Speed configurations
  const WALK_SPEED = 0.05;
  const RUN_SPEED = 0.15;

  useEffect(() => {
    // Set up character controller
    const offsetFromGameWorld = 0.01;
    const char = rapier.world.createCharacterController(offsetFromGameWorld);
    char.setApplyImpulsesToDynamicBodies(true);
    char.enableAutostep(5, 0.1, false);
    char.enableSnapToGround(1);
    controller.current = char;

    // Set up additive animation blending
    setUpAnimations(actions);

    // Enable shadows for all meshes
    ostrich.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        if (child.material) {
          child.material.shadowSide = THREE.FrontSide;
        }
      }
    });

    ostrich.scene.traverse((object) => {
      if (object.isBone && object.name.toLowerCase().includes("tongue2")) {
        beakBone.current = object;
      }
    });
  }, [rapier, animations, ostrich.scene, mixer]);

  function handleAttackFinish(event) {
    console.log("anim finitio");
    beakBody.current.setEnabled(false);
  }

  function updateMovementAnimation(newAnimation, blendWeight = 1) {
    // Don't transition if we're already in this animation
    if (newAnimation === baseAnimation.current) {
      actions[baseAnimation.current].setEffectiveWeight(blendWeight);
      return;
    }

    // Fade out current base animation
    actions[baseAnimation.current].fadeOut(0.2);

    // Fade in new base animation
    actions[newAnimation].reset();
    actions[newAnimation].fadeIn(0.2);
    actions[newAnimation].setEffectiveWeight(blendWeight);
    actions[newAnimation].play();

    baseAnimation.current = newAnimation;
  }

  function handleAttack(buttonIndex) {
    if (buttonIndex === 0 || buttonIndex === 2) {
      let attack;
      if (buttonIndex === 0) {
        attack = animations.actions["attack-1"];
      } else {
        attack = animations.actions["attack-2"];
      }
      if (attack.isRunning()) return;
      beakBody.current.setEnabled(true);
      console.log(attack.mixer);
      attack.mixer = mixer;
      console.log(attack.mixer);
      attack.loop = THREE.LoopOnce;
      attack.reset();
      attack.play();
    }
  }

  function updateBeakCollider() {
    if (beakBone.current && beakBody.current) {
      // Get world position of beak bone
      const worldPos = new THREE.Vector3();
      beakBone.current.getWorldPosition(worldPos);

      // Get world quaternion for rotation
      const worldQuat = new THREE.Quaternion();
      beakBone.current.getWorldQuaternion(worldQuat);

      // Update beak rigid body position
      beakBody.current.setNextKinematicTranslation(worldPos);
      beakBody.current.setNextKinematicRotation(worldQuat);
    }
  }

  useFrame((state, delta) => {
    // GAMEPAD
    const gamepad = navigator.getGamepads()?.[0];

    // if (gamepad) {
    //   // Handle attack
    //   // const pressedButtons = gamepad.buttons.filter((button) => button.pressed);
    //   const pressedButtonIndex = gamepad.buttons.findIndex(
    //     (button) => button.pressed
    //   );
    //   handleAttack(pressedButtonIndex);

    //   if (beakBody.current.enabled) {
    //     updateBeakCollider();
    //   }

    //   // MOVEMENT
    //   const leftRight = gamepad.axes[0];
    //   const forwardBack = -gamepad.axes[1];

    //   // Calculate movement intensity
    //   const intensity = Math.min(
    //     1,
    //     Math.sqrt(leftRight * leftRight + forwardBack * forwardBack)
    //   );

    //   // Update movement animation state
    //   if (intensity <= DEADZONE) {
    //     updateMovementAnimation("idle-1");
    //     targetSpeed.current = 0;
    //   } else if (intensity <= WALK_THRESHOLD) {
    //     const walkWeight = (intensity - DEADZONE) / (WALK_THRESHOLD - DEADZONE);
    //     updateMovementAnimation("walk", walkWeight);
    //     targetSpeed.current = WALK_SPEED * walkWeight;
    //   } else if (intensity <= RUN_THRESHOLD) {
    //     const runProgress =
    //       (intensity - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD);
    //     updateMovementAnimation("run", runProgress);
    //     targetSpeed.current =
    //       WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runProgress;
    //   } else {
    //     updateMovementAnimation("run");
    //     const speedMultiplier =
    //       1 + ((intensity - RUN_THRESHOLD) / (1 - RUN_THRESHOLD)) * 0.2;
    //     targetSpeed.current = RUN_SPEED * speedMultiplier;
    //   }

    //   // Smoothly interpolate current speed to target speed
    //   currentSpeed.current = THREE.MathUtils.lerp(
    //     currentSpeed.current,
    //     targetSpeed.current,
    //     delta * 5
    //   );

    //   if (
    //     intensity > DEADZONE &&
    //     controller.current &&
    //     body.current &&
    //     collider.current
    //   ) {
    //     try {
    //       const position = vec3(body.current.translation());
    //       const movement = vec3();

    //       // Calculate target angle from stick input
    //       const targetAngle = Math.atan2(leftRight, -forwardBack);
    //       const currentRotation = ostrichRef.current.rotation.y;

    //       // Calculate difference and normalize to -π to π
    //       let angleDiff = targetAngle - currentRotation;
    //       angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

    //       // Adjust turn speed based on movement intensity
    //       const turnThreshold = Math.PI / 4;
    //       const turnSpeed = 0.1 * Math.min(1, intensity * 1.5);

    //       if (Math.abs(angleDiff) > turnThreshold) {
    //         // Large angle difference - focus on turning
    //         ostrichRef.current.rotation.y += Math.sign(angleDiff) * turnSpeed;
    //         movement.z = -forwardBack * 0.2;
    //         movement.x = leftRight * 0.2;
    //       } else {
    //         movement.z = -forwardBack;
    //         movement.x = leftRight;
    //         ostrichRef.current.rotation.y += angleDiff * 0.1;
    //       }

    //       // Apply movement with current speed
    //       movement.normalize().multiplyScalar(currentSpeed.current);

    //       // Update collider movement
    //       controller.current.computeColliderMovement(
    //         collider.current,
    //         movement
    //       );
    //       let correctedMovement = controller.current.computedMovement();
    //       position.add(vec3(correctedMovement));
    //       body.current.setNextKinematicTranslation(position);
    //     } catch (err) {
    //       console.error("Movement error:", err);
    //     }
    //   }
    // }

    const { forward, backward, leftward, rightward } = getKeys();

    if (forward || backward || leftward || rightward) {
      try {
        const position = vec3(body.current.translation());
        const movement = vec3();

        if (forward) {
          if (
            targetSpeed.current === 0 ||
            targetSpeed.current <= WALK_THRESHOLD
          ) {
            updateMovementAnimation("walk");
            targetSpeed.current += 0.01;
            movement.z += 0.1;
          } else if (
            targetSpeed.current >= WALK_THRESHOLD &&
            targetSpeed.current <= RUN_THRESHOLD
          ) {
            const blendWeight = targetSpeed.current / 0.01;
            updateMovementAnimation("run", blendWeight);
            movement.z += 0.2;
          }
        }
        if (backward) movement.z -= 0.1;
        if (leftward) movement.x -= 0.1;
        if (rightward) movement.x += 0.1;

        // Rotate character based on movement vector
        if (movement.length() !== 0) {
          const angle = Math.atan2(movement.x, movement.z);
          const characterRotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            angle
          );
          ostrichRef.current.quaternion.slerp(characterRotation, 0.1); // character ie ostrich
        }

        // Normalize and scale movement vector and set y component to -1
        movement.normalize().multiplyScalar(0.1);
        movement.y = -0.5;

        // Update collider movement and get new position of rigid body
        controller.current.computeColliderMovement(collider.current, movement);
        let correctedMovement = controller.current.computedMovement();
        position.add(vec3(correctedMovement));
        body.current.setNextKinematicTranslation(position);
      } catch (err) {}
    } else {
      targetSpeed.current = 0;
      updateMovementAnimation("idle-1", 1);
    }

    // Camera logic
    const ostrichPosition = body.current.translation();
    cameraLogic(
      state,
      ostrichPosition,
      smoothedCameraTarget,
      smoothedCameraPosition,
      delta
    );
  });

  return (
    <>
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
        <CylinderCollider
          args={[1, 0.55]}
          position={[0, 0, 0]}
          ref={collider}
        />
      </RigidBody>
      <RigidBody
        type="kinematicPosition"
        ref={beakBody}
        canSleep={false}
        enabled={false}
        colliders={false}
        sensor
      >
        <CuboidCollider
          ref={beakCollider}
          args={[0.1, 0.1, 0.2]} // Adjust size as needed
        />
      </RigidBody>
    </>
  );
}

function setUpAnimations(actions) {
  const attack1 = actions["attack-1"];
  const attack2 = actions["attack-2"];
  if (attack1 && attack2) {
    // attack1.setEffectiveTimeScale(3);
    // attack2.setEffectiveTimeScale(3);
  }

  // Initialize base animations
  Object.values(actions).forEach((action) => {
    if (action.getClip().name !== "attack-1") {
      action.blendMode = THREE.NormalAnimationBlendMode;
    }
  });

  // Initialize idle animation
  const idleAction = actions["idle-1"];
  if (idleAction) {
    idleAction.play();
    idleAction.setEffectiveWeight(1);
  }
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
