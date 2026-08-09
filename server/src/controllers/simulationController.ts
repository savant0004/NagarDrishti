import { Request, Response } from 'express';
import { store } from '../services/store';
import { runScenarioSimulation } from '../services/simulationEngine';

export async function runSimulation(req: Request, res: Response) {
  try {
    const { rainfall = 20, traffic = 50, drainageCapacity = 75, garbageDelay = 1 } = req.body;

    const issues = await store.getIssues();
    const result = runScenarioSimulation(
      {
        rainfall: Number(rainfall),
        traffic: Number(traffic),
        drainageCapacity: Number(drainageCapacity),
        garbageDelay: Number(garbageDelay),
      },
      issues
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('simulation:updated', result);
    }

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
