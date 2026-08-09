import { IssueType, IssueSeverity, IssueStatus, RiskLevel } from '../models/Issue';
import { ReportStatus } from '../models/CitizenReport';

export const INITIAL_STREETS = [
  { name: 'Sector 4 Road', healthScore: 61, roadCondition: 58, lightingScore: 72, drainageScore: 42, wasteScore: 68, trafficScore: 65, latitude: 12.9716, longitude: 77.5946, activeIssuesCount: 5, floodRiskPercent: 78 },
  { name: 'MG Road Arterial', healthScore: 82, roadCondition: 78, lightingScore: 92, drainageScore: 80, wasteScore: 88, trafficScore: 72, latitude: 12.9756, longitude: 77.6066, activeIssuesCount: 3, floodRiskPercent: 22 },
  { name: 'Indiranagar 100ft Road', healthScore: 74, roadCondition: 70, lightingScore: 88, drainageScore: 64, wasteScore: 75, trafficScore: 60, latitude: 12.9784, longitude: 77.6408, activeIssuesCount: 4, floodRiskPercent: 45 },
  { name: 'Outer Ring Road Expressway', healthScore: 68, roadCondition: 62, lightingScore: 80, drainageScore: 55, wasteScore: 78, trafficScore: 48, latitude: 12.9352, longitude: 77.6947, activeIssuesCount: 6, floodRiskPercent: 62 },
  { name: 'Residency Road', healthScore: 88, roadCondition: 90, lightingScore: 94, drainageScore: 85, wasteScore: 90, trafficScore: 81, latitude: 12.9663, longitude: 77.6002, activeIssuesCount: 2, floodRiskPercent: 15 },
  { name: 'Brigade Road Corridor', healthScore: 85, roadCondition: 84, lightingScore: 95, drainageScore: 82, wasteScore: 86, trafficScore: 79, latitude: 12.9722, longitude: 77.6083, activeIssuesCount: 1, floodRiskPercent: 18 },
  { name: 'Commercial Street Market', healthScore: 64, roadCondition: 60, lightingScore: 78, drainageScore: 50, wasteScore: 52, trafficScore: 55, latitude: 12.9822, longitude: 77.6083, activeIssuesCount: 4, floodRiskPercent: 58 },
  { name: 'Station Road Approach', healthScore: 58, roadCondition: 52, lightingScore: 65, drainageScore: 48, wasteScore: 55, trafficScore: 42, latitude: 12.9781, longitude: 77.5697, activeIssuesCount: 5, floodRiskPercent: 70 },
  { name: 'Metro Line Corridor', healthScore: 79, roadCondition: 76, lightingScore: 89, drainageScore: 74, wasteScore: 82, trafficScore: 75, latitude: 12.9800, longitude: 77.6200, activeIssuesCount: 2, floodRiskPercent: 30 },
  { name: 'Cyber City Tech Park Way', healthScore: 91, roadCondition: 94, lightingScore: 96, drainageScore: 90, wasteScore: 92, trafficScore: 84, latitude: 12.9250, longitude: 77.6850, activeIssuesCount: 1, floodRiskPercent: 12 },
  { name: 'Gandhi Boulevard', healthScore: 76, roadCondition: 72, lightingScore: 82, drainageScore: 70, wasteScore: 78, trafficScore: 78, latitude: 12.9600, longitude: 77.5800, activeIssuesCount: 3, floodRiskPercent: 35 },
  { name: 'Heritage Lane', healthScore: 72, roadCondition: 68, lightingScore: 75, drainageScore: 68, wasteScore: 72, trafficScore: 77, latitude: 12.9650, longitude: 77.5750, activeIssuesCount: 2, floodRiskPercent: 40 },
  { name: 'Lake View Road', healthScore: 54, roadCondition: 48, lightingScore: 60, drainageScore: 35, wasteScore: 58, trafficScore: 69, latitude: 12.9380, longitude: 77.6300, activeIssuesCount: 4, floodRiskPercent: 85 },
  { name: 'University Campus Avenue', healthScore: 86, roadCondition: 88, lightingScore: 90, drainageScore: 84, wasteScore: 88, trafficScore: 80, latitude: 12.9450, longitude: 77.5650, activeIssuesCount: 1, floodRiskPercent: 20 },
  { name: 'Industrial Bypass Expressway', healthScore: 62, roadCondition: 54, lightingScore: 70, drainageScore: 52, wasteScore: 60, trafficScore: 54, latitude: 12.9900, longitude: 77.7000, activeIssuesCount: 3, floodRiskPercent: 50 },
  { name: 'Airport Access Highway', healthScore: 93, roadCondition: 96, lightingScore: 98, drainageScore: 92, wasteScore: 94, trafficScore: 85, latitude: 13.0100, longitude: 77.6500, activeIssuesCount: 0, floodRiskPercent: 8 },
  { name: 'Market Central Plaza', healthScore: 66, roadCondition: 62, lightingScore: 74, drainageScore: 54, wasteScore: 48, trafficScore: 60, latitude: 12.9730, longitude: 77.5780, activeIssuesCount: 3, floodRiskPercent: 52 },
  { name: 'Riverfront Embankment Drive', healthScore: 59, roadCondition: 50, lightingScore: 66, drainageScore: 38, wasteScore: 64, trafficScore: 78, latitude: 12.9550, longitude: 77.6150, activeIssuesCount: 2, floodRiskPercent: 82 },
  { name: 'Residential Colony 4th Block', healthScore: 78, roadCondition: 75, lightingScore: 84, drainageScore: 76, wasteScore: 80, trafficScore: 75, latitude: 12.9280, longitude: 77.5900, activeIssuesCount: 1, floodRiskPercent: 28 },
  { name: 'Hospital Link Road', healthScore: 87, roadCondition: 85, lightingScore: 92, drainageScore: 86, wasteScore: 90, trafficScore: 82, latitude: 12.9410, longitude: 77.5950, activeIssuesCount: 1, floodRiskPercent: 16 }
];

