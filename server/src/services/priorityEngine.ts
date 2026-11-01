import { IssueType, IssueSeverity, RiskLevel, INearbyInfrastructure } from '../models/Issue';

export interface PriorityCalculationParams {
  type: IssueType;
  severity: IssueSeverity;
  reportsCount: number;
  estimatedPopulationImpact?: number | null;
  nearbyInfrastructure: INearbyInfrastructure;
  createdAt?: Date;
  trafficVolume?: number; // 0 - 100%
  weatherRainfall?: number; // 0 - 200mm
  aiDetectedSeverity?: IssueSeverity;
  verifiedVisualEvidence?: boolean;
  isResolved?: boolean;
}

export interface PriorityResult {
  priorityScore: number;
  riskLevel: RiskLevel;
  priorityLevel: RiskLevel;
  priorityExplanation: string;
  recommendedResponseHours: number;
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
  if (params.verifiedVisualEvidence && params.aiDetectedSeverity) {
    const aiSeverityScores: Record<IssueSeverity, number> = { Critical: 20, High: 16, Medium: 11, Low: 6 };
    severityScore = Math.round(severityScore * 0.6 + aiSeverityScores[params.aiDetectedSeverity] * 0.4);
  }

  // 2. Traffic Impact Score (0 - 20)
  const trafficVolume = params.trafficVolume;
  const trafficScore = trafficVolume === undefined
    ? 0
    : Math.min(20, Math.round((trafficVolume / 100) * 18) + (params.type === 'Pothole' || params.type === 'Traffic Congestion' || params.type === 'Road Obstruction' ? 2 : 0));

  // 3. Population Impact Score (0 - 20)
  const pop = params.estimatedPopulationImpact ?? null;
  let populationScore = 0;
  if (pop === null) {
    // Missing population data contributes no points and remains unknown in analytics.
  }
  else if (pop > 5000) populationScore = 20;
  else if (pop > 2500) populationScore = 17;
  else if (pop > 1000) populationScore = 14;
  else if (pop > 500) populationScore = 10;
  else if (pop > 0) populationScore = 5;

  // 4. Infrastructure Importance (0 - 15)
  const infra = params.nearbyInfrastructure || { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 };
  let infraPoints = 0;
  infraPoints += (infra.hospitals || 0) * 5;
  infraPoints += (infra.schools || 0) * 4;
  infraPoints += (infra.busStops || 0) * 3;
  infraPoints += (infra.residentialCount || 0) * 1;
  infraPoints += (infra.commercialCount || 0) * 1;
  const infrastructureScore = Math.min(15, infraPoints);

  // 5. Reports Count Score (0 - 10)
  const reports = params.reportsCount || 1;
  let reportsScore = Math.min(10, Math.round(Math.log2(reports + 1) * 3));

