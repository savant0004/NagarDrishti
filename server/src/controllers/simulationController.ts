import { Request, Response } from 'express';
import { store } from '../services/store';
import { runScenarioSimulation } from '../services/simulationEngine';

export async function runSimulation(req: Request, res: Response) {
  try {
    const { rainfall = 20, traffic = 50, drainageCapacity = 75, garbageDelay = 1 } = req.body || {};
    const params = { rainfall: Number(rainfall), traffic: Number(traffic), drainageCapacity: Number(drainageCapacity), garbageDelay: Number(garbageDelay) };
    if (!Number.isFinite(params.rainfall) || params.rainfall < 0 || params.rainfall > 500
      || !Number.isFinite(params.traffic) || params.traffic < 0 || params.traffic > 100
      || !Number.isFinite(params.drainageCapacity) || params.drainageCapacity < 0 || params.drainageCapacity > 100
      || !Number.isFinite(params.garbageDelay) || params.garbageDelay < 0 || params.garbageDelay > 30) {
      return res.status(400).json({ success: false, code: 'INVALID_SIMULATION_INPUT', error: 'Rainfall must be 0–500 mm, traffic and drainage capacity 0–100, and garbage delay 0–30 days.' });
    }

    const issues = await store.getIssues();
    const reports = await store.getReports();
    const result = runScenarioSimulation(params, issues, reports);

    return res.json({ success: true, data: { ...result, applicationMode: store.getDataSource() } });
  } catch (err: any) {
    const unavailable = String(err?.message || '').includes('MongoDB is unavailable') || String(err?.message || '').includes('DEMO_MODE is disabled');
    if (!unavailable) console.error(JSON.stringify({ level: 'error', event: 'simulation_failed', errorName: err?.name || 'Error' }));
    return res.status(unavailable ? 503 : 500).json({ success: false, code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SIMULATION_FAILED', error: unavailable ? 'Simulation data is temporarily unavailable.' : 'The simulation could not be completed.' });
  }
}
