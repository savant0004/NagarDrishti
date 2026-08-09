import { IssueType, IssueSeverity, RiskLevel, INearbyInfrastructure } from '../models/Issue';

export interface PriorityCalculationParams {
  type: IssueType;
  severity: IssueSeverity;
  reportsCount: number;
  estimatedPopulationImpact: number;
  nearbyInfrastructure: INearbyInfrastructure;
  createdAt?: Date;
  trafficVolume?: number; // 0 - 100%
  weatherRainfall?: number; // 0 - 200mm
}

export interface PriorityResult {
  priorityScore: number;
  riskLevel: RiskLevel;
  breakdown: {
    severity: number;
    traffic: number;
    population: number;
    infrastructure: number;
    reports: number;
    duration: number;
    weatherRisk: number;
  };
  recommendedAction: string;
  reason: string;
}

export function calculatePriorityScore(params: PriorityCalculationParams): PriorityResult {
  // 1. Severity Score (0 - 20)
  let severityScore = 10;
  switch (params.severity) {
    case 'Critical':
      severityScore = 20;
      break;
    case 'High':
      severityScore = 16;
      break;
    case 'Medium':
      severityScore = 11;
      break;
    case 'Low':
      severityScore = 6;
      break;
  }

  // 2. Traffic Impact Score (0 - 20)
  const trafficVolume = params.trafficVolume ?? 50;
  let trafficScore = Math.min(20, Math.round((trafficVolume / 100) * 18) + (params.type === 'Pothole' || params.type === 'Traffic Congestion' || params.type === 'Road Obstruction' ? 2 : 0));

  // 3. Population Impact Score (0 - 20)
  const pop = params.estimatedPopulationImpact || 500;
  let populationScore = 5;
  if (pop > 5000) populationScore = 20;
  else if (pop > 2500) populationScore = 17;
  else if (pop > 1000) populationScore = 14;
  else if (pop > 500) populationScore = 10;

  // 4. Infrastructure Importance (0 - 15)
  const infra = params.nearbyInfrastructure || { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 };
  let infraPoints = 0;
  infraPoints += (infra.hospitals || 0) * 5;
  infraPoints += (infra.schools || 0) * 4;
  infraPoints += (infra.busStops || 0) * 3;
  infraPoints += (infra.residentialCount || 0) * 1;
  infraPoints += (infra.commercialCount || 0) * 1;
  const infrastructureScore = Math.min(15, Math.max(2, infraPoints));

  // 5. Reports Count Score (0 - 10)
  const reports = params.reportsCount || 1;
  let reportsScore = Math.min(10, Math.round(Math.log2(reports + 1) * 3));

  // 6. Duration Score (0 - 10)
  const createdAt = params.createdAt ? new Date(params.createdAt) : new Date();
  const hoursOpen = Math.max(0, (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  let durationScore = Math.min(10, Math.floor(hoursOpen / 12) + 2);

  // 7. Weather / Environmental Risk (0 - 5)
  const rainfall = params.weatherRainfall ?? 0;
  let weatherRiskScore = 0;
  if (params.type === 'Blocked Drainage' || params.type === 'Water Leakage' || params.type === 'Pothole') {
    weatherRiskScore = Math.min(5, Math.round((rainfall / 200) * 5));
  }

  // Calculate Total Score (0 - 100)
  const total = Math.min(100, Math.max(5, severityScore + trafficScore + populationScore + infrastructureScore + reportsScore + durationScore + weatherRiskScore));

  // Determine Risk Level
  let riskLevel: RiskLevel = 'LOW';
  if (total >= 80) riskLevel = 'CRITICAL';
  else if (total >= 65) riskLevel = 'HIGH';
  else if (total >= 45) riskLevel = 'MEDIUM';

  // Generate Action & Reason
  const actionReason = generateRecommendationAndReason(params.type, riskLevel, total, infra, reports, trafficVolume, rainfall);

  return {
    priorityScore: total,
    riskLevel,
    breakdown: {
      severity: severityScore,
      traffic: trafficScore,
      population: populationScore,
      infrastructure: infrastructureScore,
      reports: reportsScore,
      duration: durationScore,
      weatherRisk: weatherRiskScore,
    },
    recommendedAction: actionReason.action,
    reason: actionReason.reason,
  };
}

function generateRecommendationAndReason(
  type: IssueType,
  riskLevel: RiskLevel,
  score: number,
  infra: INearbyInfrastructure,
  reportsCount: number,
  trafficVolume: number,
  rainfall: number
) {
  let action = '';
  let reason = '';

  const nearText = [];
  if (infra.schools > 0) nearText.push(`${infra.schools} school(s)`);
  if (infra.hospitals > 0) nearText.push(`${infra.hospitals} hospital(s)`);
  if (infra.busStops > 0) nearText.push(`${infra.busStops} bus stop(s)`);

  const nearStr = nearText.length > 0 ? ` proximity to ${nearText.join(', ')}` : ' high density residential area';

  switch (type) {
    case 'Pothole':
      action = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'Repair road surface with quick-set asphalt within 24 hours.' : 'Schedule resurfacing crew within 3-5 days.';
      reason = `High traffic density (${trafficVolume}%) +${nearStr} + ${reportsCount} citizen reports.`;
      break;
    case 'Blocked Drainage':
      action = rainfall > 100 ? 'Deploy emergency desilting unit immediately to prevent severe flash flooding.' : 'Clear drainage line and remove debris obstruction within 12 hours.';
      reason = `Heavy precipitation risk (${rainfall}mm rainfall)${nearStr} + danger of localized urban inundation.`;
      break;
    case 'Broken Streetlight':
      action = 'Dispatch electrical repair crew to restore street lighting.';
      reason = `Safety hazard during evening hours +${nearStr} + citizen safety reports.`;
      break;
    case 'Garbage Accumulation':
      action = 'Deploy municipal sanitation team for immediate clearing and bin disinfection.';
      reason = `Health hazard + public nuisance near commercial & residential hubs.`;
      break;
    case 'Water Leakage':
      action = 'Isolate leaking pipe section and initiate emergency utility repair.';
      reason = `Sub-surface erosion risk + potential clean water waste of over 5,000L/day.`;
      break;
    case 'Traffic Congestion':
      action = 'Adjust automated traffic light timing sequence and deploy traffic wardens.';
      reason = `Peak bottleneck flow (${trafficVolume}% saturation) impacting transit routes.`;
      break;
    case 'Damaged Sidewalk':
      action = 'Install hazard bollards and repair broken paver tiles.';
      reason = `Pedestrian slip & trip risk near high-footfall school/bus transit zones.`;
      break;
    case 'Road Obstruction':
      action = 'Deploy heavy vehicle recovery tow to clear right-of-way.';
      reason = `Blocking key arterial lane causing tailback congestion.`;
      break;
    default:
      action = 'Inspect site and assign appropriate public works maintenance team.';
      reason = `Multi-factor risk score of ${score}/100.`;
      break;
  }

  return { action, reason };
}
