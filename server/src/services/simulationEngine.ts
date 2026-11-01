import { IIssue, RiskLevel } from '../models/Issue';
import { calculatePriorityScore } from './priorityEngine';

export interface SimulationInput { rainfall: number; traffic: number; drainageCapacity: number; garbageDelay: number; }
export interface SimulationResult {
  params: SimulationInput;
  drainageRiskLevel: RiskLevel;
  floodRiskPercent: number;
  affectedRoadsCount: number;
  estimatedPopulationImpact: null;
  aiRecommendation: string;
  simulatedIssues: Array<{ id: string; originalPriority: number; simulatedPriority: number; originalRisk: RiskLevel; simulatedRisk: RiskLevel; isSimulatedElevated: boolean }>;
  assumptions: string[];
  contributingFactors: string[];
  historicalObservations: { floodRelatedComplaints: number; openFloodRelatedComplaints: number; areas: string[] };
  sensorDataAvailable: false;
  elevationDataAvailable: false;
  dataSource: 'historical_complaints_and_user_scenario';
}

export function runScenarioSimulation(input: SimulationInput, currentIssues: IIssue[], reports: any[] = []): SimulationResult {
  const { rainfall, traffic, drainageCapacity, garbageDelay } = input;
  const floodCategories = new Set(['Waterlogging', 'Blocked Drainage']);
  const floodReports = reports.filter((report) => floodCategories.has(report.issueType));
  const openFloodReports = floodReports.filter((report) => report.status !== 'Resolved');
  const areas = [...new Set(openFloodReports.map((report) => String(report.streetName || '').trim()).filter(Boolean))].slice(0, 12);
  const openDrainageIssues = currentIssues.filter((issue) => issue.status !== 'RESOLVED' && ['Waterlogging', 'Blocked Drainage'].includes(issue.type)).length;

  const drainageDeficit = Math.max(0, rainfall - drainageCapacity * 1.5);
  const historyFactor = Math.min(12, openFloodReports.length * 2 + openDrainageIssues);
  const floodRiskPercent = Math.min(98, Math.max(0, Math.round(rainfall * 0.35 + drainageDeficit * 0.12 + (100 - drainageCapacity) * 0.22 + garbageDelay * 1.5 + traffic * 0.04 + historyFactor)));
  const drainageRiskLevel: RiskLevel = floodRiskPercent >= 75 ? 'CRITICAL' : floodRiskPercent >= 55 ? 'HIGH' : floodRiskPercent >= 35 ? 'MEDIUM' : 'LOW';
  const affectedRoadsCount = floodRiskPercent >= 35 ? areas.length : 0;

  const simulatedIssues = currentIssues.map((issue) => {
    const recalculated = calculatePriorityScore({ type: issue.type, severity: issue.severity, reportsCount: issue.reportsCount, estimatedPopulationImpact: issue.estimatedPopulationImpact, nearbyInfrastructure: issue.nearbyInfrastructure, createdAt: issue.createdAt, trafficVolume: traffic, weatherRainfall: rainfall, aiDetectedSeverity: issue.aiDetectedSeverity, verifiedVisualEvidence: issue.verifiedVisualEvidence, isResolved: issue.status === 'RESOLVED' });
    const simulatedPriority = Math.min(100, recalculated.priorityScore + (issue.status === 'RESOLVED' ? 0 : issue.type === 'Waterlogging' || issue.type === 'Blocked Drainage' ? Math.min(12, Math.round(floodRiskPercent * 0.12)) : 0));
    const simulatedRisk: RiskLevel = simulatedPriority >= 80 ? 'CRITICAL' : simulatedPriority >= 65 ? 'HIGH' : simulatedPriority >= 45 ? 'MEDIUM' : 'LOW';
    return { id: issue.id || issue._id?.toString() || '', originalPriority: issue.priorityScore, simulatedPriority, originalRisk: issue.riskLevel, simulatedRisk, isSimulatedElevated: simulatedPriority > issue.priorityScore + 10 };
  });

  const contributingFactors = [
    `User scenario rainfall: ${rainfall} mm`,
    `User scenario drainage capacity: ${drainageCapacity}%`,
    `User scenario garbage clearance delay: ${garbageDelay} day(s)`,
    `User scenario traffic load: ${traffic}%`,
    `${openFloodReports.length} unresolved historical waterlogging or blocked-drain complaints`,
  ];
  const aiRecommendation = drainageRiskLevel === 'CRITICAL' || drainageRiskLevel === 'HIGH'
    ? `Scenario risk is ${drainageRiskLevel.toLowerCase()}. Review drainage assets and prioritize inspection${areas.length ? ` in previously reported areas: ${areas.slice(0, 3).join(', ')}` : ''}. This is a modeled scenario, not a forecast.`
    : `Scenario index is ${drainageRiskLevel.toLowerCase()}. Continue routine drainage checks and monitor new waterlogging reports. This is a modeled scenario, not a forecast.`;

  return {
    params: input, drainageRiskLevel, floodRiskPercent, affectedRoadsCount, estimatedPopulationImpact: null, aiRecommendation, simulatedIssues,
    assumptions: ['Rainfall, traffic, drainage capacity, and garbage delay are user-entered scenario values.', 'Historical complaint counts are observations and do not establish future flooding.', 'No terrain elevation, live rainfall sensor, drainage sensor, or population exposure dataset is connected; affected areas are historical report locations only.'],
    contributingFactors,
    historicalObservations: { floodRelatedComplaints: floodReports.length, openFloodRelatedComplaints: openFloodReports.length, areas },
    sensorDataAvailable: false, elevationDataAvailable: false, dataSource: 'historical_complaints_and_user_scenario',
  };
}
