import { IssueType, IssueSeverity } from '../models/Issue';

export interface AIVisionResult {
  detectedIssue: IssueType;
  confidence: number;
  suggestedSeverity: IssueSeverity;
  tags: string[];
  descriptionSummary: string;
  isDemo: boolean;
  explanation: string;
  providerName: string;
}

export interface IVisionProvider {
  analyzeImage(filename?: string, mimetype?: string): AIVisionResult;
}

export class DemoVisionProvider implements IVisionProvider {
  public analyzeImage(filename?: string, mimetype?: string): AIVisionResult {
    const lower = (filename || '').toLowerCase();

    let detectedIssue: IssueType = 'Pothole';
    let confidence = 91;
    let suggestedSeverity: IssueSeverity = 'High';
    let tags = ['asphalt_fracture', 'road_hazard', 'surface_depression'];
    let descriptionSummary = 'Severe road surface asphalt crack/pothole detected with high risk to vehicular wheel axles.';

    if (lower.includes('light') || lower.includes('lamp') || lower.includes('pole')) {
      detectedIssue = 'Broken Streetlight';
      confidence = 94;
      suggestedSeverity = 'Medium';
      tags = ['dark_zone', 'broken_fixture', 'electrical_wire'];
      descriptionSummary = 'Damaged street luminaire fixture identified. Potential evening pedestrian dark spot.';
    } else if (lower.includes('drain') || lower.includes('water') || lower.includes('flood') || lower.includes('pipe')) {
      detectedIssue = 'Blocked Drainage';
      confidence = 89;
      suggestedSeverity = 'Critical';
      tags = ['silt_buildup', 'plastic_waste', 'overflow_risk'];
      descriptionSummary = 'Stormwater channel blocked by solid waste debris. High risk of localized inundation.';
    } else if (lower.includes('trash') || lower.includes('garbage') || lower.includes('waste') || lower.includes('bin')) {
      detectedIssue = 'Garbage Accumulation';
      confidence = 96;
      suggestedSeverity = 'High';
      tags = ['uncollected_refuse', 'sanitation_hazard', 'organic_dump'];
      descriptionSummary = 'Overflowing public refuse heap detected near sidewalk corridor.';
    } else if (lower.includes('traffic') || lower.includes('jam') || lower.includes('car')) {
      detectedIssue = 'Traffic Congestion';
      confidence = 88;
      suggestedSeverity = 'High';
      tags = ['gridlock', 'vehicle_queue', 'lane_standstill'];
      descriptionSummary = 'Heavy vehicular tailback queue detected spanning intersection.';
    }

    return {
      detectedIssue,
      confidence,
      suggestedSeverity,
      tags,
      descriptionSummary,
      isDemo: true,
      providerName: 'Demo Vision Prototype',
      explanation: 'Demo analysis — ready for integration with a production computer-vision model (ResNet-50 / YOLOv8 API).',
    };
  }
}

const defaultProvider: IVisionProvider = new DemoVisionProvider();

export function analyzeUploadedImage(filename?: string, mimetype?: string): AIVisionResult {
  return defaultProvider.analyzeImage(filename, mimetype);
}
