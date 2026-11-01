import mongoose, { Schema, Document } from 'mongoose';

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
export const ISSUE_TYPES: IssueType[] = ['Pothole', 'Broken Streetlight', 'Blocked Drainage', 'Garbage Accumulation', 'Water Leakage', 'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction', 'Waterlogging', 'Road Damage', 'Other Urban Infrastructure'];
export const ISSUE_SEVERITIES: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
export const ISSUE_STATUSES: IssueStatus[] = ['NEW', 'VERIFIED', 'ASSIGNED', 'IN PROGRESS', 'RESOLVED'];
export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export interface INearbyInfrastructure {
  schools: number;
  hospitals: number;
  busStops: number;
  residentialCount: number;
  commercialCount: number;
}

export interface IIssue extends Document {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  severity: IssueSeverity;
  latitude: number;
  longitude: number;
  location: { type: 'Point'; coordinates: [number, number] };
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
  verifiedVisualEvidence?: boolean;
  aiDetectedSeverity?: IssueSeverity;
  priorityLevel?: RiskLevel;
  priorityExplanation?: string;
  recommendedResponseHours?: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
}

const IssueSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ISSUE_TYPES },
    severity: { type: String, required: true, enum: ISSUE_SEVERITIES, default: 'Medium' },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: undefined } },
    streetName: { type: String, required: true },
    status: { type: String, required: true, enum: ISSUE_STATUSES, default: 'NEW' },
    priorityScore: { type: Number, required: true, default: 50 },
    riskLevel: { type: String, required: true, default: 'MEDIUM' },
    reportsCount: { type: Number, min: 0, default: 1 },
    estimatedPopulationImpact: { type: Number, min: 0, default: null },
    resolvedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
    nearbyInfrastructure: {
      schools: { type: Number, default: 0 },
      hospitals: { type: Number, default: 0 },
      busStops: { type: Number, default: 0 },
      residentialCount: { type: Number, default: 0 },
      commercialCount: { type: Number, default: 0 },
    },
    recommendedAction: { type: String, required: true },
    reason: { type: String, required: true },
    priorityBreakdown: {
      severity: { type: Number, default: 10 },
      traffic: { type: Number, default: 10 },
      population: { type: Number, default: 10 },
      infrastructure: { type: Number, default: 10 },
      reports: { type: Number, default: 5 },
      duration: { type: Number, default: 5 },
      weatherRisk: { type: Number, default: 0 },
    },
    assignedTeam: { type: String, default: '' },
    assignedUserId: { type: String, default: '' },
    department: { type: String, default: '' },
    resolutionNotes: { type: String, default: '', maxlength: 3000 },
    verifiedVisualEvidence: { type: Boolean, default: false },
    aiDetectedSeverity: { type: String, enum: ISSUE_SEVERITIES },
    priorityLevel: { type: String, enum: RISK_LEVELS, default: 'MEDIUM' },
    priorityExplanation: { type: String, maxlength: 1000, default: '' },
    recommendedResponseHours: { type: Number, min: 0, default: 72 },
  },
  { timestamps: true }
);

IssueSchema.pre('validate', function () {
  const issue = this as unknown as IIssue;
  if (Number.isFinite(issue.latitude) && Number.isFinite(issue.longitude)) issue.location = { type: 'Point', coordinates: [issue.longitude, issue.latitude] };
});
IssueSchema.index({ location: '2dsphere' });

export const IssueModel = mongoose.model<IIssue>('Issue', IssueSchema);
