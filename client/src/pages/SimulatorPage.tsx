import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { DigitalTwin2DMap } from '../components/DigitalTwin2DMap';
import { HeroCity3DScene } from '../components/HeroCity3D';
import { api } from '../services/api';
import { IIssue, IStreet, ISimulationResult } from '../types';
import {
  Sliders,
  CloudRain,
  Car,
  Waves,
  Trash2,
  AlertTriangle,
  Sparkles,
  Users,
  ShieldAlert,
  RotateCcw,
  ArrowUpRight,
  TrendingUp,
  Box,
  Layers,
} from 'lucide-react';

export function SimulatorPage() {
  const [rainfall, setRainfall] = useState<number>(20);
  const [traffic, setTraffic] = useState<number>(50);
  const [drainageCapacity, setDrainageCapacity] = useState<number>(75);
  const [garbageDelay, setGarbageDelay] = useState<number>(1);

  const [issues, setIssues] = useState<IIssue[]>([]);
  const [streets, setStreets] = useState<IStreet[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IIssue | null>(null);
  const [simResult, setSimResult] = useState<ISimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('3D');

  useEffect(() => {
    async function init() {
      const [iss, str] = await Promise.all([api.getIssues(), api.getStreets()]);
      setIssues(iss);
      setStreets(str);
    }
    init();
  }, []);

  // Trigger simulation re-calculation when sliders adjust
  useEffect(() => {
    let isCancelled = false;
    async function executeSim() {
      setIsSimulating(true);
      const res = await api.runSimulation({
        rainfall,
        traffic,
        drainageCapacity,
        garbageDelay,
      });
      if (!isCancelled) {
        setSimResult(res);
        setIsSimulating(false);
      }
    }
    const timer = setTimeout(executeSim, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [rainfall, traffic, drainageCapacity, garbageDelay]);

  const handleResetSliders = () => {
    setRainfall(20);
    setTraffic(50);
    setDrainageCapacity(75);
    setGarbageDelay(1);
  };

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
          {/* Left Simulation Controls & Insights Panel */}
          <div className="w-full lg:w-[420px] bg-[#070d1a] border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto space-y-6 z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[11px] font-bold">
                  <Sliders className="w-3.5 h-3.5" /> What If? Scenario Engine
                </div>
                <h2 className="text-lg font-extrabold text-slate-100 mt-1">Urban Climate Simulator</h2>
              </div>
              <button
                onClick={handleResetSliders}
                title="Reset Sliders"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Sliders Box */}
            <div className="glass-panel p-4 rounded-2xl space-y-5">
              {/* Slider 1: Rainfall */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-300">
                    <CloudRain className="w-4 h-4 text-cyan-400" /> Rainfall Intensity
                  </span>
                  <span className="font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-800">
                    {rainfall} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={rainfall}
                  onChange={(e) => setRainfall(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 mm (Clear)</span>
                  <span>100 mm (Storm)</span>
                  <span>200 mm (Deluge)</span>
                </div>
              </div>

              {/* Slider 2: Traffic */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Car className="w-4 h-4 text-blue-400" /> Traffic Congestion Load
                  </span>
                  <span className="font-mono text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded-lg border border-blue-800">
                    {traffic}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={traffic}
                  onChange={(e) => setTraffic(Number(e.target.value))}
                  className="w-full accent-blue-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Light)</span>
                  <span>50% (Peak)</span>
                  <span>100% (Gridlock)</span>
                </div>
              </div>

              {/* Slider 3: Drainage Capacity */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Waves className="w-4 h-4 text-green-400" /> Drainage System Capacity
                  </span>
                  <span className="font-mono text-green-400 font-bold bg-green-950 px-2 py-0.5 rounded-lg border border-green-800">
                    {drainageCapacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={drainageCapacity}
                  onChange={(e) => setDrainageCapacity(Number(e.target.value))}
                  className="w-full accent-green-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0% (Clogged)</span>
                  <span>50% (Partial)</span>
                  <span>100% (Clean)</span>
                </div>
              </div>

              {/* Slider 4: Garbage Collection Delay */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Trash2 className="w-4 h-4 text-amber-400" /> Garbage Clearance Delay
                  </span>
                  <span className="font-mono text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded-lg border border-amber-800">
                    {garbageDelay} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={garbageDelay}
                  onChange={(e) => setGarbageDelay(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 Days</span>
                  <span>3 Days</span>
                  <span>7 Days</span>
                </div>
              </div>
            </div>

            {/* Simulation Metric Output Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulated Impact Matrix</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-3.5 rounded-2xl space-y-1">
                  <p className="text-[11px] text-slate-400">Drainage Risk Level</p>
                  <p
                    className={`text-sm font-extrabold font-mono ${
                      simResult?.drainageRiskLevel === 'CRITICAL'
                        ? 'text-red-400 animate-pulse'
                        : simResult?.drainageRiskLevel === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-green-400'
                    }`}
                  >
                    {simResult?.drainageRiskLevel || 'LOW'}
                  </p>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl space-y-1">
                  <p className="text-[11px] text-slate-400">Flood Risk Index</p>
                  <p className="text-sm font-extrabold font-mono text-cyan-400">{simResult?.floodRiskPercent || 15}%</p>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl space-y-1">
                  <p className="text-[11px] text-slate-400">Affected Roads</p>
                  <p className="text-sm font-extrabold font-mono text-amber-400">{simResult?.affectedRoadsCount || 2} Streets</p>
                </div>

                <div className="glass-panel p-3.5 rounded-2xl space-y-1">
                  <p className="text-[11px] text-slate-400">Est. Population Impact</p>
                  <p className="text-sm font-extrabold font-mono text-slate-100">
                    {(simResult?.estimatedPopulationImpact || 2400).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Automated Advice Banner */}
            {simResult?.aiRecommendation && (
              <div className="glass-panel-glow p-4 rounded-2xl space-y-2 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Automated Recommendation</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 leading-relaxed">{simResult.aiRecommendation}</p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 font-mono italic text-center">
              SIMULATION — MODELED SCENARIO (not an official government forecast)
            </p>
          </div>

          {/* Right Digital Twin Viewport (2D or 3D Toggle) */}
          <div className="flex-1 h-full relative bg-[#060a12]">
            {/* Viewport Switcher */}
            <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-semibold backdrop-blur-md">
              <button
                onClick={() => setViewMode('2D')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                  viewMode === '2D' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 2D Map Overlay
              </button>
              <button
                onClick={() => setViewMode('3D')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition ${
                  viewMode === '3D' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" /> 3D Digital Twin
              </button>
            </div>

            {viewMode === '2D' ? (
              <DigitalTwin2DMap
                issues={issues}
                streets={streets}
                selectedIssue={selectedIssue}
                onSelectIssue={(iss) => setSelectedIssue(iss)}
                rainfallSimulation={rainfall}
              />
            ) : (
              <HeroCity3DScene
                issues={issues}
                selectedIssue={selectedIssue}
                onSelectIssue={(iss) => setSelectedIssue(iss)}
                rainfallSimulation={rainfall}
                showHUD={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
