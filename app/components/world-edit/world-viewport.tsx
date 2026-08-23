"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { useWorldEditorStore } from "@/stores/world-editor";
import { EffectsSSGI } from "../metaverse/render-pipeline";
import { WebGPUCanvas } from "../metaverse/webgpu-canvas";
import { GLBModel } from "../metaverse/glb-model";
import type { WorldProp } from "../../../shared/types/world";

const DEFAULT_ENV = "/assets/place/church.glb";

const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** Bridge the DOM drag handlers (outside Canvas) to the three scene. */
export interface EditorBridge {
  raycast?: (clientX: number, clientY: number) => THREE.Vector3 | null;
  setHover?: (clientX: number, clientY: number) => void;
  clearHover?: () => void;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

// ── Scene content ──────────────────────────────────────────────────────────

function SelectionOutline({
  groupRef,
  contentRef,
  visible,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  contentRef: React.RefObject<THREE.Group | null>;
  visible: boolean;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const worldBox = useMemo(() => new THREE.Box3(), []);
  const localMin = useMemo(() => new THREE.Vector3(), []);
  const localMax = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);
  const size = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const line = lineRef.current;
    const content = contentRef.current;
    const group = groupRef.current;
    if (!line || !content || !group) return;
    if (!visible) {
      line.visible = false;
      return;
    }
    worldBox.setFromObject(content);
    if (worldBox.isEmpty()) {
      line.visible = false;
      return;
    }
    group.worldToLocal(localMin.copy(worldBox.min));
    group.worldToLocal(localMax.copy(worldBox.max));
    center.copy(localMin).add(localMax).multiplyScalar(0.5);
    size.copy(localMax).sub(localMin);
    line.position.copy(center);
    line.scale.copy(size);
    line.visible = true;
  });

  return (
    <lineSegments ref={lineRef} visible={false}>
      <edgesGeometry args={[unitBox]} />
      <lineBasicNodeMaterial color="#0abab5" transparent opacity={0.9} />
    </lineSegments>
  );
}

function PlacedProp({ prop }: { prop: WorldProp }) {
  const groupRef = useRef<THREE.Group>(null);
  const contentRef = useRef<THREE.Group>(null);
  const selected = useWorldEditorStore((s) => s.selectedId === prop.id);
  const selectProp = useWorldEditorStore((s) => s.selectProp);

  return (
    <group
      ref={groupRef}
      position={prop.position}
      rotation={prop.rotation}
      scale={prop.scale}
      onClick={(e) => {
        e.stopPropagation();
        selectProp(prop.id);
      }}
    >
      <Suspense fallback={null}>
        <GLBModel src={prop.url} ref={contentRef} />
      </Suspense>
      <SelectionOutline
        groupRef={groupRef}
        contentRef={contentRef}
        visible={selected}
      />
    </group>
  );
}

function PlacementGhost({
  hoverRef,
  activeRef,
}: {
  hoverRef: React.RefObject<THREE.Vector3 | null>;
  activeRef: React.RefObject<boolean>;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const point = hoverRef.current;
    const active = activeRef.current;
    g.visible = active && !!point;
    if (active && point) g.position.copy(point);
  });

  return (
    <group ref={ref} visible={false}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.45, 0.6, 32]} />
        <meshBasicNodeMaterial
          color="#0abab5"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshBasicNodeMaterial
          color="#0abab5"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GridPlane({ onDeselect }: { onDeselect: () => void }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(150, 170, 190, 0.8)";
    ctx.lineWidth = 1;
    const cells = 16;
    const cell = size / cells;
    for (let i = 0; i <= cells; i++) {
      const p = Math.floor(i * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 60);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, -0.01, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onDeselect();
      }}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicNodeMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}

