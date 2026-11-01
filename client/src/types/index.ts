export type IssueType =
  | 'Pothole'
  | 'Broken Streetlight'
  | 'Blocked Drainage'
  | 'Garbage Accumulation'
  | 'Water Leakage'
  | 'Traffic Congestion'
  | 'Damaged Sidewalk'
  | 'Road Obstruction'
  | 'Waterlogging'
  | 'Road Damage'
  | 'Other Urban Infrastructure';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'NEW' | 'VERIFIED' | 'ASSIGNED' | 'IN PROGRESS' | 'RESOLVED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved';
export type UserRole = 'citizen' | 'municipal_staff' | 'admin';

export interface IAuthUser { id: string; name: string; email: string; role: UserRole; department?: string; }

export interface INearbyInfrastructure {
  schools: number;
  hospitals: number;
  busStops: number;
  residentialCount: number;
  commercialCount: number;
}

export interface IIssue {
  isDemo?: boolean;
  _id?: string;
  id: string;
  title: string;
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  location?: { type: 'Point'; coordinates: [number, number] };
  streetName: string;
  status: IssueStatus;
  priorityScore: number;
  riskLevel: RiskLevel;
  reportsCount: number;
  estimatedPopulationImpact: number | null;
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
  assignedUserId?: string;
  department?: string;
  resolutionNotes?: string;
  resolutionEvidence?: string[];
  verifiedVisualEvidence?: boolean;
  aiDetectedSeverity?: IssueSeverity;
  priorityLevel?: RiskLevel;
  priorityExplanation?: string;
  recommendedResponseHours?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ICitizenReport {
  isDemo?: boolean;
  _id?: string;
  reportId: string;
  issueType: IssueType;
  description: string;
  image?: string;
  latitude: number;
  longitude: number;
  location?: { type: 'Point'; coordinates: [number, number] };
  streetName: string;
  severity: IssueSeverity;
  status: ReportStatus;
  contactEmail?: string;
  userId?: string;
  duplicateGroupId?: string;
  possibleDuplicateReportIds?: string[];
  duplicateLinkedReportIds?: string[];
  assignedTo?: string;
  department?: string;
  resolutionNotes?: string;
  resolutionEvidence?: string[];
  history?: Array<{ action: string; note?: string; actorId: string; actorRole: string; createdAt: string }>;
  priorityScore?: number;
  priorityLevel?: RiskLevel;
  priorityExplanation?: string;
  recommendedResponseHours?: number;
  resolvedAt?: string | null;
  aiAnalysis?: {
    detected?: boolean;
    category?: string;
    description?: string;
    severity?: IssueSeverity;
    severityExplanation?: string;
    detectedIssue: string;
    provider?: 'Groq';
    confidence: number;
    suggestedSeverity: string;
    evidence?: string[];
    recommendedAction?: string;
    modelIdentifier?: string;
    analyzedAt?: string;
    requiresHumanReview?: boolean;
    isDemo?: boolean;
  };
  aiAnalysisStatus?: 'analyzed' | 'not_analyzed' | 'no_image';
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
  estimatedPopulationImpact: number | null;
  aiRecommendation: string;
  assumptions?: string[];
  contributingFactors?: string[];
  historicalObservations?: { floodRelatedComplaints: number; openFloodRelatedComplaints: number; areas: string[] };
  sensorDataAvailable?: boolean;
  elevationDataAvailable?: boolean;
  dataSource?: string;
  simulatedIssues: Array<{
    id: string;
    originalPriority: number;
    simulatedPriority: number;
    originalRisk: RiskLevel;
    simulatedRisk: RiskLevel;
    isSimulatedElevated: boolean;
  }>;
}
