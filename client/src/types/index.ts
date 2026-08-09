export type IssueType =
  | 'Pothole'
  | 'Broken Streetlight'
  | 'Blocked Drainage'
  | 'Garbage Accumulation'
  | 'Water Leakage'
  | 'Traffic Congestion'
  | 'Damaged Sidewalk'
  | 'Road Obstruction';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'NEW' | 'VERIFIED' | 'ASSIGNED' | 'IN PROGRESS' | 'RESOLVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved';

export interface INearbyInfrastructure {
  schools: number;
  hospitals: number;
  busStops: number;
  residentialCount: number;
  commercialCount: number;
}

export interface IIssue {
  _id?: string;
  id: string;
  title: string;
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  streetName: string;
  status: IssueStatus;
  priorityScore: number;
  riskLevel: RiskLevel;
  reportsCount: number;
  estimatedPopulationImpact: number;
  nearbyInfrastructure: INearbyInfrastructure;
  recommendedAction: string;
  reason: string;
  priorityBreakdown?: {
    severity: number;
    traffic: number;
    population: number;
    infrastructure: number;
    reports: number;
    duration: number;
    weatherRisk: number;
  };
  assignedTeam?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICitizenReport {
  _id?: string;
  reportId: string;
  issueType: IssueType;
  description: string;
  image?: string;
  latitude: number;
  longitude: number;
  streetName: string;
  severity: IssueSeverity;
  status: ReportStatus;
  contactEmail?: string;
  aiAnalysis?: {
    detectedIssue: string;
    confidence: number;
    suggestedSeverity: string;
    isDemo: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IStreet {
  _id?: string;
  name: string;
  healthScore: number;
  roadCondition: number;
  lightingScore: number;
  drainageScore: number;
  wasteScore: number;
  trafficScore: number;
  latitude: number;
  longitude: number;
  activeIssuesCount: number;
  floodRiskPercent: number;
}

export interface ISimulationResult {
  params: {
    rainfall: number;
    traffic: number;
    drainageCapacity: number;
    garbageDelay: number;
  };
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
