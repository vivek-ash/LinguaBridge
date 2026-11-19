import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import type { GlossToken } from '@/types';

/* ─── TYPES ──────────────────────────────────────────────────────────────── */
interface AvatarProps {
  currentGloss: GlossToken | null;
  isPlaying: boolean;
  speed: number;
  bgColor: string;
  size: 'small' | 'medium' | 'large' | 'fullscreen';
  showGloss?: boolean;
}

type Vec3 = [number, number, number];

interface TargetPose {
  leftUpperArm: Vec3;
  leftLowerArm: Vec3;
  leftHand: Vec3;
  rightUpperArm: Vec3;
  rightLowerArm: Vec3;
  rightHand: Vec3;
}

const REST_POSE: TargetPose = {
  leftUpperArm: [0, 0, 0.3],
  leftLowerArm: [-0.4, 0, 0],
  leftHand: [0, 0, 0],
  rightUpperArm: [0, 0, -0.3],
  rightLowerArm: [-0.4, 0, 0],
  rightHand: [0, 0, 0],
};

const SIZE_MAP = { small: 280, medium: 380, large: 480, fullscreen: 620 };

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function lerpAngle(current: number, target: number, t: number): number {
  return current + (target - current) * Math.min(t, 1);
}

function lerpEuler(ref: THREE.Object3D, target: Vec3, t: number) {
  ref.rotation.x = lerpAngle(ref.rotation.x, target[0], t);
  ref.rotation.y = lerpAngle(ref.rotation.y, target[1], t);
  ref.rotation.z = lerpAngle(ref.rotation.z, target[2], t);
}

