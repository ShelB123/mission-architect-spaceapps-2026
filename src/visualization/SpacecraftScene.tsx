/**
 * WebGL scene for the spacecraft inspection viewer (React Three Fiber).
 *
 * Loaded lazily by SpacecraftViewer. It draws exactly what the visual model
 * describes with parametric primitives: no external models, no image textures,
 * no physics. Camera motion and the schematic separation are presentation
 * transforms only (docs/ARCHITECTURE.md §6).
 *
 * Requires the integrator-provided dependencies `three` and
 * `@react-three/fiber` (v9 line for React 19).
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  FrontSide,
  Mesh,
  PMREMGenerator,
  Spherical,
  Vector3,
} from "three";
import type { BufferGeometry } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { busNodeKey, computeBoundingRadiusM, schematicOffsetM, visualNodeKey } from "./buildSpacecraftVisualModel";
import type { CameraCommand } from "./SpacecraftViewer";
import type { ComponentVisualDefinition, SpacecraftVisualModel, Vec3, VisualFinish, VisualPart } from "./types";

export interface SpacecraftSceneProps {
  readonly model: SpacecraftVisualModel;
  readonly highlightedComponentId?: string;
  readonly schematic: boolean;
  readonly command: CameraCommand;
  readonly reducedMotion: boolean;
  readonly onInspectComponent?: (componentId: string) => void;
  readonly onContextLost?: () => void;
  readonly onContextRestored?: () => void;
}

type Triple = [number, number, number];

const HIGHLIGHT_COLOR = "#ffd166";
const EDGE_COLOR = "#7fd8ee";
const CAMERA_FOV_DEG = 32;
const CAMERA_TARGET: Triple = [0, 0.02, 0];
const DEFAULT_VIEW_DIRECTION = new Vector3(0.58, 0.4, 0.78).normalize();
const MAX_FRAME_DELTA_S = 1 / 30;

const FINISHES: Readonly<Record<VisualFinish, { readonly metalness: number; readonly roughness: number; readonly glow: number; readonly opacity: number }>> = {
  structure: { metalness: 0.45, roughness: 0.55, glow: 0, opacity: 1 },
  metal: { metalness: 0.85, roughness: 0.28, glow: 0, opacity: 1 },
  painted: { metalness: 0.05, roughness: 0.5, glow: 0, opacity: 1 },
  dark: { metalness: 0.4, roughness: 0.45, glow: 0, opacity: 1 },
  foil: { metalness: 0.9, roughness: 0.32, glow: 0.06, opacity: 1 },
  glass: { metalness: 0.2, roughness: 0.05, glow: 0.3, opacity: 0.82 },
  "solar-cell": { metalness: 0.55, roughness: 0.22, glow: 0.08, opacity: 1 },
  cell: { metalness: 0.25, roughness: 0.4, glow: 0.1, opacity: 1 },
  pcb: { metalness: 0.2, roughness: 0.6, glow: 0.05, opacity: 1 },
};

const ignoreRaycast = () => undefined;

function createGeometry(part: VisualPart): BufferGeometry {
  const [x, y, z] = part.dimensionsM;
  switch (part.kind) {
    case "cylinder":
      return new CylinderGeometry(x / 2, x / 2, y, 40);
    case "cone":
      return new ConeGeometry(x / 2, y, 56, 1, true);
    default:
      return new BoxGeometry(x, y, z);
  }
}

/* ---------- One part ---------- */

interface PartMeshProps {
  readonly part: VisualPart;
  readonly offsetM: Vec3;
  readonly separation: number;
  readonly highlighted: boolean;
  readonly hovered: boolean;
  readonly showEdges: boolean;
  readonly seeThrough: boolean;
}

