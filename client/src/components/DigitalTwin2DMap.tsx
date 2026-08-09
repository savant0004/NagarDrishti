import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { IIssue, IStreet } from '../types';
import { Layers, Map, Eye, Globe, Compass, Users } from 'lucide-react';

interface DigitalTwin2DMapProps {
  issues: IIssue[];
  streets: IStreet[];
  selectedIssue: IIssue | null;
  onSelectIssue: (issue: IIssue) => void;
  rainfallSimulation?: number;
}

type MapTheme = 'dark' | 'satellite' | 'street';

const TILE_SERVERS: Record<MapTheme, { url: string; attribution: string; name: string }> = {
  dark: {
    name: 'Dark Cyber GIS',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  satellite: {
    name: 'Satellite / Orthophoto',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
  },
  street: {
    name: 'High-Contrast Street View',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

// Custom Leaflet Icons generator with pulsing rings
function createCustomIcon(severity: string, isSelected: boolean) {
  let color = '#2ed573'; // Low
  let ringClass = '';
  if (severity === 'Critical') {
    color = '#ff4757';
    ringClass = 'marker-ring-critical';
  } else if (severity === 'High') {
    color = '#ff9f43';
    ringClass = 'marker-ring-high';
  } else if (severity === 'Medium') {
    color = '#ffd32a';
  }

  const border = isSelected ? '3px solid #00f2fe' : '2px solid #ffffff';
  const scale = isSelected ? 'scale(1.3)' : 'scale(1)';

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: ${scale}; transition: transform 0.2s;">
      ${ringClass ? `<div class="${ringClass}" style="top: -6px; left: -6px;"></div>` : ''}
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: ${border};
        box-shadow: 0 0 14px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 7px; height: 7px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Numbered street node icon (Reference Image 2 Inspired)
function createNumberedNodeIcon(num: number, label: string) {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.95);
      border: 2px solid #ffd32a;
      border-radius: 9999px;
      padding: 2px 8px;
      box-shadow: 0 0 10px rgba(255, 211, 42, 0.4);
      white-space: nowrap;
    ">
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffd32a;
        color: #000000;
        font-weight: 800;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
      ">${num}</div>
      <span style="color: #ffffff; font-weight: 700; font-size: 10px; font-family: sans-serif;">${label}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'street-node-badge',
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
}

// Controller to auto center camera when issue selected
function MapRecenter({ selectedIssue }: { selectedIssue: IIssue | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedIssue) {
      map.flyTo([selectedIssue.latitude, selectedIssue.longitude], 16, { duration: 1.2 });
    }
  }, [selectedIssue, map]);
  return null;
}

export function DigitalTwin2DMap({ issues, streets, selectedIssue, onSelectIssue, rainfallSimulation = 0 }: DigitalTwin2DMapProps) {
  const [mapTheme, setMapTheme] = useState<MapTheme>('dark');
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Center of city (Bengaluru central area coordinates)
  const centerLat = 12.9716;
  const centerLng = 77.5946;

  // Key street highlight coordinates for high visibility road networks (Reference Image 2 Inspired)
  const highlightedRoads = [
    {
      name: 'MG ROAD ARTERIAL',
      num: 1,
      coords: [
        [12.9716, 77.585],
        [12.972, 77.595],
        [12.973, 77.61],
      ] as [number, number][],
    },
    {
      name: 'SECTOR 4 DRAIN CORRIDOR',
      num: 2,
      coords: [
        [12.965, 77.59],
        [12.9716, 77.5946],
        [12.98, 77.6],
      ] as [number, number][],
    },
    {
      name: 'COMMERCIAL AVENUE',
      num: 3,
      coords: [
        [12.978, 77.588],
        [12.975, 77.602],
        [12.97, 77.615],
      ] as [number, number][],
    },
    {
      name: 'LESHAN ROAD LINK',
      num: 4,
      coords: [
        [12.962, 77.58],
        [12.968, 77.592],
        [12.974, 77.605],
      ] as [number, number][],
    },
  ];

  return (
    <div className="w-full h-full relative z-0 overflow-hidden">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        {/* Dynamic Tile Layer */}
        <TileLayer attribution={TILE_SERVERS[mapTheme].attribution} url={TILE_SERVERS[mapTheme].url} />

        <MapRecenter selectedIssue={selectedIssue} />

        {/* Rain Flood Overlays during Scenario Simulation */}
        {rainfallSimulation > 50 &&
          streets
            .filter((s) => s.drainageScore < 60)
            .map((st, idx) => (
              <Circle
                key={`flood-${idx}`}
                center={[st.latitude, st.longitude]}
                radius={200 + rainfallSimulation * 1.5}
                pathOptions={{
                  color: '#00f2fe',
                  fillColor: '#00f2fe',
                  fillOpacity: Math.min(0.5, 0.15 + (rainfallSimulation / 200) * 0.35),
                  weight: 3,
                  dashArray: '6, 12',
                }}
              />
            ))}

        {/* Highlighted Primary Yellow Street Lines (Reference Image 2 Inspired) */}
        {highlightedRoads.map((hr, idx) => (
          <React.Fragment key={`hl-road-${idx}`}>
            {/* Outline Glow */}
            <Polyline positions={hr.coords} pathOptions={{ color: '#000000', weight: 8, opacity: 0.7 }} />
            {/* Glowing Yellow Centerline */}
            <Polyline positions={hr.coords} pathOptions={{ color: '#ffd32a', weight: 5, opacity: 0.95 }} />
            {/* Numbered Node Badge */}
            <Marker position={hr.coords[1]} icon={createNumberedNodeIcon(hr.num, hr.name)} />
          </React.Fragment>
        ))}

        {/* Secondary Street Lines / Network */}
        {streets.map((st, idx) => {
          let lineProps = { color: '#00f2fe', opacity: 0.6, weight: 3 };
          if (st.healthScore < 60) lineProps = { color: '#ff4757', opacity: 0.85, weight: 4 };
          else if (st.healthScore < 75) lineProps = { color: '#ff9f43', opacity: 0.75, weight: 3 };

          // Create synthetic line for street visualization
          const lineCoords: [number, number][] = [
            [st.latitude - 0.0025, st.longitude - 0.0025],
            [st.latitude, st.longitude],
            [st.latitude + 0.0025, st.longitude + 0.0025],
          ];

          return <Polyline key={`street-line-${idx}`} positions={lineCoords} pathOptions={lineProps} />;
        })}

        {/* Issue Pins */}
        {issues.map((issue) => {
          const isSelected = selectedIssue?.id === issue.id;
          return (
            <Marker
              key={issue.id}
              position={[issue.latitude, issue.longitude]}
              icon={createCustomIcon(issue.severity, isSelected)}
              eventHandlers={{
                click: () => onSelectIssue(issue),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 min-w-[210px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
                      {issue.id}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        issue.riskLevel === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : issue.riskLevel === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                      }`}
                    >
                      {issue.riskLevel}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 leading-snug">{issue.title}</h4>
                  <p className="text-xs text-slate-400">{issue.streetName}</p>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Priority Score</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{issue.priorityScore}/100</span>
                  </div>
                  <button
                    onClick={() => onSelectIssue(issue)}
                    className="w-full mt-2 py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded transition"
                  >
                    Inspect Issue Details &rarr;
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Control: Map Layer Switcher (Top Right) */}
      <div className="absolute top-4 right-4 z-10 bg-slate-950/90 border border-slate-800 backdrop-blur-md p-1.5 rounded-xl flex items-center gap-1 shadow-xl">
        {(['dark', 'satellite', 'street'] as MapTheme[]).map((theme) => (
          <button
            key={theme}
            onClick={() => setMapTheme(theme)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mapTheme === theme ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            {theme === 'dark' && <Layers className="w-3.5 h-3.5" />}
            {theme === 'satellite' && <Globe className="w-3.5 h-3.5" />}
            {theme === 'street' && <Map className="w-3.5 h-3.5" />}
            <span className="capitalize">{theme} Map</span>
          </button>
        ))}
      </div>

      {/* Area & Population Stats Badge Overlay (Reference Image 2 Inspired - Top Left) */}
      <div className="absolute top-4 left-4 z-10 glass-panel-glow px-4 py-3 rounded-xl border border-cyan-500/30 text-xs text-slate-100 flex items-center gap-4 shadow-xl">
        <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
          <Compass className="w-5 h-5 text-cyan-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">MONITORED ZONE</p>
            <p className="font-extrabold text-xs text-white">Central Urban Sector 4</p>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div>
            <span className="text-[10px] text-slate-400 block">AREA</span>
            <span className="font-bold text-cyan-400">26.5 ha</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">POPULATION</span>
            <span className="font-bold text-slate-100">16,000 ppl</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] text-slate-400 block">DENSITY</span>
            <span className="font-bold text-amber-400">604 ppl/ha</span>
          </div>
        </div>
      </div>

      {/* Map Legend Key Panel (Reference Image 2 Inspired - Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 glass-panel p-3 rounded-xl border border-slate-800 text-xs text-slate-200 shadow-2xl max-w-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="font-bold font-mono text-cyan-400 text-[11px] uppercase tracking-wider">Map Legend Key</span>
          <button onClick={() => setShowLegend(!showLegend)} className="text-[10px] text-slate-400 hover:text-white">
            {showLegend ? 'Hide' : 'Show'}
          </button>
        </div>

        {showLegend && (
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[#ffd32a] rounded-full inline-block" /> High-Priority Corridor
              </span>
              <span className="font-mono text-slate-400 text-[10px]">①-④</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[#ff4757] rounded-full inline-block" /> Damaged / At Risk Street
              </span>
              <span className="font-mono text-red-400 text-[10px]">CRITICAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[#00f2fe] rounded-full inline-block" /> Normal Digitized Street
              </span>
              <span className="font-mono text-cyan-400 text-[10px]">OK</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block ring-2 ring-red-400/50" /> Critical Issue
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High Issue
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
