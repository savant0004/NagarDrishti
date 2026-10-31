import mongoose, { Schema, Document } from 'mongoose';

export interface IStreet extends Document {
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

const StreetSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    healthScore: { type: Number, required: true, default: 80 },
    roadCondition: { type: Number, required: true, default: 80 },
    lightingScore: { type: Number, required: true, default: 85 },
    drainageScore: { type: Number, required: true, default: 75 },
    wasteScore: { type: Number, required: true, default: 85 },
    trafficScore: { type: Number, required: true, default: 75 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    activeIssuesCount: { type: Number, default: 0 },
    floodRiskPercent: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const StreetModel = mongoose.model<IStreet>('Street', StreetSchema);