/* ─── FINGER ─────────────────────────────────────────────────────────────── */
function Finger({ position, rotation, length = 0.055, mat }: {
  position: Vec3;
  rotation?: Vec3;
  length?: number;
  mat: THREE.Material;
}) {
  const segLen = length / 3;
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {[0, 1, 2].map(i => (
        <group key={i} position={[0, -(segLen * 0.5 + segLen * i), 0]}>
          <mesh>
            <capsuleGeometry args={[0.009, segLen * 0.65, 6, 8]} />
            <primitive object={mat} attach="material" />
          </mesh>
          {/* Joint dot */}
          {i < 2 && (
            <mesh position={[0, -segLen * 0.35, 0]}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <primitive object={mat} attach="material" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ─── HAND WITH FINGERS ──────────────────────────────────────────────────── */
function HandWithFingers({ side, mat }: { side: 'left' | 'right'; mat: THREE.Material }) {
  const s = side === 'left' ? 1 : -1;
  return (
    <group>
      {/* Palm */}
      <mesh>
        <boxGeometry args={[0.07, 0.05, 0.03]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Wrist connection */}
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {/* Thumb */}
      <Finger position={[s * 0.038, -0.005, 0.008]} rotation={[0, 0, s * 0.5]} length={0.04} mat={mat} />
      {/* Index */}
      <Finger position={[s * 0.022, -0.035, 0]} length={0.055} mat={mat} />
      {/* Middle */}
      <Finger position={[s * 0.007, -0.035, 0]} length={0.06} mat={mat} />
      {/* Ring */}
      <Finger position={[s * -0.008, -0.035, 0]} length={0.053} mat={mat} />
      {/* Pinky */}
      <Finger position={[s * -0.024, -0.035, 0]} length={0.042} mat={mat} />
    </group>
  );
}

/* ─── INDIAN HUMAN AVATAR ────────────────────────────────────────────────── */
function IndianHumanBody({ currentGloss, isPlaying, speed }: {
  currentGloss: GlossToken | null;
  isPlaying: boolean;
  speed: number;
}) {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const leftLowerArmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const rightLowerArmRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftBrowRef = useRef<THREE.Mesh>(null);
  const rightBrowRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Group>(null);

  // Indian skin tone materials
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c68642',
    roughness: 0.55,
    metalness: 0.02,
  }), []);

  const skinDarkerMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#b5733a',
    roughness: 0.6,
    metalness: 0.02,
  }), []);

  // Black hair
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    roughness: 0.9,
    metalness: 0.1,
  }), []);

  // Traditional kurta-style top (deep blue/purple)
  const kurtaMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a4e',
    roughness: 0.7,
    metalness: 0.05,
  }), []);

  // Kurta border/collar accent (gold)
  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c4a35a',
    roughness: 0.4,
    metalness: 0.3,
  }), []);

  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f5f0e8',
    roughness: 0.3,
  }), []);

  const eyeDarkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a0f00',
    roughness: 0.2,
    metalness: 0.1,
  }), []);

  const lipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#a05050',
    roughness: 0.5,
  }), []);

  const browMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    roughness: 0.9,
  }), []);

  // Target pose tracking
  const targetPose = useRef<TargetPose>({ ...REST_POSE });
  const targetFacial = useRef<string>('neutral');
  const targetHeadTilt = useRef<string>('none');
  const targetBodyLean = useRef<string>('none');

  useEffect(() => {
    if (!currentGloss?.animation_data?.bone_rotations) {
      targetPose.current = { ...REST_POSE };
      targetFacial.current = 'neutral';
      targetHeadTilt.current = 'none';
      targetBodyLean.current = 'none';
      return;
    }
    const br = currentGloss.animation_data.bone_rotations;
    targetPose.current = {
      leftUpperArm: br.left_upper_arm || REST_POSE.leftUpperArm,
      leftLowerArm: br.left_lower_arm || REST_POSE.leftLowerArm,
      leftHand: br.left_hand || REST_POSE.leftHand,
      rightUpperArm: br.right_upper_arm || REST_POSE.rightUpperArm,
      rightLowerArm: br.right_lower_arm || REST_POSE.rightLowerArm,
      rightHand: br.right_hand || REST_POSE.rightHand,
    };
    targetFacial.current = currentGloss.animation_data.facial_expression || 'neutral';
    targetHeadTilt.current = currentGloss.animation_data.head_tilt || 'none';
    targetBodyLean.current = currentGloss.animation_data.body_lean || 'none';
  }, [currentGloss]);

  useFrame((_, delta) => {
    const t = delta * 5 * speed;
    const time = performance.now() * 0.001;

    // Subtle breathing
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(time * 1.0) * 0.004;
    }

    // Body lean
    if (torsoRef.current) {
      let leanTarget: Vec3 = [0, 0, 0];
      if (targetBodyLean.current === 'forward') leanTarget = [0.08, 0, 0];
      else if (targetBodyLean.current === 'back') leanTarget = [-0.05, 0, 0];
      lerpEuler(torsoRef.current, leanTarget, t * 0.5);
    }

    // Arms
    if (leftUpperArmRef.current) lerpEuler(leftUpperArmRef.current, targetPose.current.leftUpperArm, t);
    if (leftLowerArmRef.current) lerpEuler(leftLowerArmRef.current, targetPose.current.leftLowerArm, t);
    if (leftHandRef.current) lerpEuler(leftHandRef.current, targetPose.current.leftHand, t);
    if (rightUpperArmRef.current) lerpEuler(rightUpperArmRef.current, targetPose.current.rightUpperArm, t);
    if (rightLowerArmRef.current) lerpEuler(rightLowerArmRef.current, targetPose.current.rightLowerArm, t);
    if (rightHandRef.current) lerpEuler(rightHandRef.current, targetPose.current.rightHand, t);

    // Head
    if (headRef.current) {
      let headTarget: Vec3 = [Math.sin(time * 0.4) * 0.015, Math.sin(time * 0.25) * 0.02, 0];
      const ht = targetHeadTilt.current;
      if (ht === 'nod') headTarget = [Math.sin(time * 3) * 0.08, 0, 0];
      else if (ht === 'shake') headTarget = [0, Math.sin(time * 4) * 0.1, 0];
      else if (ht === 'tilt_right') headTarget = [0, 0, -0.08];
      else if (ht === 'tilt_left') headTarget = [0, 0, 0.08];
      lerpEuler(headRef.current, headTarget, t);
    }

    // Facial - mouth
    if (mouthRef.current) {
      const f = targetFacial.current;
      let sx = 1, sy = 1;
      if (f === 'smile') { sx = 1.4; sy = 0.5; }
      else if (f === 'surprise') { sx = 0.7; sy = 1.6; }
      else if (f === 'question') { sx = 0.85; sy = 1.3; }
      else if (f === 'concern') { sx = 0.9; sy = 0.8; }
      mouthRef.current.scale.x = lerpAngle(mouthRef.current.scale.x, sx, t);
      mouthRef.current.scale.y = lerpAngle(mouthRef.current.scale.y, sy, t);
    }

    // Eyebrows
    if (leftBrowRef.current && rightBrowRef.current) {
      const f = targetFacial.current;
      let browY = 0;
      if (f === 'surprise' || f === 'question') browY = 0.012;
      else if (f === 'concern') browY = -0.008;
      const baseY = 0.065;
      leftBrowRef.current.position.y = lerpAngle(leftBrowRef.current.position.y, baseY + browY, t);
      rightBrowRef.current.position.y = lerpAngle(rightBrowRef.current.position.y, baseY + browY, t);
    }
  });

  return (
    <group ref={bodyRef}>
      <group ref={torsoRef}>
        {/* ── HEAD ─────────────────────── */}
        <group ref={headRef} position={[0, 1.62, 0]}>
          {/* Skull - slightly oval */}
          <mesh>
            <sphereGeometry args={[0.2, 28, 28]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Jaw area - makes face less round */}
          <mesh position={[0, -0.08, 0.04]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Hair - thick black Indian hair */}
          <mesh position={[0, 0.06, -0.01]}>
            <sphereGeometry args={[0.205, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          {/* Side hair */}
          <mesh position={[-0.16, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.12, 0.1]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          <mesh position={[0.16, 0.02, 0]}>
            <boxGeometry args={[0.06, 0.12, 0.1]} />
            <primitive object={hairMat} attach="material" />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.065, 0.03, 0.175]}>
            <sphereGeometry args={[0.022, 14, 14]} />
            <primitive object={eyeWhiteMat} attach="material" />
          </mesh>
          <mesh position={[0.065, 0.03, 0.175]}>
            <sphereGeometry args={[0.022, 14, 14]} />
            <primitive object={eyeWhiteMat} attach="material" />
          </mesh>
          {/* Iris - dark brown */}
          <mesh position={[-0.065, 0.03, 0.196]}>
            <sphereGeometry args={[0.012, 10, 10]} />
            <primitive object={eyeDarkMat} attach="material" />
          </mesh>
          <mesh position={[0.065, 0.03, 0.196]}>
            <sphereGeometry args={[0.012, 10, 10]} />
            <primitive object={eyeDarkMat} attach="material" />
          </mesh>
          {/* Pupils */}
          <mesh position={[-0.065, 0.03, 0.207]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>
          <mesh position={[0.065, 0.03, 0.207]}>
            <sphereGeometry args={[0.006, 8, 8]} />
            <meshStandardMaterial color="#000000" />
          </mesh>

          {/* Eyebrows - thick Indian brows */}
          <mesh ref={leftBrowRef} position={[-0.065, 0.065, 0.18]}>
            <boxGeometry args={[0.055, 0.012, 0.012]} />
            <primitive object={browMat} attach="material" />
          </mesh>
          <mesh ref={rightBrowRef} position={[0.065, 0.065, 0.18]}>
            <boxGeometry args={[0.055, 0.012, 0.012]} />
            <primitive object={browMat} attach="material" />
          </mesh>

          {/* Nose - Indian-style, slightly broader */}
          <mesh position={[0, -0.01, 0.19]}>
            <sphereGeometry args={[0.025, 10, 10]} />
            <primitive object={skinDarkerMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.025, 0.185]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <primitive object={skinDarkerMat} attach="material" />
          </mesh>

          {/* Mouth */}
          <mesh ref={mouthRef} position={[0, -0.065, 0.17]}>
            <boxGeometry args={[0.05, 0.012, 0.008]} />
            <primitive object={lipMat} attach="material" />
          </mesh>

          {/* Ears */}
          <mesh position={[-0.2, 0, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <primitive object={skinDarkerMat} attach="material" />
          </mesh>
          <mesh position={[0.2, 0, 0]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <primitive object={skinDarkerMat} attach="material" />
          </mesh>

          {/* Bindi / Tilak mark (subtle cultural indicator) */}
          <mesh position={[0, 0.06, 0.2]}>
            <circleGeometry args={[0.008, 12]} />
            <meshStandardMaterial color="#cc3333" />
          </mesh>
        </group>

        {/* ── NECK ─────────────────────── */}
        <mesh position={[0, 1.38, 0]}>
          <cylinderGeometry args={[0.055, 0.065, 0.1, 14]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* ── TORSO (Kurta-style top) ──── */}
        <mesh position={[0, 1.05, 0]}>
          <capsuleGeometry args={[0.19, 0.5, 8, 18]} />
          <primitive object={kurtaMat} attach="material" />
        </mesh>
        {/* Collar / neckline accent */}
        <mesh position={[0, 1.3, 0.1]}>
          <torusGeometry args={[0.07, 0.008, 8, 16, Math.PI]} />
          <primitive object={accentMat} attach="material" />
        </mesh>
        {/* Center line detail */}
        <mesh position={[0, 1.05, 0.185]}>
          <boxGeometry args={[0.015, 0.35, 0.005]} />
          <primitive object={accentMat} attach="material" />
        </mesh>

        {/* ── LEFT ARM ─────────────────── */}
        <group ref={leftUpperArmRef} position={[-0.3, 1.25, 0]}>
          <mesh>
            <sphereGeometry args={[0.05, 14, 14]} />
            <primitive object={kurtaMat} attach="material" />
          </mesh>
          <mesh position={[-0.01, -0.13, 0]}>
            <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
            <primitive object={kurtaMat} attach="material" />
          </mesh>
          <group ref={leftLowerArmRef} position={[-0.01, -0.28, 0]}>
            <mesh>
              <sphereGeometry args={[0.035, 10, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <capsuleGeometry args={[0.03, 0.16, 6, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <group ref={leftHandRef} position={[0, -0.25, 0]}>
              <HandWithFingers side="left" mat={skinMat} />
            </group>
          </group>
        </group>

        {/* ── RIGHT ARM ────────────────── */}
        <group ref={rightUpperArmRef} position={[0.3, 1.25, 0]}>
          <mesh>
            <sphereGeometry args={[0.05, 14, 14]} />
            <primitive object={kurtaMat} attach="material" />
          </mesh>
          <mesh position={[0.01, -0.13, 0]}>
            <capsuleGeometry args={[0.038, 0.18, 6, 12]} />
            <primitive object={kurtaMat} attach="material" />
          </mesh>
          <group ref={rightLowerArmRef} position={[0.01, -0.28, 0]}>
            <mesh>
              <sphereGeometry args={[0.035, 10, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <capsuleGeometry args={[0.03, 0.16, 6, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            <group ref={rightHandRef} position={[0, -0.25, 0]}>
              <HandWithFingers side="right" mat={skinMat} />
            </group>
          </group>
        </group>

        {/* ── LOWER BODY ───────────────── */}
        <mesh position={[0, 0.6, 0]}>
          <capsuleGeometry args={[0.17, 0.2, 8, 14]} />
          <primitive object={kurtaMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

/* ─── MAIN AVATAR COMPONENT ──────────────────────────────────────────────── */
export default function SignLanguageAvatar({
  currentGloss,
  isPlaying,
  speed,
  bgColor,
  size,
  showGloss = true,
}: AvatarProps) {
  const height = SIZE_MAP[size];

  return (
    <div
      className={cn('relative rounded-xl overflow-hidden border border-white/[0.06]')}
      style={{ height, background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor}ee 50%, ${bgColor}cc 100%)` }}
    >
      <Canvas
        camera={{ position: [0, 1.15, 2.0], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Professional studio lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1.0} castShadow color="#fff5e6" />
        <directionalLight position={[-2, 3, 1]} intensity={0.4} color="#c4b5fd" />
        <pointLight position={[0, 2, 4]} intensity={0.3} color="#e0e7ff" />
        <pointLight position={[-1, 1, 2]} intensity={0.15} color="#fbbf24" />

        <IndianHumanBody currentGloss={currentGloss} isPlaying={isPlaying} speed={speed} />

        {/* Floor shadow circle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
          <circleGeometry args={[0.4, 32]} />
          <meshStandardMaterial color="#111122" transparent opacity={0.4} />
        </mesh>
      </Canvas>

      {/* Sign label overlay */}
      {showGloss && currentGloss && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl bg-black/70 backdrop-blur-sm border border-white/[0.1]">
          <p className="text-sm font-mono text-purple-300 tracking-wider text-center font-semibold">
            {currentGloss.gloss}
          </p>
          <p className="text-[10px] text-gray-500 text-center mt-0.5">
            {currentGloss.type === 'fingerspell' ? '🤟 Fingerspelling' : '✋ Sign'}
          </p>
        </div>
      )}

      {/* "AI Avatar" badge */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-purple-500/15 border border-purple-500/20">
        <span className="text-[10px] text-purple-300 font-medium">🧑‍💻 AI Sign Interpreter</span>
      </div>
    </div>
  );
}