function EditorScene({ bridge }: { bridge: React.RefObject<EditorBridge> }) {
  const { camera, gl } = useThree();
  const envRef = useRef<THREE.Group>(null);
  const hoverRef = useRef<THREE.Vector3 | null>(null);
  const activeRef = useRef(false);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    [],
  );

  const sceneURL = useWorldEditorStore((s) => s.sceneURL);
  const props = useWorldEditorStore((s) => s.props);
  const selectProp = useWorldEditorStore((s) => s.selectProp);

  useEffect(() => {
    const raycast = (clientX: number, clientY: number) => {
      const el = gl.domElement;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);

      if (envRef.current) {
        const hits = raycaster.intersectObject(envRef.current, true);
        if (hits.length) return hits[0].point.clone();
      }

      const fallback = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, fallback)) return fallback;
      return null;
    };

    bridge.current.raycast = raycast;
    bridge.current.setHover = (clientX, clientY) => {
      activeRef.current = true;
      hoverRef.current = raycast(clientX, clientY);
    };
    bridge.current.clearHover = () => {
      activeRef.current = false;
      hoverRef.current = null;
    };

    return () => {
      bridge.current.raycast = undefined;
      bridge.current.setHover = undefined;
      bridge.current.clearHover = undefined;
    };
  }, [bridge, camera, gl, raycaster, groundPlane]);

  const envUrl = sceneURL ?? DEFAULT_ENV;

  return (
    <>
      <directionalLight
        position={[100, 100, 100]}
        color={"#ffffff"}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-1e-9 - 0.05}
        shadow-normalBias={0.05}
        shadow-radius={3}
        shadow-camera-left={-300}
        shadow-camera-bottom={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-far={1024}
        shadow-camera-near={0.1}
      />

      <Suspense fallback={null}>
        <GLBModel key={envUrl} src={envUrl} ref={envRef} />
      </Suspense>

      {props.map((prop) => (
        <PlacedProp key={prop.id} prop={prop} />
      ))}

      <PlacementGhost hoverRef={hoverRef} activeRef={activeRef} />

      <GridPlane onDeselect={() => selectProp(null)} />
    </>
  );
}

// ── Viewport ───────────────────────────────────────────────────────────────

/**
 * Blender-style 3D viewport, rendered through the same WebGPU / TSL pipeline
 * (EffectsSSGI) as the game world so the editor matches what players see.
 */
export function WorldViewport() {
  const bridge = useRef<EditorBridge>({});
  const endDrag = useWorldEditorStore((s) => s.endDrag);
  const addProp = useWorldEditorStore((s) => s.addProp);
  const hdriUrl = useWorldEditorStore((s) => s.hdriUrl);
  const environmentIntensity = useWorldEditorStore((s) => s.environmentIntensity);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!useWorldEditorStore.getState().dragItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    bridge.current.setHover?.(e.clientX, e.clientY);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    bridge.current.clearHover?.();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const item = useWorldEditorStore.getState().dragItem;
    bridge.current.clearHover?.();
    if (!item) return;

    const point = bridge.current.raycast?.(e.clientX, e.clientY) ?? null;
    if (!point) {
      endDrag();
      return;
    }

    addProp({
      id: crypto.randomUUID(),
      name: item.name,
      url: item.url,
      position: [round(point.x), round(point.y), round(point.z)],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });
    endDrag();
  }

  return (
    <div
      className="absolute inset-0 bg-neutral-950"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <WebGPUCanvas
        camera={{ fov: 50, near: 0.1, far: 500, position: [12, 10, 12] }}
      >
        <EffectsSSGI
          hdriUrl={hdriUrl ?? undefined}
          environmentIntensity={environmentIntensity}
        >
          <Suspense fallback={null}>
            <EditorScene bridge={bridge} />
          </Suspense>
        </EffectsSSGI>
        {/*  */}
        <OrbitControls
          makeDefault
          target={[0, 1.5, 0]}
          object-position={[0, 20, 30]}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI * 0.49}
          minDistance={2}
          maxDistance={80}
        />
      </WebGPUCanvas>
    </div>
  );
}
