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
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Ostrich() {
  const ostrich = useGLTF("./nla_ostrich--01_1k-transformed.glb");
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
  const character = useRef();
  const beakBone = useRef();
  const beakBody = useRef();
  const beakCollider = useRef();

  // animation mixer
  let mixer = null;

  // Updated animation state management
  const baseAnimation = useRef("idle-1"); // Track base movement animation
  const isAttacking = useRef(false);
  const currentSpeed = useRef(0);
  const targetSpeed = useRef(0);

  // Movement thresholds
  const ANALOG_STICK_DEADZONE = 0.1;
  const { WALK_THRESHOLD, RUN_THRESHOLD, WALK_SPEED, RUN_SPEED } = useControls(
    "🕹 Ostrich Control",
    {
      WALK_THRESHOLD: { value: 0.4, min: 0.1, max: 0.8, step: 0.1 },
      RUN_THRESHOLD: { value: 0.8, min: 0.6, max: 1, step: 0.1 },
      WALK_SPEED: { value: 0.05, min: 0.01, max: 0.1, step: 0.01 },
      RUN_SPEED: { value: 0.15, min: 0.1, max: 0.2, step: 0.01 },
    }
  );

  useEffect(() => {
    // Set up character controller
    const offsetFromGameWorld = 0.01;
    const char = rapier.world.createCharacterController(offsetFromGameWorld);
    char.setApplyImpulsesToDynamicBodies(true);
    char.enableAutostep(5, 0.1, false);
    char.enableSnapToGround(1);
    controller.current = char;

    // Set up additive animation blending
    setUpAnimations(animations);

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

    mixer = new THREE.AnimationMixer(ostrich);
    mixer.addEventListener("finished", handleAttackFinish);
  }, [rapier, animations, ostrich.scene, mixer]);

  function handleAttackFinish(event) {
    console.log("anim finitio");
    beakBody.current.setEnabled(false);
  }

  function updateMovementAnimation(newAnimation, blendWeight = 1) {
    // Don't transition if we're already in this animation
    if (newAnimation === baseAnimation.current) {
      animations.actions[baseAnimation.current].setEffectiveWeight(blendWeight);
      return;
    }

    // Fade out current base animation
    animations.actions[baseAnimation.current].fadeOut(0.2);

    // Fade in new base animation
    animations.actions[newAnimation].reset();
    animations.actions[newAnimation].fadeIn(0.2);
    animations.actions[newAnimation].setEffectiveWeight(blendWeight);
    animations.actions[newAnimation].play();

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
    const gamepad = navigator.getGamepads()?.[0];

    if (gamepad) {
      // Handle attack
      // const pressedButtons = gamepad.buttons.filter((button) => button.pressed);
      const pressedButtonIndex = gamepad.buttons.findIndex(
        (button) => button.pressed
      );
      handleAttack(pressedButtonIndex);

      if (beakBody.current.enabled) {
        updateBeakCollider();
      }

      // MOVEMENT
      const leftRight = gamepad.axes[0];
      const forwardBack = -gamepad.axes[1];

      // Calculate movement intensity
      const intensity = Math.min(
        1,
        Math.sqrt(leftRight * leftRight + forwardBack * forwardBack)
      );

      // Update movement animation state
      if (intensity <= ANALOG_STICK_DEADZONE) {
        updateMovementAnimation("idle-1");
        targetSpeed.current = 0;
      } else if (intensity <= WALK_THRESHOLD) {
        const walkWeight = (intensity - ANALOG_STICK_DEADZONE) / (WALK_THRESHOLD - ANALOG_STICK_DEADZONE);
        updateMovementAnimation("walk", walkWeight);
        targetSpeed.current = WALK_SPEED * walkWeight;
      } else if (intensity <= RUN_THRESHOLD) {
        const runProgress =
          (intensity - WALK_THRESHOLD) / (RUN_THRESHOLD - WALK_THRESHOLD);
        updateMovementAnimation("run", runProgress);
        targetSpeed.current =
          WALK_SPEED + (RUN_SPEED - WALK_SPEED) * runProgress;
      } else {
        updateMovementAnimation("run");
        const speedMultiplier =
          1 + ((intensity - RUN_THRESHOLD) / (1 - RUN_THRESHOLD)) * 0.2;
        targetSpeed.current = RUN_SPEED * speedMultiplier;
      }

      // Smoothly interpolate current speed to target speed
      currentSpeed.current = THREE.MathUtils.lerp(
        currentSpeed.current,
        targetSpeed.current,
        delta * 5
      );

      if (
        intensity > ANALOG_STICK_DEADZONE &&
        controller.current &&
        body.current &&
        collider.current
      ) {
        try {
          const position = vec3(body.current.translation());
          const movement = vec3();

          // Calculate target angle from stick input
          const targetAngle = Math.atan2(leftRight, -forwardBack);
          const currentRotation = character.current.rotation.y;

          // Calculate difference and normalize to -π to π
          let angleDiff = targetAngle - currentRotation;
          angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;

          // Adjust turn speed based on movement intensity
          const turnThreshold = Math.PI / 4;
          const turnSpeed = 0.1 * Math.min(1, intensity * 1.5);

          if (Math.abs(angleDiff) > turnThreshold) {
            // Large angle difference - focus on turning
            character.current.rotation.y += Math.sign(angleDiff) * turnSpeed;
            movement.z = -forwardBack * 0.2;
            movement.x = leftRight * 0.2;
          } else {
            movement.z = -forwardBack;
            movement.x = leftRight;
            character.current.rotation.y += angleDiff * 0.1;
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
        <primitive object={ostrich.scene} ref={character} />
        {/* <group ref={character}>
          <Character animation={animation} />
        </group> */}
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

function setUpAnimations(animations) {
  const attack1 = animations.actions["attack-1"];
  const attack2 = animations.actions["attack-2"];
  if (attack1 && attack2) {
    // attack1.setEffectiveTimeScale(3);
    // attack2.setEffectiveTimeScale(3);
  }

  // Initialize base animations
  Object.values(animations.actions).forEach((action) => {
    if (action.getClip().name !== "attack-1") {
      action.blendMode = THREE.NormalAnimationBlendMode;
    }
  });

  // Initialize idle animation
  const idleAction = animations.actions["idle-1"];
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