function PartMesh({ part, offsetM, separation, highlighted, hovered, showEdges, seeThrough }: PartMeshProps) {
  const geometry = useMemo(() => createGeometry(part), [part]);
  const edges = useMemo(() => new EdgesGeometry(geometry, 30), [geometry]);
  useEffect(() => () => {
    geometry.dispose();
    edges.dispose();
  }, [geometry, edges]);

  const finish = FINISHES[part.finish ?? "structure"];
  const isSolar = part.finish === "solar-cell" && part.kind === "panel";
  const position: Triple = [
    part.positionM[0] + offsetM[0] * separation,
    part.positionM[1] + offsetM[1] * separation,
    part.positionM[2] + offsetM[2] * separation,
  ];
  const rotation: Triple = [part.rotationRad[0], part.rotationRad[1], part.rotationRad[2]];
  const opacity = seeThrough ? 0.14 : finish.opacity;
  const emissive = highlighted ? HIGHLIGHT_COLOR : hovered ? "#ffffff" : part.colorHex;
  const emissiveIntensity = highlighted ? 0.45 : hovered ? 0.12 : finish.glow;

  return (
    <group position={position} rotation={rotation}>
      <mesh
        geometry={geometry}
        castShadow={!seeThrough}
        receiveShadow={!seeThrough}
        renderOrder={seeThrough ? 2 : 0}
        raycast={seeThrough ? ignoreRaycast : Mesh.prototype.raycast}
      >
        <meshStandardMaterial
          color={isSolar ? "#0b1322" : part.colorHex}
          metalness={finish.metalness}
          roughness={finish.roughness}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={!seeThrough}
          side={part.kind === "cone" ? DoubleSide : FrontSide}
        />
      </mesh>
      {isSolar && <SolarCells part={part} highlighted={highlighted} />}
      {(showEdges || highlighted) && (
        <lineSegments geometry={edges} raycast={ignoreRaycast} renderOrder={3}>
          <lineBasicMaterial color={highlighted ? HIGHLIGHT_COLOR : EDGE_COLOR} transparent opacity={highlighted ? 0.95 : 0.5} />
        </lineSegments>
      )}
    </group>
  );
}

/** Photovoltaic cell grid on the +Z face of a panel, built from geometry instead of a texture. */
function SolarCells({ part, highlighted }: { readonly part: VisualPart; readonly highlighted: boolean }) {
  const [width, height, depth] = part.dimensionsM;
  const columns = Math.max(1, Math.round(width / 0.05));
  const rows = Math.max(1, Math.round(height / 0.07));
  const gap = 0.004;
  const cellWidth = (width - gap * (columns + 1)) / columns;
  const cellHeight = (height - gap * (rows + 1)) / rows;
  const geometry = useMemo(() => new BoxGeometry(cellWidth, cellHeight, 0.0008), [cellWidth, cellHeight]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const cells: Triple[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push([
        -width / 2 + gap + cellWidth / 2 + column * (cellWidth + gap),
        -height / 2 + gap + cellHeight / 2 + row * (cellHeight + gap),
        depth / 2 + 0.0004,
      ]);
    }
  }
  return (
    <>
      {cells.map((position, index) => (
        <mesh key={index} geometry={geometry} position={position} receiveShadow>
          <meshStandardMaterial
            color={part.colorHex}
            metalness={0.6}
            roughness={0.18}
            emissive={highlighted ? HIGHLIGHT_COLOR : part.colorHex}
            emissiveIntensity={highlighted ? 0.14 : 0.12}
          />
        </mesh>
      ))}
    </>
  );
}

/* ---------- Assembly ---------- */

interface AssemblyProps {
  readonly model: SpacecraftVisualModel;
  readonly highlightedComponentId?: string;
  readonly schematic: boolean;
  readonly reducedMotion: boolean;
  readonly onInspectComponent?: (componentId: string) => void;
}

function hasInternalParts(component: ComponentVisualDefinition | undefined): boolean {
  return Boolean(component?.parts.some((part) => part.internal));
}

