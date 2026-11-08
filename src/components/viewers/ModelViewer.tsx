import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Component, useState, type ReactNode } from "react";
import { Box, RotateCcw } from "lucide-react";

class WebGLBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="viewer-fallback">
        <Box size={36} />
        <span>3D недоступно в этом браузере</span>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Building({
  x,
  z,
  rotation = 0,
}: {
  x: number;
  z: number;
  rotation?: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh castShadow position={[0, 1.9, 0]}>
        <boxGeometry args={[3.3, 3.6, 1.25]} />
        <meshStandardMaterial color="#c4bbb0" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 3.75, 0]}>
        <boxGeometry args={[3.48, 0.16, 1.4]} />
        <meshStandardMaterial color="#666e71" />
      </mesh>
      {[0, 1, 2, 3, 4].map((row) => (
        <group key={row}>
          <mesh position={[0, 0.65 + row * 0.63, 0.64]}>
            <boxGeometry args={[3.3, 0.05, 0.025]} />
            <meshStandardMaterial color="#8c9995" />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((col) => (
            <group
              key={col}
              position={[-1.35 + col * 0.54, 0.64 + row * 0.63, 0.65]}
            >
              <mesh>
                <boxGeometry args={[0.36, 0.44, 0.045]} />
                <meshStandardMaterial color="#e1ded2" />
              </mesh>
              <mesh position={[0, 0, 0.025]}>
                <boxGeometry args={[0.27, 0.35, 0.02]} />
                <meshStandardMaterial
                  color={(row + col) % 4 === 0 ? "#f7d590" : "#607f86"}
                  emissive={(row + col) % 4 === 0 ? "#c8984d" : "#000000"}
                  emissiveIntensity={0.25}
                />
              </mesh>
              <mesh position={[0, 0, 0.04]}>
                <boxGeometry args={[0.025, 0.35, 0.02]} />
                <meshStandardMaterial color="#d9d7ce" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.38, 0.69]}>
        <boxGeometry args={[0.4, 0.65, 0.08]} />
        <meshStandardMaterial color="#496569" />
      </mesh>
      <mesh castShadow position={[0, 0.77, 0.88]}>
        <boxGeometry args={[0.7, 0.08, 0.55]} />
        <meshStandardMaterial color="#667779" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[1.67, 0.7 + i * 0.8, 0]}>
          <boxGeometry args={[0.02, 0.4, 0.4]} />
          <meshStandardMaterial color="#738e91" />
        </mesh>
      ))}
    </group>
  );
}
function Tree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 1.1, 5]} />
        <meshStandardMaterial color="#80694f" />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#77977e" flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.48, 0]}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#a0b189" flatShading />
      </mesh>
    </group>
  );
}
export default function ModelViewer() {
  const [reset, setReset] = useState(0);
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return (
    <div
      className="model-viewer"
      aria-label="Интерактивная 3D-модель панельного дома"
    >
      <WebGLBoundary>
        <Canvas
          key={reset}
          shadows
          orthographic
          camera={{ position: [7, 6, 8], zoom: 28 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <color attach="background" args={["#a4bab6"]} />
          <ambientLight intensity={1.7} />
          <directionalLight
            castShadow
            position={[4, 8, 4]}
            intensity={3}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={7}
            shadow-camera-bottom={-7}
          />
          <group position={[0, -1.5, 0]}>
            <mesh receiveShadow position={[0, 0, 0]}>
              <boxGeometry args={[6.8, 0.22, 4.7]} />
              <meshStandardMaterial color="#819a86" />
            </mesh>
            <mesh receiveShadow position={[0, 0.12, 1.45]}>
              <boxGeometry args={[6.8, 0.04, 1.15]} />
              <meshStandardMaterial color="#66767a" />
            </mesh>
            <mesh position={[0, 0.15, 0.78]}>
              <boxGeometry args={[6.8, 0.12, 0.2]} />
              <meshStandardMaterial color="#ccd1bf" />
            </mesh>
            {[-2.5, -1.2, 0.1, 1.4, 2.7].map((x) => (
              <mesh
                key={x}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[x, 0.15, 1.45]}
              >
                <planeGeometry args={[0.65, 0.035]} />
                <meshBasicMaterial color="#dce3c6" />
              </mesh>
            ))}
            <Building x={-0.8} z={-0.5} />
            <Building x={1.5} z={-1.15} rotation={-Math.PI / 2} />
            <Tree position={[-2.6, 0.1, 0.35]} scale={0.85} />
            <Tree position={[2.55, 0.1, 0.3]} scale={0.9} />
            <Tree position={[-2.6, 0.1, -1.5]} />
            <mesh castShadow position={[-1.2, 0.29, 1.5]}>
              <boxGeometry args={[0.75, 0.24, 0.36]} />
              <meshStandardMaterial color="#df9b69" />
            </mesh>
            <mesh castShadow position={[-1.16, 0.48, 1.5]}>
              <boxGeometry args={[0.4, 0.19, 0.32]} />
              <meshStandardMaterial color="#bacbc1" />
            </mesh>
          </group>
          <OrbitControls
            makeDefault
            enablePan={false}
            minZoom={22}
            maxZoom={70}
            minPolarAngle={0.3}
            maxPolarAngle={Math.PI / 2.1}
            target={[0, 0.2, 0]}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.35}
          />
        </Canvas>
      </WebGLBoundary>
      <span className="viewer-badge">
        <Box size={12} /> LIVE 3D
      </span>
      <button
        className="icon-btn viewer-action"
        onClick={() => setReset(reset + 1)}
        title="Сбросить ракурс"
        aria-label="Сбросить ракурс"
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
