import mongoose, { Schema, Document } from 'mongoose';

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
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    severity: { type: String, required: true, default: 'Medium' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    streetName: { type: String, required: true },
    status: { type: String, required: true, default: 'NEW' },
    priorityScore: { type: Number, required: true, default: 50 },
    riskLevel: { type: String, required: true, default: 'MEDIUM' },
    reportsCount: { type: Number, default: 1 },
    estimatedPopulationImpact: { type: Number, default: 500 },
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
  },
  { timestamps: true }
);

export const IssueModel = mongoose.model<IIssue>('Issue', IssueSchema);