export const INITIAL_ISSUES = [
  {
    id: 'ISSUE-001',
    title: 'Severe Stormwater Drain Blockage on Sector 4 Road',
    description: 'Main drainage conduit clogged with plastic debris and heavy silt. High risk of localized street inundation during monsoon spells.',
    type: 'Blocked Drainage' as IssueType,
    severity: 'Critical' as IssueSeverity,
    latitude: 12.9716,
    longitude: 77.5946,
    streetName: 'Sector 4 Road',
    status: 'NEW' as IssueStatus,
    priorityScore: 87,
    riskLevel: 'HIGH' as RiskLevel,
    reportsCount: 14,
    estimatedPopulationImpact: 3240,
    nearbyInfrastructure: { schools: 1, hospitals: 1, busStops: 2, residentialCount: 12, commercialCount: 8 },
    recommendedAction: 'Deploy high-pressure hydraulic suction jetter to clear conduit obstruction within 12 hours.',
    reason: 'High traffic volume + proximity to St. Jude Public School + 14 citizen flood reports.',
    priorityBreakdown: { severity: 20, traffic: 17, population: 18, infrastructure: 15, reports: 10, duration: 5, weatherRisk: 2 },
    assignedTeam: 'Water & Sewage Response Team Delta',
    createdAt: new Date(Date.now() - 36 * 3600 * 1000)
  },
  {
    id: 'ISSUE-002',
    title: 'Deep Asphalt Pothole Cluster on MG Road Arterial',
    description: 'Multiple deep pothole depressions creating hazardous driving conditions near the busy bus stop intersection.',
    type: 'Pothole' as IssueType,
    severity: 'High' as IssueSeverity,
    latitude: 12.9756,
    longitude: 77.6066,
    streetName: 'MG Road Arterial',
    status: 'IN PROGRESS' as IssueStatus,
    priorityScore: 83,
    riskLevel: 'HIGH' as RiskLevel,
    reportsCount: 9,
    estimatedPopulationImpact: 4800,
    nearbyInfrastructure: { schools: 0, hospitals: 1, busStops: 3, residentialCount: 5, commercialCount: 18 },
    recommendedAction: 'Apply hot-mix asphalt patching and compact surface within 24 hours.',
    reason: 'High daily commute flow (4,800 citizens/day) + danger of wheel damage and two-wheeler skidding.',
    priorityBreakdown: { severity: 16, traffic: 19, population: 19, infrastructure: 14, reports: 8, duration: 4, weatherRisk: 3 },
    assignedTeam: 'Road Maintenance Unit Alpha',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000)
  },
  {
    id: 'ISSUE-003',
    title: 'Uncollected Garbage Dump on Commercial Street',
    description: 'Large overflow of solid waste accumulated on pedestrian sidewalk causing foul odor and vector breeding risks.',
    type: 'Garbage Accumulation' as IssueType,
    severity: 'High' as IssueSeverity,
    latitude: 12.9822,
    longitude: 77.6083,
    streetName: 'Commercial Street Market',
    status: 'ASSIGNED' as IssueStatus,
    priorityScore: 76,
    riskLevel: 'HIGH' as RiskLevel,
    reportsCount: 11,
    estimatedPopulationImpact: 2100,
    nearbyInfrastructure: { schools: 1, hospitals: 0, busStops: 1, residentialCount: 4, commercialCount: 25 },
    recommendedAction: 'Deploy municipal compactor truck and apply sanitizing lime spray.',
    reason: 'High commercial footfall area + health hazard for shoppers and vendors.',
    priorityBreakdown: { severity: 16, traffic: 12, population: 15, infrastructure: 12, reports: 9, duration: 8, weatherRisk: 4 },
    assignedTeam: 'Sanitation Squad 4',
    createdAt: new Date(Date.now() - 60 * 3600 * 1000)
  },
  {
    id: 'ISSUE-004',
    title: 'High-Pressure Water Main Burst on Indiranagar 100ft Road',
    description: 'Underground potable water supply line ruptured, leaking 10,000L clean water/hr onto main carriage corridor.',
    type: 'Water Leakage' as IssueType,
    severity: 'Critical' as IssueSeverity,
    latitude: 12.9784,
    longitude: 77.6408,
    streetName: 'Indiranagar 100ft Road',
    status: 'VERIFIED' as IssueStatus,
    priorityScore: 89,
    riskLevel: 'CRITICAL' as RiskLevel,
    reportsCount: 18,
    estimatedPopulationImpact: 6500,
    nearbyInfrastructure: { schools: 2, hospitals: 1, busStops: 2, residentialCount: 20, commercialCount: 15 },
    recommendedAction: 'Isolate feeder valve #12 and execute emergency trench repair.',
    reason: 'Severe clean water loss + foundation erosion hazard along busy commercial hub.',
    priorityBreakdown: { severity: 20, traffic: 18, population: 20, infrastructure: 15, reports: 10, duration: 3, weatherRisk: 3 },
    assignedTeam: 'Utility Emergency Crew 1',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000)
  },
  {
    id: 'ISSUE-005',
    title: 'Dark Zone: 6 Broken Streetlights on Outer Ring Road',
    description: 'Cluster of LED streetlights unlit along 300m stretch creating severe night driving hazard.',
    type: 'Broken Streetlight' as IssueType,
    severity: 'Medium' as IssueSeverity,
    latitude: 12.9352,
    longitude: 77.6947,
    streetName: 'Outer Ring Road Expressway',
    status: 'NEW' as IssueStatus,
    priorityScore: 68,
    riskLevel: 'MEDIUM' as RiskLevel,
    reportsCount: 6,
    estimatedPopulationImpact: 3500,
    nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 2, residentialCount: 15, commercialCount: 10 },
    recommendedAction: 'Replace blown capacitors and damaged cable junction box within 48 hours.',
    reason: 'Pedestrian safety risk during night hours on high-speed expressway bypass.',
    priorityBreakdown: { severity: 11, traffic: 16, population: 16, infrastructure: 10, reports: 6, duration: 6, weatherRisk: 3 },
    assignedTeam: '',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000)
  },
  {
    id: 'ISSUE-006',
    title: 'Severe Peak-Hour Traffic Gridlock at Station Approach',
    description: 'Signal timing malfunction causing 1.5km vehicle tailback near Railway Station gates.',
    type: 'Traffic Congestion' as IssueType,
    severity: 'High' as IssueSeverity,
    latitude: 12.9781,
    longitude: 77.5697,
    streetName: 'Station Road Approach',
    status: 'IN PROGRESS' as IssueStatus,
    priorityScore: 81,
    riskLevel: 'HIGH' as RiskLevel,
    reportsCount: 22,
    estimatedPopulationImpact: 8200,
    nearbyInfrastructure: { schools: 1, hospitals: 1, busStops: 4, residentialCount: 8, commercialCount: 30 },
    recommendedAction: 'Manual override of automated signals & traffic police control deployment.',
    reason: 'Major transit hub bottleneck affecting railway passengers & commuter buses.',
    priorityBreakdown: { severity: 16, traffic: 20, population: 20, infrastructure: 14, reports: 10, duration: 1, weatherRisk: 0 },
    assignedTeam: 'Traffic Control Division Central',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000)
  },
  {
    id: 'ISSUE-007',
    title: 'Collapsed Sidewalk Pavers near Lake View Road School',
    description: 'Heavy rain caused sub-base erosion, resulting in 4m sidewalk collapse near elementary school gate.',
    type: 'Damaged Sidewalk' as IssueType,
    severity: 'High' as IssueSeverity,
    latitude: 12.9380,
    longitude: 77.6300,
    streetName: 'Lake View Road',
    status: 'VERIFIED' as IssueStatus,
    priorityScore: 74,
    riskLevel: 'HIGH' as RiskLevel,
    reportsCount: 8,
    estimatedPopulationImpact: 1400,
    nearbyInfrastructure: { schools: 2, hospitals: 0, busStops: 1, residentialCount: 18, commercialCount: 2 },
    recommendedAction: 'Erect safety barricades immediately and backfill sub-base with crushed stone.',
    reason: 'Direct safety hazard to school children and walking commuters.',
    priorityBreakdown: { severity: 16, traffic: 10, population: 12, infrastructure: 15, reports: 7, duration: 9, weatherRisk: 5 },
    assignedTeam: 'Civic Infrastructure Works',
    createdAt: new Date(Date.now() - 96 * 3600 * 1000)
  },
  {
    id: 'ISSUE-008',
    title: 'Fallen Tree Branch Obstructing Riverfront Drive',
    description: 'Large storm bough fallen across left lane blocking bus transit route.',
    type: 'Road Obstruction' as IssueType,
    severity: 'Medium' as IssueSeverity,
    latitude: 12.9550,
    longitude: 77.6150,
    streetName: 'Riverfront Embankment Drive',
    status: 'ASSIGNED' as IssueStatus,
    priorityScore: 62,
    riskLevel: 'MEDIUM' as RiskLevel,
    reportsCount: 5,
    estimatedPopulationImpact: 1900,
    nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 2, residentialCount: 10, commercialCount: 4 },
    recommendedAction: 'Deploy chainsaw forestry team to clear timber within 4 hours.',
    reason: 'Obstruction causing single-lane bottleneck along river corridor.',
    priorityBreakdown: { severity: 11, traffic: 14, population: 14, infrastructure: 8, reports: 5, duration: 5, weatherRisk: 5 },
    assignedTeam: 'Forestry & Parks Rescue',
    createdAt: new Date(Date.now() - 14 * 3600 * 1000)
  }
];

