import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeroCity3DScene } from '../components/HeroCity3D';
import { DigitalTwin2DMap } from '../components/DigitalTwin2DMap';
import { api } from '../services/api';
import { IIssue, IStreet } from '../types';
import {
  Zap,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Camera,
  Activity,
  CheckCircle2,
  BrainCircuit,
  Building2,
  Users,
  Eye,
  MapPin,
  Flame,
  Globe,
  Layers,
  Box,
} from 'lucide-react';

export function LandingPage() {
  const [showcaseMode, setShowcaseMode] = useState<'3D' | '2D'>('3D');
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [streets, setStreets] = useState<IStreet[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IIssue | null>(null);

  useEffect(() => {
    async function loadData() {
      const [iss, str] = await Promise.all([api.getIssues(), api.getStreets()]);
      setIssues(iss);
      setStreets(str);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 selection:bg-cyan-500 selection:text-black font-sans">
      {/* Minimalist Navbar (Reference Image 2 Inspired) */}
      <nav className="h-20 border-b border-slate-800/80 bg-[#070d1a]/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50 px-6 lg:px-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider text-slate-100 font-mono">NAGARDRISHTI</h1>
            <p className="text-[11px] text-cyan-400 font-semibold">Urban Digital Twin Platform</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
          <a href="#problem" className="hover:text-cyan-400 transition">Problem</a>
          <a href="#how-it-works" className="hover:text-cyan-400 transition">How It Works</a>
          <a href="#digital-twin" className="hover:text-cyan-400 transition">Digital Twin</a>
          <a href="#simulator" className="hover:text-cyan-400 transition">Simulator</a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-2xl transition shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          >
            <span>Launch Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Minimalist Hero 3D Section (Reference Image 2 Inspired) */}
      <section className="relative min-h-screen pt-20 flex items-center overflow-hidden">
        {/* Interactive 3D Background */}
        <div className="absolute inset-0 z-0">
          <HeroCity3DScene showHUD={false} />
        </div>

        {/* Soft Ambient Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a12]/90 via-[#060a12]/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-transparent to-[#060a12]/40 z-10 pointer-events-none" />

        <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-16 py-20 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-800 text-cyan-400 text-xs font-semibold backdrop-blur-md">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Next-Gen Smart City GIS Decision Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-[1.1]">
              See Your City. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Understand the Risk.
              </span> <br />
              Act Before It Escalates.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
              NagarDrishti transforms scattered urban infrastructure data into an interactive digital twin that helps city authorities detect problems, understand their impact, simulate risks, and prioritize action.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/dashboard"
                className="px-7 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm rounded-2xl transition shadow-xl shadow-cyan-500/25 flex items-center gap-3"
              >
                <span>Explore Digital Twin</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/report"
                className="px-7 py-4 glass-panel hover:bg-slate-800 text-slate-100 font-bold text-sm rounded-2xl transition border border-slate-700 flex items-center gap-2"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Report a Problem</span>
              </Link>
            </div>

            {/* Live Metrics Bar */}
            <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-2xl font-extrabold font-mono text-cyan-400">50+</p>
                <p className="text-xs text-slate-400 font-medium">Active Issues Monitored</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold font-mono text-slate-100">20</p>
                <p className="text-xs text-slate-400 font-medium">Streets Digitized</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold font-mono text-green-400">140+</p>
                <p className="text-xs text-slate-400 font-medium">Issues Resolved</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold font-mono text-blue-400">125K</p>
                <p className="text-xs text-slate-400 font-medium">Citizens Impacted</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 2D/3D Map Showcase Section (Reference Image 2 Minimalist Card Style) */}
      <section id="digital-twin" className="py-20 bg-[#070d1a] border-t border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Interactive GIS Experience</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">Experience 2D GIS Map & 3D Digital Twin</h2>
              <p className="text-slate-400 text-sm">
                Switch seamlessly between high-visibility 2D local city GIS maps with highlighted road networks and full 3D metallic digital twins with live telemetry HUDs.
              </p>
            </div>

            {/* 2D / 3D Mode Switcher */}
            <div className="flex items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start">
              <button
                onClick={() => setShowcaseMode('3D')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                  showcaseMode === '3D' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-4 h-4" /> 3D Digital Twin View
              </button>
              <button
                onClick={() => setShowcaseMode('2D')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition ${
                  showcaseMode === '2D' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" /> 2D GIS Local Map
              </button>
            </div>
          </div>

          {/* Interactive Map Canvas Window (Rounded 3XL Minimalist Card) */}
          <div className="w-full h-[540px] rounded-[2rem] overflow-hidden glass-panel-glow border border-slate-800 relative shadow-2xl">
            {showcaseMode === '3D' ? (
              <HeroCity3DScene showHUD={true} />
            ) : (
              <DigitalTwin2DMap
                issues={issues}
                streets={streets}
                selectedIssue={selectedIssue}
                onSelectIssue={(iss) => setSelectedIssue(iss)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section id="problem" className="py-24 bg-[#060a12] border-t border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">Cities Receive Disconnected Complaints — But Don't Know What to Fix First</h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Municipal authorities face hundreds of daily reports: broken lights, potholes, blocked drains. Without spatial context and impact intelligence, critical disasters escalate into massive urban disruptions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-[2rem] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Siloed Data & Blindspots</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complaints sit in separate department registers. Drainage teams don't see road work, leading to repeated pavement destruction and flooded schools.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-[2rem] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Subjective Priority Guesswork</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Repairs are dispatched based on loud complaints rather than actual population density, school proximity, or severe weather forecast risk.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-[2rem] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Zero Simulation Capability</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cities cannot test "what if" heavy rainfall hits. They react only after severe flooding causes major traffic gridlocks and economic losses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: How It Works */}
      <section id="how-it-works" className="py-24 bg-[#070d1a] border-t border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">From Street Problem to Resolution in 4 Steps</h2>
            <p className="text-slate-400 text-sm">NagarDrishti creates a closed-loop intelligence pipeline — from citizen complaint to data-driven resolution.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-px bg-gradient-to-r from-cyan-500/40 via-blue-500/40 to-indigo-500/40 z-0" />

            {[
              {
                step: '01',
                icon: Camera,
                color: 'cyan',
                title: 'Citizen Reports',
                desc: 'Residents submit photos and location tags via mobile. AI computer vision auto-classifies issue type and severity.',
              },
              {
                step: '02',
                icon: BrainCircuit,
                color: 'blue',
                title: 'AI Priority Engine',
                desc: 'Our risk algorithm scores each report based on population impact, infrastructure proximity, traffic density and weather risk.',
              },
              {
                step: '03',
                icon: MapPin,
                color: 'indigo',
                title: 'Digital Twin Mapping',
                desc: 'Issues are plotted on interactive 2D GIS and 3D digital twin maps, giving city officials spatial context at a glance.',
              },
              {
                step: '04',
                icon: CheckCircle2,
                color: 'green',
                title: 'Dispatch & Resolve',
                desc: 'Repair crews are dispatched with 1-click. Citizens track resolution status in real-time via their Report ID.',
              },
            ].map((s, i) => {
              const Icon = s.icon;
              const bg =
                s.color === 'cyan'
                  ? 'bg-cyan-950 border-cyan-800 text-cyan-400'
                  : s.color === 'blue'
                  ? 'bg-blue-950 border-blue-800 text-blue-400'
                  : s.color === 'indigo'
                  ? 'bg-indigo-950 border-indigo-800 text-indigo-400'
                  : 'bg-green-950 border-green-800 text-green-400';
              const num =
                s.color === 'cyan'
                  ? 'text-cyan-400'
                  : s.color === 'blue'
                  ? 'text-blue-400'
                  : s.color === 'indigo'
                  ? 'text-indigo-400'
                  : 'text-green-400';
              return (
                <div key={s.step} className="relative z-10 glass-panel p-6 rounded-[2rem] space-y-4 text-center hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${bg}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className={`font-mono font-extrabold text-3xl ${num}`}>{s.step}</span>
                  <h3 className="text-sm font-extrabold text-slate-100">{s.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Key Capabilities (Features Grid) */}
      <section id="simulator" className="py-24 bg-[#060a12] border-t border-slate-800/60 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Platform Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">Everything a Smart City Needs</h2>
            <p className="text-slate-400 text-sm">A full-stack urban intelligence platform built for municipal authorities, field crews, and citizens.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: MapPin, color: 'cyan', title: '2D GIS Mapping', desc: 'Interactive Leaflet map with issue pins, street overlays, and color-coded risk zones plotted on real city geography.' },
              { icon: Box, color: 'blue', title: '3D Digital Twin', desc: 'Procedural Three.js city model with live issue markers, smoke simulation, and real-time HUD telemetry overlays.' },
              { icon: BrainCircuit, color: 'indigo', title: 'AI Priority Engine', desc: 'Weighted multi-factor risk scoring across severity, population, infrastructure proximity, traffic and weather.' },
              { icon: Sliders, color: 'amber', title: 'Scenario Simulator', desc: '"What If?" climate simulator: adjust rainfall, drainage, and traffic to model flood risk and population impact.' },
              { icon: Camera, color: 'green', title: 'AI Vision Reporter', desc: 'Citizens upload a photo — AI detects issue type, confidence and severity automatically. No manual selection needed.' },
              { icon: Activity, color: 'red', title: 'Street Health Index', desc: 'Per-street composite scoring across road paving, drainage, lighting, sanitation and traffic. Visual health bars.' },
              { icon: Globe, color: 'purple', title: 'Real-Time Socket.IO', desc: 'Instant dashboard updates when new issues are reported or status changes via WebSocket push events.' },
              { icon: Building2, color: 'cyan', title: 'Analytics Command', desc: 'Charts for issue category distribution, risk levels, and weekly resolved-vs-active incident velocity trends.' },
              { icon: Users, color: 'blue', title: 'Citizen Report Tracker', desc: 'Every report gets a unique ID. Citizens track their submission through 5 resolution stages in real time.' },
            ].map((f) => {
              const Icon = f.icon;
              const bg =
                f.color === 'cyan' ? 'bg-cyan-950/60 border-cyan-800/60 text-cyan-400'
                : f.color === 'blue' ? 'bg-blue-950/60 border-blue-800/60 text-blue-400'
                : f.color === 'indigo' ? 'bg-indigo-950/60 border-indigo-800/60 text-indigo-400'
                : f.color === 'amber' ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                : f.color === 'green' ? 'bg-green-950/60 border-green-800/60 text-green-400'
                : f.color === 'red' ? 'bg-red-950/60 border-red-800/60 text-red-400'
                : f.color === 'purple' ? 'bg-purple-950/60 border-purple-800/60 text-purple-400'
                : 'bg-slate-900 border-slate-800 text-slate-400';
              return (
                <div key={f.title} className="glass-panel p-6 rounded-2xl space-y-3 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-100">{f.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/80 bg-[#060a12] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-bold">
              ND
            </div>
            <span className="font-bold text-slate-300 font-mono">NAGARDRISHTI — Urban Intelligence Digital Twin</span>
          </div>
          <p>© 2026 NagarDrishti. Hackathon Demo Project. Built for Smart Urban Mobility & Infrastructure Management.</p>
        </div>
      </footer>
    </div>
  );
}