  // 6. Duration Score (0 - 10)
  const createdAt = params.createdAt ? new Date(params.createdAt) : new Date();
  const hoursOpen = Math.max(0, (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  let durationScore = Math.min(10, Math.floor(hoursOpen / 12) + 2);

  // 7. Weather / Environmental Risk (0 - 5)
  const rainfall = params.weatherRainfall;
  let weatherRiskScore = 0;
  if (rainfall !== undefined && (params.type === 'Blocked Drainage' || params.type === 'Water Leakage' || params.type === 'Pothole')) {
    weatherRiskScore = Math.min(5, Math.round((rainfall / 200) * 5));
  }

  // Calculate Total Score (0 - 100)
  const visualVerificationBonus = params.verifiedVisualEvidence ? 4 : 0;
  const rawTotal = severityScore + trafficScore + populationScore + infrastructureScore + reportsScore + durationScore + weatherRiskScore + visualVerificationBonus;
  const total = params.isResolved ? Math.round(rawTotal * 0.25) : Math.min(100, Math.max(5, rawTotal));

  // Determine Risk Level
  let riskLevel: RiskLevel = 'LOW';
  if (total >= 80) riskLevel = 'CRITICAL';
  else if (total >= 65) riskLevel = 'HIGH';
  else if (total >= 45) riskLevel = 'MEDIUM';

  // Generate Action & Reason
  const actionReason = generateRecommendationAndReason(params.type, riskLevel, total, infra, reports, trafficVolume, rainfall);
  const recommendedResponseHours = riskLevel === 'CRITICAL' ? 4 : riskLevel === 'HIGH' ? 24 : riskLevel === 'MEDIUM' ? 72 : 168;
  const unavailableInputs = [
    trafficVolume === undefined ? 'traffic volume' : '',
    pop === null ? 'population impact' : '',
    infraPoints === 0 ? 'nearby infrastructure' : '',
    rainfall === undefined ? 'live rainfall/weather' : '',
  ].filter(Boolean);
  const inputNote = unavailableInputs.length ? ` Unavailable inputs: ${unavailableInputs.join(', ')}; these were not treated as measured evidence.` : '';
  const priorityExplanation = `${params.isResolved ? 'Resolved record; active-response priority reduced. ' : 'Open complaint. '}${actionReason.reason}${inputNote} Citizen-reported severity is not a verified safety assessment.${params.verifiedVisualEvidence ? ' Staff-verified visual evidence contributes to priority.' : ' AI evidence is advisory until staff verified.'}`;

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
    reason: priorityExplanation,
    priorityLevel: riskLevel,
    priorityExplanation,
    recommendedResponseHours,
  };
}

function generateRecommendationAndReason(
  type: IssueType,
  riskLevel: RiskLevel,
  score: number,
  infra: INearbyInfrastructure,
  reportsCount: number,
  trafficVolume: number | undefined,
  rainfall: number | undefined
) {
  let action = '';
  let reason = '';

  const nearText = [];
  if (infra.schools > 0) nearText.push(`${infra.schools} school(s)`);
  if (infra.hospitals > 0) nearText.push(`${infra.hospitals} hospital(s)`);
  if (infra.busStops > 0) nearText.push(`${infra.busStops} bus stop(s)`);

  const nearStr = nearText.length > 0 ? ` recorded proximity to ${nearText.join(', ')}` : ' no nearby infrastructure records';
  const trafficLabel = trafficVolume === undefined ? 'Traffic data unavailable' : `Scenario traffic load (${trafficVolume}%; not a live measurement)`;
  const rainfallLabel = rainfall === undefined ? 'Live rainfall data unavailable' : `Scenario rainfall input (${rainfall}mm; not a live measurement)`;

  switch (type) {
    case 'Pothole':
      action = riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'Repair road surface with quick-set asphalt within 24 hours.' : 'Schedule resurfacing crew within 3-5 days.';
      reason = `${trafficLabel};${nearStr}; ${reportsCount} citizen report(s).`;
      break;
    case 'Blocked Drainage':
      action = rainfall !== undefined && rainfall > 100 ? 'Prioritize drainage inspection in this modeled high-rainfall scenario.' : 'Inspect and clear the reported drainage obstruction.';
      reason = `${rainfallLabel};${nearStr}; drainage response is based on the complaint and scenario inputs.`;
      break;
    case 'Broken Streetlight':
      action = 'Dispatch electrical repair crew to restore street lighting.';
      reason = `Streetlight outage reported; lighting conditions and surrounding infrastructure have not been independently measured;${nearStr}.`;
      break;
    case 'Garbage Accumulation':
      action = 'Deploy municipal sanitation team for immediate clearing and bin disinfection.';
      reason = `Garbage accumulation reported; nearby population exposure has not been measured;${nearStr}.`;
      break;
    case 'Water Leakage':
      action = 'Isolate leaking pipe section and initiate emergency utility repair.';
      reason = `Water leakage reported; flow volume and subsurface conditions have not been measured;${nearStr}.`;
      break;
    case 'Traffic Congestion':
      action = 'Adjust automated traffic light timing sequence and deploy traffic wardens.';
      reason = `${trafficLabel}; congestion impact has not been independently measured.`;
      break;
    case 'Damaged Sidewalk':
      action = 'Install hazard bollards and repair broken paver tiles.';
      reason = `Sidewalk damage reported; pedestrian exposure has not been measured;${nearStr}.`;
      break;
    case 'Road Obstruction':
      action = 'Deploy heavy vehicle recovery tow to clear right-of-way.';
      reason = `Road obstruction reported; affected lane classification and traffic impact have not been measured;${nearStr}.`;
      break;
    default:
      action = 'Inspect site and assign appropriate public works maintenance team.';
      reason = `Multi-factor risk score of ${score}/100.`;
      break;
  }

  return { action, reason };
}