export function generateSeedReports() {
  const reports = [];
  const types: IssueType[] = ['Pothole', 'Broken Streetlight', 'Blocked Drainage', 'Garbage Accumulation', 'Water Leakage', 'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction'];
  const severities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
  const statuses: ReportStatus[] = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

  for (let i = 1; i <= 100; i++) {
    const padId = i.toString().padStart(5, '0');
    const street = INITIAL_STREETS[i % INITIAL_STREETS.length];
    const type = types[i % types.length];
    const status = statuses[i % statuses.length];
    const severity = severities[i % severities.length];

    reports.push({
      reportId: `ST-2026-${padId}`,
      issueType: type,
      description: `Citizen report regarding ${type.toLowerCase()} near ${street.name}. Please inspect urgently.`,
      image: '',
      latitude: street.latitude + (Math.sin(i) * 0.005),
      longitude: street.longitude + (Math.cos(i) * 0.005),
      streetName: street.name,
      severity,
      status,
      contactEmail: `citizen${i}@gmail.com`,
      aiAnalysis: {
        detectedIssue: type,
        confidence: 88 + (i % 10),
        suggestedSeverity: severity,
        isDemo: true
      },
      createdAt: new Date(Date.now() - (i * 12 * 3600 * 1000))
    });
  }
  return reports;
}
