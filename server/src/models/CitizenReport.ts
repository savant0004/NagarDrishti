import mongoose, { Schema, Document } from 'mongoose';
import { IssueType, IssueSeverity } from './Issue';

export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved';
export const REPORT_CATEGORIES: IssueType[] = ['Pothole', 'Broken Streetlight', 'Blocked Drainage', 'Garbage Accumulation', 'Water Leakage', 'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction', 'Waterlogging', 'Road Damage', 'Other Urban Infrastructure'];
export const REPORT_SEVERITIES: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
export const REPORT_STATUSES: ReportStatus[] = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

export interface ICitizenReport extends Document {
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
  associatedIssueId?: string;
  userId: string;
  resolvedAt?: Date | null;
  idempotencyKey?: string;
  isDemo?: boolean;
  aiAnalysis?: {
    detected: boolean;
    category: string;
    description: string;
    severity: IssueSeverity;
    severityExplanation: string;
    detectedIssue: string;
    provider: 'Groq';
    confidence: number;
    suggestedSeverity: IssueSeverity;
    evidence: string[];
    recommendedAction: string;
    modelIdentifier: string;
    analyzedAt: Date;
    requiresHumanReview: boolean;
  };
  aiAnalysisStatus: 'analyzed' | 'not_analyzed' | 'no_image';
  createdAt: Date;
  updatedAt: Date;
}

const CitizenReportSchema: Schema = new Schema(
  {
    reportId: { type: String, required: true, unique: true },
    issueType: { type: String, required: true, enum: REPORT_CATEGORIES },
    description: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
    image: { type: String, default: '' },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    associatedIssueId: { type: String, default: '' },
    userId: { type: String, required: true, index: true },
    idempotencyKey: { type: String, default: undefined, maxlength: 128 },
    streetName: { type: String, default: 'General Area' },
    severity: { type: String, enum: REPORT_SEVERITIES, default: 'Medium' },
    status: { type: String, enum: REPORT_STATUSES, default: 'Submitted' },
    resolvedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
    contactEmail: { type: String, default: '' },
    aiAnalysisStatus: { type: String, enum: ['analyzed', 'not_analyzed', 'no_image'], default: 'no_image' },
    aiAnalysis: {
      detected: { type: Boolean },
      category: { type: String },
      description: { type: String },
      severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
      severityExplanation: { type: String },
      detectedIssue: { type: String },
      provider: { type: String, enum: ['Groq'] },
      confidence: { type: Number },
      suggestedSeverity: { type: String },
      evidence: { type: [String], default: undefined },
      recommendedAction: { type: String },
      modelIdentifier: { type: String },
      analyzedAt: { type: Date },
      requiresHumanReview: { type: Boolean },
    },
  },
  { timestamps: true }
);

CitizenReportSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });

export const CitizenReportModel = mongoose.model<ICitizenReport>('CitizenReport', CitizenReportSchema);
