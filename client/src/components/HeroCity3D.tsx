import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, BarChart3, Radio, ShieldAlert, Waves, Layers } from 'lucide-react';
import { IIssue } from '../types';

export interface HeroCity3DSceneProps {
  issues?: IIssue[];
  selectedIssue?: IIssue | null;
  onSelectIssue?: (issue: IIssue) => void;
  showHUD?: boolean;
  rainfallSimulation?: number;
}

// Centerpiece Twin Towers (Matching Reference Image 1)
function CenterpieceTwinTowers({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-4, 18, 0]}>
        <boxGeometry args={[7, 36, 10]} />
        <meshStandardMaterial color="#7dd3fc" metalness={0.85} roughness={0.15} emissive="#0284c7" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[4, 22, 0]}>
        <boxGeometry args={[7, 44, 10]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.85} roughness={0.15} emissive="#0284c7" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 14, 0]}>
        <boxGeometry args={[14, 4, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[10, 12, 6, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
    </group>
  );
}

// Ultra-Tall Spire Skyscrapers
function BackgroundSpireSkyscrapers({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[-5, 30, 0]}>
        <boxGeometry args={[8, 60, 8]} />
        <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-5, 64, 0]}>
        <cylinderGeometry args={[0.2, 0.6, 14, 8]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      <mesh position={[6, 36, -5]}>
        <boxGeometry args={[9, 72, 9]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.9} roughness={0.1} emissive="#0284c7" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[6, 78, -5]}>
        <cylinderGeometry args={[0.15, 0.5, 18, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Curved White Residential Apartment Blocks
function CurvedResidentialBlock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[(i - 1.5) * 5, 8 + i * 1.5, Math.sin(i) * 3]}>
          <boxGeometry args={[4.2, 16 + i * 3, 6]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

// Sports Stadium with Red Running Track & Green Pitch
function SportsStadium({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[7, 11, 32]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <planeGeometry args={[11, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[11.5, 12, 2.4, 32, 1, true]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Green Parks
function GreenPark({ position, size }: { position: [number, number, number]; size: [number, number] }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.15, position[2]]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#15803d" roughness={0.9} />
    </mesh>
  );
}

// Simulation Flood Risk Overlay (Feature 7 & 8)
function SimulationRiskOverlay({ rainfall = 0 }: { rainfall?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 4) * 0.15;
    }
  });

  if (rainfall < 40) return null;

  const overlayColor = rainfall > 120 ? '#ef4444' : rainfall > 70 ? '#f59e0b' : '#eab308';

  return (
    <group>
      {/* Drainage Low-Lying Vulnerability Rings */}
      {[-20, 15, 30].map((x, idx) => (
        <mesh key={`flood-zone-${idx}`} ref={idx === 0 ? meshRef : undefined} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.3, idx * 10 - 15]}>
          <ringGeometry args={[10, 22, 32]} />
          <meshBasicMaterial color={overlayColor} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Surrounding High-Density City Buildings
function SurroundingCityGrid() {
  const buildings = useMemo(() => {
    const items = [];
    for (let x = -65; x <= 65; x += 14) {
      for (let z = -65; z <= 65; z += 14) {
        if (Math.abs(x) < 18 && Math.abs(z - 10) < 18) continue;
        if (Math.abs(x) < 20 && Math.abs(z + 30) < 20) continue;
        if (x < -15 && z > 15) continue;
        if (x > 10 && z > 15) continue;

        const isCyanSky = Math.random() > 0.6;
        const width = 8 + Math.random() * 3.5;
        const depth = 8 + Math.random() * 3.5;
        const height = isCyanSky ? 16 + Math.random() * 25 : 8 + Math.random() * 16;
        const color = isCyanSky
          ? Math.random() > 0.5
            ? '#38bdf8'
            : '#0284c7'
          : Math.random() > 0.5
          ? '#f8fafc'
          : '#e2e8f0';

        items.push({
          id: `${x}-${z}`,
          position: [x, 0, z] as [number, number, number],
          size: [width, height, depth] as [number, number, number],
          color,
          isCyanSky,
        });
      }
    }
    return items;
  }, []);

  return (
    <group>
      {buildings.map((b) => (
        <group key={b.id} position={[b.position[0], b.size[1] / 2, b.position[2]]}>
          <mesh>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.color}
              roughness={b.isCyanSky ? 0.15 : 0.4}
              metalness={b.isCyanSky ? 0.85 : 0.15}
              emissive={b.isCyanSky ? new THREE.Color('#0284c7').multiplyScalar(0.25) : new THREE.Color(0x000000)}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Moving Traffic Particles
function AnimatedTraffic() {
  const count = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      axis: i % 2 === 0 ? 'x' : 'z',
      offset: (Math.floor(Math.random() * 8) - 4) * 14,
      speed: (0.2 + Math.random() * 0.2) * (i % 3 === 0 ? -1 : 1),
      pos: Math.random() * 130 - 65,
    }));
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      p.pos += p.speed;
      if (p.pos > 65) p.pos = -65;
      if (p.pos < -65) p.pos = 65;

      if (p.axis === 'x') {
        dummy.position.set(p.pos, 0.4, p.offset);
      } else {
        dummy.position.set(p.offset, 0.4, p.pos);
      }
      dummy.scale.set(0.7, 0.6, 1.4);
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.6, 0.5, 1.0]} />
      <meshBasicMaterial color="#38bdf8" />
    </instancedMesh>
  );
}

// Real Issue Pin Component in 3D Scene (Feature 1 & Feature 16)
function RealIssue3DPin({
  issue,
  position,
  isSelected,
  onClick,
}: {
  issue: IIssue;
  position: [number, number, number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Risk Color Mapping
  let markerColor = '#2ed573'; // LOW
  if (issue.riskLevel === 'CRITICAL' || issue.severity === 'Critical') markerColor = '#ef4444';
  else if (issue.riskLevel === 'HIGH' || issue.severity === 'High') markerColor = '#f59e0b';
  else if (issue.riskLevel === 'MEDIUM' || issue.severity === 'Medium') markerColor = '#eab308';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + 6 + Math.sin(t * 3) * 0.6;
      meshRef.current.rotation.y = t * 1.5;
    }
    if (ringRef.current) {
      const s = 1 + (Math.sin(t * 4) + 1) * 0.6;
      ringRef.current.scale.set(s, s, s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.9 - (s - 1) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Outer Pulse Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[1.6, 2.8, 32]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Stem Pointer */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 6, 8]} />
        <meshBasicMaterial color={markerColor} opacity={0.8} transparent />
      </mesh>
      {/* Diamond Marker Pin */}
      <mesh
        ref={meshRef}
        position={[0, 6, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[isSelected || hovered ? 2.2 : 1.6, 0]} />
        <meshStandardMaterial color={markerColor} emissive={markerColor} emissiveIntensity={isSelected ? 1.6 : 1.2} roughness={0.1} />

        <Html position={[0, 2.6, 0]} center distanceFactor={45} className="pointer-events-auto">
          <div
            onClick={onClick}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border shadow-2xl text-[11px] font-bold font-mono whitespace-nowrap flex items-center gap-2 backdrop-blur-md transition-all duration-300 ${
              isSelected || hovered
                ? 'bg-slate-950/95 border-cyan-400 text-white scale-110 ring-2 ring-cyan-400'
                : 'bg-slate-950/85 border-slate-700/80 text-slate-200 hover:border-cyan-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: markerColor }} />
            <span>
              {issue.type} ({issue.priorityScore}/100)
            </span>
            {issue.reportsCount > 1 && (
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                {issue.reportsCount} reports
              </span>
            )}
          </div>
        </Html>
      </mesh>
    </group>
  );
}

// Main 3D City Scene Component (Feature 1, 2, 7, 8, 15, 16)
export function HeroCity3DScene({
  issues,
  selectedIssue,
  onSelectIssue,
  showHUD = true,
  rainfallSimulation = 0,
}: HeroCity3DSceneProps) {
  const [hudActive, setHudActive] = useState<boolean>(showHUD);

  // Map latitude/longitude of issues to 3D grid coordinates
  const mappedIssuePins = useMemo(() => {
    if (!issues || issues.length === 0) return [];
    const centerLat = 12.9716;
    const centerLng = 77.5946;

    return issues.map((iss, idx) => {
      const lat = iss.latitude || centerLat;
      const lng = iss.longitude || centerLng;
      // Convert lat/lng diff to 3D scene grid scale [-60, 60]
      const x = Math.max(-55, Math.min(55, (lng - centerLng) * 12000));
      const z = Math.max(-55, Math.min(55, (centerLat - lat) * 12000));

      return {
        issue: iss,
        position: [x, 0, z] as [number, number, number],
      };
    });
  }, [issues]);

  return (
    <div className="w-full h-full relative inset-0 pointer-events-auto overflow-hidden bg-[#04152d]">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 32, 70], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#04152d']} />
        <fog attach="fog" args={['#04152d', 60, 180]} />

        <ambientLight intensity={1.1} />
        <hemisphereLight args={['#38bdf8', '#04152d', 1.8]} />
        <directionalLight position={[-60, 90, 40]} intensity={2.8} color="#ffffff" castShadow />
        <directionalLight position={[60, 40, -40]} intensity={1.2} color="#0284c7" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>

        <CenterpieceTwinTowers position={[0, 0, 10]} />
        <BackgroundSpireSkyscrapers position={[0, 0, -25]} />
        <CurvedResidentialBlock position={[-25, 0, 30]} />
        <SportsStadium position={[22, 0, 32]} />
        <GreenPark position={[-10, 0, -10]} size={[35, 20]} />
        <GreenPark position={[25, 0, -15]} size={[25, 25]} />

        <SurroundingCityGrid />
        <AnimatedTraffic />
        <SimulationRiskOverlay rainfall={rainfallSimulation} />

        {/* Real Issue Pins (Connected to Real Issue Data) */}
        {mappedIssuePins.map(({ issue, position }) => (
          <RealIssue3DPin
            key={issue.id || issue._id}
            issue={issue}
            position={position}
            isSelected={selectedIssue?.id === issue.id || selectedIssue?._id === issue.id}
            onClick={() => onSelectIssue?.(issue)}
          />
        ))}

        <OrbitControls
          autoRotate
          autoRotateSpeed={0.3}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={20}
          maxDistance={140}
        />
      </Canvas>

      {/* Simulation Banner & Risk Legend (Feature 7 & 8) */}
      {rainfallSimulation > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-2xl bg-amber-950/90 border border-amber-500/60 shadow-2xl text-xs font-mono font-bold text-amber-300 flex items-center gap-3 backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>SIMULATION — MODELED SCENARIO ({rainfallSimulation}mm Rainfall)</span>
          <div className="flex items-center gap-2 pl-3 border-l border-amber-800 text-[10px] text-slate-300">
            <span>Simulation Risk:</span>
            <span className="text-green-400">● Low</span>
            <span className="text-yellow-400">● Medium</span>
            <span className="text-amber-400">● High</span>
            <span className="text-red-400">● Critical</span>
          </div>
        </div>
      )}

      {/* Side Glass Telemetry HUD Panels */}
      {hudActive && (
        <>
          <div className="absolute top-4 left-4 z-10 w-72 glass-panel-glow p-4 rounded-2xl space-y-4 pointer-events-auto border border-cyan-500/30 text-xs hidden sm:block shadow-2xl">
            <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
              <span className="font-mono font-bold text-cyan-400">DATA INPUT / STREAM</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] font-bold">LIVE</span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-mono">FLOW INDEX SPECTRUM</span>
              <div className="h-20 flex items-end justify-between gap-2 px-1">
                {[60, 85, 45, 90, 70, 95, 75].map((val, idx) => (
                  <div key={idx} className="w-full bg-slate-900 rounded-t overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500 to-green-400 rounded-t transition-all duration-500"
                      style={{ height: `${val}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#00f2fe"
                    strokeWidth="6"
                    strokeDasharray="163"
                    strokeDashoffset="19"
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-extrabold text-sm text-cyan-400 font-mono">88.4%</span>
                  <span className="text-[9px] text-slate-400">HEALTH</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-100 text-xs">Digital Twin Grid</p>
                <p className="text-[11px] text-slate-400">{issues?.length || 8} Active Issues Pinpoint</p>
                <p className="text-[10px] text-cyan-400 font-mono">Socket sync: Active</p>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10 w-72 space-y-3 pointer-events-auto text-xs hidden md:block">
            <div className="glass-panel-glow p-3.5 rounded-2xl border border-cyan-500/30 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-mono font-bold text-cyan-400 text-[11px]">AIR QUALITY / STATUS</span>
                <span className="text-[10px] text-slate-400 font-mono">ZONE 01</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle cx="28" cy="28" r="22" stroke="#1e293b" strokeWidth="5" fill="transparent" />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      stroke="#22c55e"
                      strokeWidth="5"
                      strokeDasharray="138"
                      strokeDashoffset="58"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute font-extrabold text-sm text-green-400 font-mono">42</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div><span className="text-slate-500">NO2:</span> <strong className="text-slate-200">43</strong></div>
                  <div><span className="text-slate-500">PM2.5:</span> <strong className="text-slate-200">48</strong></div>
                  <div><span className="text-slate-500">O3:</span> <strong className="text-slate-200">31</strong></div>
                  <div><span className="text-slate-500">CO2:</span> <strong className="text-slate-200">43</strong></div>
                </div>
              </div>
            </div>

            <div className="glass-panel-glow p-4 rounded-2xl border border-cyan-500/30 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="font-mono font-bold text-cyan-400 text-[11px]">INFRASTRUCTURE HUD</span>
                <span className="text-[10px] font-mono text-slate-400">3D DIGITAL TWIN</span>
              </div>

              <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-mono text-[11px]">Drainage Capacity</span>
                <span className="font-extrabold font-mono text-cyan-400 text-sm">50%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