export function Assembly({ model, highlightedComponentId, schematic, reducedMotion, onInspectComponent }: AssemblyProps) {
  const invalidate = useThree((state) => state.invalidate);
  const canvas = useThree((state) => state.gl.domElement);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const targetSeparation = schematic ? 1 : 0;
  const [separation, setSeparation] = useState(targetSeparation);

  useFrame((_, delta) => {
    if (separation === targetSeparation) return;
    const remaining = targetSeparation - separation;
    const step = reducedMotion ? 1 : Math.min(1, Math.min(delta, MAX_FRAME_DELTA_S) * 9);
    setSeparation(Math.abs(remaining) < 0.01 ? targetSeparation : separation + remaining * step);
    invalidate();
  });

  // The render loop is on demand: request a frame whenever React re-renders the assembly.
  useEffect(() => {
    invalidate();
  });

  useEffect(() => {
    canvas.style.cursor = hoveredId ? "pointer" : "grab";
    return () => {
      canvas.style.cursor = "";
    };
  }, [canvas, hoveredId]);

  const highlightedComponent = model.components.find((component) => component.componentId === highlightedComponentId);
  // Internal hardware (batteries, transceivers) is only visible through a translucent bus.
  const seeThroughBus = schematic || hasInternalParts(highlightedComponent);

  return (
    <group>
      <group
        onClick={(event: ThreeEvent<MouseEvent>) => event.stopPropagation()}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => event.stopPropagation()}
      >
        {model.busParts.map((part) => (
          <PartMesh
            key={busNodeKey(part.partId)}
            part={part}
            offsetM={[0, 0, 0]}
            separation={0}
            highlighted={false}
            hovered={false}
            showEdges={schematic}
            seeThrough={seeThroughBus && (part.finish === "structure" || part.finish === "foil")}
          />
        ))}
      </group>

      {model.components.map((component) => {
        const id = component.componentId;
        return (
          <group
            key={id}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              if (event.delta > 4) return; // The pointer travelled: this was a camera drag, not a click.
              onInspectComponent?.(id);
            }}
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              setHoveredId(id);
            }}
            onPointerOut={() => setHoveredId((current) => (current === id ? null : current))}
          >
            {component.parts.map((part) => (
              <PartMesh
                key={visualNodeKey(id, part.partId)}
                part={part}
                offsetM={schematicOffsetM(component.category, part)}
                separation={separation}
                highlighted={id === highlightedComponentId}
                hovered={id === hoveredId}
                showEdges={schematic}
                seeThrough={false}
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/* ---------- Camera ---------- */

function CameraRig({ boundingRadiusM, command }: { readonly boundingRadiusM: number; readonly command: CameraCommand }) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const controlsRef = useRef<OrbitControls | null>(null);
  const handledSequence = useRef(command.sequence);

  // Distance at which a sphere of the model's bounding radius fits the narrower field of view.
  const halfVertical = (CAMERA_FOV_DEG * Math.PI) / 360;
  const halfNarrow = Math.min(halfVertical, Math.atan(Math.tan(halfVertical) * aspect));
  const fitDistance = Math.round((boundingRadiusM / Math.sin(halfNarrow)) * 0.82 * 100) / 100;
  const minDistance = boundingRadiusM * 0.45;
  const maxDistance = fitDistance * 2.2;

  useEffect(() => {
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.9;
    controls.target.set(...CAMERA_TARGET);
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    controlsRef.current = controls;
    return () => {
      controls.removeEventListener("change", onChange);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, canvas, invalidate]);

  // Frame the model on mount and whenever its extent or the viewport shape changes, keeping the viewing direction.
  useEffect(() => {
    const controls = controlsRef.current;
    const target = new Vector3(...CAMERA_TARGET);
    const offset = camera.position.clone().sub(target);
    if (offset.lengthSq() < 1e-8) offset.copy(DEFAULT_VIEW_DIRECTION);
    camera.position.copy(target).add(offset.setLength(fitDistance));
    camera.lookAt(target);
    if (controls) {
      controls.minDistance = minDistance;
      controls.maxDistance = maxDistance;
      controls.update();
    }
    invalidate();
  }, [camera, fitDistance, minDistance, maxDistance, invalidate]);

  useEffect(() => {
    if (command.sequence === handledSequence.current) return;
    handledSequence.current = command.sequence;
    const target = new Vector3(...CAMERA_TARGET);
    const spherical = new Spherical().setFromVector3(camera.position.clone().sub(target));
    switch (command.kind) {
      case "rotate-left": spherical.theta -= 0.3; break;
      case "rotate-right": spherical.theta += 0.3; break;
      case "rotate-up": spherical.phi -= 0.2; break;
      case "rotate-down": spherical.phi += 0.2; break;
      case "zoom-in": spherical.radius *= 0.85; break;
      case "zoom-out": spherical.radius *= 1.18; break;
      default: spherical.setFromVector3(DEFAULT_VIEW_DIRECTION.clone().multiplyScalar(fitDistance));
    }
    spherical.phi = Math.min(Math.PI - 0.12, Math.max(0.12, spherical.phi));
    spherical.radius = Math.min(maxDistance, Math.max(minDistance, spherical.radius));
    camera.position.copy(target).add(new Vector3().setFromSpherical(spherical));
    camera.lookAt(target);
    controlsRef.current?.update();
    invalidate();
  }, [camera, command, fitDistance, minDistance, maxDistance, invalidate]);

  // On-demand rendering: resizing the drawing buffer (size or pixel ratio) clears it, so draw again
  // immediately and once more after the layout has settled.
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const pixelRatio = useThree((state) => state.viewport.dpr);
  useEffect(() => {
    invalidate();
    const timers = [150, 600].map((delay) => window.setTimeout(() => invalidate(), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [width, height, pixelRatio, invalidate]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}

/* ---------- Environment and context watching ---------- */

/** Procedural studio reflections (no image download) so metallic finishes read as metal. */
function StudioEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let dispose: () => void = () => {};
    try {
      const generator = new PMREMGenerator(gl);
      const room = new RoomEnvironment();
      const target = generator.fromScene(room, 0.04);
      scene.environment = target.texture;
      dispose = () => {
        if (scene.environment === target.texture) scene.environment = null;
        target.dispose();
        generator.dispose();
        room.dispose();
      };
      invalidate();
    } catch {
      // Reflections are cosmetic. Direct lights below are sufficient without them.
    }
    return () => dispose();
  }, [gl, scene, invalidate]);

  return null;
}

function ContextWatcher({ onContextLost, onContextRestored }: Pick<SpacecraftSceneProps, "onContextLost" | "onContextRestored">) {
  const canvas = useThree((state) => state.gl.domElement);

  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault(); // Allows the browser to restore the context later.
      onContextLost?.();
    };
    const handleRestored = () => onContextRestored?.();
    canvas.addEventListener("webglcontextlost", handleLost);
    canvas.addEventListener("webglcontextrestored", handleRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [canvas, onContextLost, onContextRestored]);

  return null;
}

/* ---------- Scene ---------- */

export default function SpacecraftScene({ model, highlightedComponentId, schematic, command, reducedMotion, onInspectComponent, onContextLost, onContextRestored }: SpacecraftSceneProps) {
  const boundingRadiusM = useMemo(() => computeBoundingRadiusM(model), [model]);
  // Only the first mount uses this value; CameraRig reframes afterwards.
  const [initialCamera] = useState(() => {
    const position = DEFAULT_VIEW_DIRECTION.clone().multiplyScalar(boundingRadiusM * 3.8);
    return { fov: CAMERA_FOV_DEG, near: 0.01, far: 30, position: [position.x, position.y + CAMERA_TARGET[1], position.z] as Triple };
  });

  return (
    <Canvas
      className="ma-viewer__canvas"
      shadows="percentage"
      frameloop="demand"
      dpr={[1, 2]}
      camera={initialCamera}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
    >
      <ContextWatcher onContextLost={onContextLost} onContextRestored={onContextRestored} />
      <StudioEnvironment />
      <CameraRig boundingRadiusM={boundingRadiusM} command={command} />

      <hemisphereLight args={["#cfe6ff", "#0a1626", 0.4]} />
      <directionalLight
        position={[0.9, 1.5, 1.1]}
        intensity={2}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.002}
        shadow-camera-near={0.1}
        shadow-camera-far={6}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
      />
      <directionalLight position={[-1.2, 0.3, -0.9]} intensity={0.9} color="#5fb8ff" />
      <pointLight position={[0, -0.6, 0.6]} intensity={0.35} color="#59cde1" />

      <Assembly
        model={model}
        highlightedComponentId={highlightedComponentId}
        schematic={schematic}
        reducedMotion={reducedMotion}
        onInspectComponent={onInspectComponent}
      />

      {/* Inspection stand: a shadow catcher and a faint ring. Decorative, not an orbital frame. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]} receiveShadow raycast={ignoreRaycast}>
        <circleGeometry args={[0.95, 64]} />
        <shadowMaterial transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.259, 0]} raycast={ignoreRaycast}>
        <ringGeometry args={[0.3, 0.304, 96]} />
        <meshBasicMaterial color={EDGE_COLOR} transparent opacity={0.35} />
      </mesh>
    </Canvas>
  );
}
