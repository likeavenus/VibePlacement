import { Component, useEffect, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import type { Object3D } from "three";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { loadModel, disposeModel } from "./modelAssets";

class ModelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="viewer-fallback">
        Не удалось отобразить 3D в этом браузере.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function UploadedModel({ file }: { file: File }) {
  const [model, setModel] = useState<Object3D>(),
    [error, setError] = useState(""),
    [reset, setReset] = useState(0);
  useEffect(() => {
    let active = true,
      resource: Object3D | undefined;
    setModel(undefined);
    setError("");
    loadModel(file)
      .then((object) => {
        resource = object;
        if (active) setModel(object);
        else disposeModel(object);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (resource) disposeModel(resource);
    };
  }, [file]);
  if (error)
    return (
      <div className="viewer-fallback" role="alert">
        {error}
      </div>
    );
  if (!model)
    return (
      <div className="viewer-fallback">
        <LoaderCircle className="spin" />
      </div>
    );
  return (
    <div className="model-viewer imported-model">
      <ModelBoundary>
        <Canvas
          key={reset}
          camera={{ position: [4, 3, 5], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ preserveDrawingBuffer: true }}
        >
          <color attach="background" args={["#23302e"]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <directionalLight position={[-5, 2, -3]} intensity={0.5} />
          <Bounds fit clip observe margin={1.5} maxDuration={0}>
            <primitive object={model} dispose={null} />
          </Bounds>
          <OrbitControls makeDefault />
        </Canvas>
      </ModelBoundary>
      <button
        type="button"
        className="icon-btn viewer-action"
        title="Сбросить ракурс"
        aria-label="Сбросить ракурс"
        onClick={() => setReset(reset + 1)}
      >
        <RotateCcw size={18} />
      </button>
    </div>
  );
}
