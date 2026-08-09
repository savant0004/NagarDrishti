import mongoose, { Schema, Document } from 'mongoose';
import { IssueType, IssueSeverity } from './Issue';

export type ReportStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved';

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
  aiAnalysis?: {
    detectedIssue: string;
    confidence: number;
    suggestedSeverity: string;
    isDemo: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CitizenReportSchema: Schema = new Schema(
  {
    reportId: { type: String, required: true, unique: true },
    issueType: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    streetName: { type: String, default: 'General Area' },
    severity: { type: String, default: 'Medium' },
    status: { type: String, default: 'Submitted' },
    contactEmail: { type: String, default: '' },
    aiAnalysis: {
      detectedIssue: { type: String },
      confidence: { type: Number },
      suggestedSeverity: { type: String },
      isDemo: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const CitizenReportModel = mongoose.model<ICitizenReport>('CitizenReport', CitizenReportSchema);
