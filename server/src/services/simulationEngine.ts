import { IIssue, RiskLevel } from '../models/Issue';
import { calculatePriorityScore } from './priorityEngine';

export interface SimulationInput {
  rainfall: number; // 0 - 200 mm
  traffic: number; // 0 - 100 %
  drainageCapacity: number; // 0 - 100 %
  garbageDelay: number; // 0 - 7 days
}

export interface SimulationResult {
  params: SimulationInput;
  drainageRiskLevel: RiskLevel;
  floodRiskPercent: number;
  affectedRoadsCount: number;
  estimatedPopulationImpact: number;
  aiRecommendation: string;
  simulatedIssues: Array<{
    id: string;
    originalPriority: number;
    simulatedPriority: number;
    originalRisk: RiskLevel;
    simulatedRisk: RiskLevel;
    isSimulatedElevated: boolean;
  }>;
}

export function runScenarioSimulation(input: SimulationInput, currentIssues: IIssue[]): SimulationResult {
  const { rainfall, traffic, drainageCapacity, garbageDelay } = input;

  // 1. Calculate Drainage Deficit & Flood Risk %
  // Higher rainfall & lower drainage capacity -> high flood risk
  const drainageDeficit = Math.max(0, rainfall - (drainageCapacity * 1.5));
  const floodRiskPercent = Math.min(98, Math.max(10, Math.round((rainfall * 0.45) + (100 - drainageCapacity) * 0.35 + (garbageDelay * 2.5))));

  // 2. Drainage Risk Level
  let drainageRiskLevel: RiskLevel = 'LOW';
  if (floodRiskPercent >= 75) drainageRiskLevel = 'CRITICAL';
  else if (floodRiskPercent >= 55) drainageRiskLevel = 'HIGH';
  else if (floodRiskPercent >= 35) drainageRiskLevel = 'MEDIUM';

  // 3. Estimate Affected Roads & Population Impact
  const affectedRoadsCount = Math.min(18, Math.max(1, Math.round(floodRiskPercent / 12) + (traffic > 70 ? 2 : 0)));
  const basePopPerRoad = 1200;
  const estimatedPopulationImpact = Math.round(affectedRoadsCount * basePopPerRoad * (1 + (rainfall / 150)));

  // 4. Recalculate Issues under simulated environment
  const simulatedIssues = currentIssues.map((issue) => {
    const originalPriority = issue.priorityScore;
    const originalRisk = issue.riskLevel;

    // Recalculate priority with new simulation parameters
    const simResult = calculatePriorityScore({
      type: issue.type,
      severity: issue.severity,
      reportsCount: issue.reportsCount,
      estimatedPopulationImpact: issue.estimatedPopulationImpact,
      nearbyInfrastructure: issue.nearbyInfrastructure,
      createdAt: issue.createdAt,
      trafficVolume: traffic,
      weatherRainfall: rainfall,
    });

    // Extra boost if drainage or pothole during heavy rain
    let boostedScore = simResult.priorityScore;
    if ((issue.type === 'Blocked Drainage' || issue.type === 'Pothole' || issue.type === 'Water Leakage') && rainfall > 80) {
      boostedScore = Math.min(100, boostedScore + Math.round((rainfall - 80) / 10));
    }

    let boostedRisk: RiskLevel = 'LOW';
    if (boostedScore >= 80) boostedRisk = 'CRITICAL';
    else if (boostedScore >= 65) boostedRisk = 'HIGH';
    else if (boostedScore >= 45) boostedRisk = 'MEDIUM';

    return {
      id: issue.id || issue._id?.toString() || '',
      originalPriority,
      simulatedPriority: boostedScore,
      originalRisk,
      simulatedRisk: boostedRisk,
      isSimulatedElevated: boostedScore > originalPriority + 10,
    };
  });

  // 5. Generate Dynamic AI Recommendation
  let aiRecommendation = '';
  if (rainfall > 120 && drainageCapacity < 50) {
    aiRecommendation = `CRITICAL WARNING: High inundation threat detected (${rainfall}mm rain / ${drainageCapacity}% drainage). Mobilize emergency de-silting pumps to Sector 4 Road & Indiranagar immediately to avert flooding for ~${estimatedPopulationImpact.toLocaleString()} citizens.`;
  } else if (traffic > 80 && garbageDelay > 4) {
    aiRecommendation = `HIGH BOTTLENECK: Severe congestion combined with ${garbageDelay} days waste delay. Reroute heavy vehicles around Commercial St & clear arterial road blockages within 6 hours.`;
  } else if (rainfall > 60) {
    aiRecommendation = `MODERATE RISK: Moderate precipitation predicted (${rainfall}mm). Inspect low-lying drainage check valves on Outer Ring Road and dispatch maintenance squads.`;
  } else {
    aiRecommendation = `NORMAL OPERATIONS: Simulated parameters indicate manageable urban load. Maintain routine preventative street maintenance schedules.`;
  }

  return {
    params: input,
    drainageRiskLevel,
    floodRiskPercent,
    affectedRoadsCount,
    estimatedPopulationImpact,
    aiRecommendation,
    simulatedIssues,
  };
}
