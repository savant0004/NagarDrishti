import axios from 'axios';
import { IIssue, ICitizenReport, IStreet, ISimulationResult } from '../types';

// In development, Vite proxies /api → localhost:5000
// In production (Vercel/Netlify/Render), set VITE_API_URL to your backend URL
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';


export const api = {
  // Issues
  async getIssues(): Promise<IIssue[]> {
    try {
      const res = await axios.get(`${API_BASE}/issues`);
      return res.data.data;
    } catch {
      return getFallbackIssues();
    }
  },

  async getIssueById(id: string): Promise<IIssue | null> {
    try {
      const res = await axios.get(`${API_BASE}/issues/${id}`);
      return res.data.data;
    } catch {
      return getFallbackIssues().find((i) => i.id === id) || null;
    }
  },

  async updateIssueStatus(id: string, status: string, assignedTeam?: string): Promise<IIssue | null> {
    try {
      const res = await axios.patch(`${API_BASE}/issues/${id}`, { status, assignedTeam });
      return res.data.data;
    } catch {
      const fallback = getFallbackIssues().find((i) => i.id === id);
      if (fallback) {
        fallback.status = status as any;
        if (assignedTeam) fallback.assignedTeam = assignedTeam;
        return fallback;
      }
      return null;
    }
  },

  // Reports
  async getReports(): Promise<ICitizenReport[]> {
    try {
      const res = await axios.get(`${API_BASE}/reports`);
      return res.data.data;
    } catch {
      return getFallbackReports();
    }
  },

  async getReportById(reportId: string): Promise<ICitizenReport | null> {
    try {
      const res = await axios.get(`${API_BASE}/reports/${reportId}`);
      return res.data.data;
    } catch {
      return getFallbackReports().find((r) => r.reportId === reportId) || null;
    }
  },

  async createReport(formData: FormData): Promise<{ report: ICitizenReport; createdIssue?: IIssue }> {
    try {
      const res = await axios.post(`${API_BASE}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { report: res.data.data, createdIssue: res.data.createdIssue };
    } catch {
      // Offline fallback creation
      const issueType = (formData.get('issueType') as any) || 'Pothole';
      const description = (formData.get('description') as string) || 'Reported issue';
      const lat = Number(formData.get('latitude') || 12.9716);
      const lng = Number(formData.get('longitude') || 77.5946);
      const reportId = `ST-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const newReport: ICitizenReport = {
        reportId,
        issueType,
        description,
        latitude: lat,
        longitude: lng,
        streetName: (formData.get('streetName') as string) || 'Sector 4 Road',
        severity: (formData.get('severity') as any) || 'High',
        status: 'Submitted',
        aiAnalysis: {
          detectedIssue: issueType,
          confidence: 91,
          suggestedSeverity: 'High',
          isDemo: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { report: newReport };
    }
  },

  async analyzeImage(file?: File, filename?: string) {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        const res = await axios.post(`${API_BASE}/reports/analyze-image`, formData);
        return res.data.data;
      } else {
        const res = await axios.post(`${API_BASE}/reports/analyze-image`, { filename });
        return res.data.data;
      }
    } catch {
      return {
        detectedIssue: 'Road Damage - Pothole',
        confidence: 91,
        suggestedSeverity: 'High',
        tags: ['asphalt_fracture', 'road_hazard'],
        isDemo: true,
        explanation: 'Demo AI Vision Analysis (fallback offline mode).',
      };
    }
  },

  // Streets
  async getStreets(): Promise<IStreet[]> {
    try {
      const res = await axios.get(`${API_BASE}/streets`);
      return res.data.data;
    } catch {
      return getFallbackStreets();
    }
  },

  // Analytics
  async getAnalytics(): Promise<any> {
    try {
      const res = await axios.get(`${API_BASE}/analytics`);
      return res.data.data;
    } catch {
      return {
        totalActiveIssues: 8,
        criticalIssuesCount: 2,
        resolvedCount: 140,
        totalCitizenReports: 7,
        avgResolutionHours: 26.8,
        totalPopulationImpacted: 41840,
        categoryDistribution: [
          { name: 'Pothole', count: 18 },
          { name: 'Blocked Drainage', count: 12 },
          { name: 'Broken Streetlight', count: 15 },
          { name: 'Garbage', count: 10 },
          { name: 'Water Leakage', count: 8 },
        ],
        riskDistribution: [
          { name: 'CRITICAL', value: 2 },
          { name: 'HIGH', value: 4 },
          { name: 'MEDIUM', value: 2 },
          { name: 'LOW', value: 0 },
        ],
        streetsMonitored: 8,
      };
    }
  },

  // Simulator
  async runSimulation(params: { rainfall: number; traffic: number; drainageCapacity: number; garbageDelay: number }): Promise<ISimulationResult> {
    try {
      const res = await axios.post(`${API_BASE}/simulation`, params);
      return res.data.data;
    } catch {
      // Local fallback simulation
      const { rainfall, traffic, drainageCapacity } = params;
      const floodRiskPercent = Math.min(98, Math.max(10, Math.round(rainfall * 0.45 + (100 - drainageCapacity) * 0.35)));
      const affectedRoadsCount = Math.min(18, Math.max(1, Math.round(floodRiskPercent / 12)));

      return {
        params,
        drainageRiskLevel: floodRiskPercent >= 75 ? 'CRITICAL' : floodRiskPercent >= 50 ? 'HIGH' : 'MEDIUM',
        floodRiskPercent,
        affectedRoadsCount,
        estimatedPopulationImpact: affectedRoadsCount * 1200 * (1 + rainfall / 150),
        aiRecommendation:
          rainfall > 100
            ? `CRITICAL WARNING: Rainfall level at ${rainfall}mm. Clear drainage blockage on Sector 4 Road & Indiranagar immediately to avert flooding for ~${(affectedRoadsCount * 1200).toLocaleString()} citizens.`
            : 'NORMAL OPERATIONS: System parameters within standard threshold.',
        simulatedIssues: getFallbackIssues().map((i) => ({
          id: i.id,
          originalPriority: i.priorityScore,
          simulatedPriority: Math.min(100, i.priorityScore + Math.round(rainfall * 0.15)),
          originalRisk: i.riskLevel,
          simulatedRisk: rainfall > 100 ? 'CRITICAL' : i.riskLevel,
          isSimulatedElevated: rainfall > 60,
        })),
      };
    }
  },

  async reseedData(): Promise<void> {
    try {
      await axios.post(`${API_BASE}/seed`);
    } catch {
      // Handled
    }
  },
};

// Fallback Seed Data Helpers
function getFallbackIssues(): IIssue[] {
  return [
    {
      id: 'ISSUE-001',
      title: 'Severe Stormwater Drain Blockage on Sector 4 Road',
      description: 'Main drainage conduit clogged with plastic debris and heavy silt. Overflow likely during moderate rainfall events.',
      type: 'Blocked Drainage',
      severity: 'Critical',
      latitude: 12.9716,
      longitude: 77.5946,
      streetName: 'Sector 4 Road',
      status: 'NEW',
      priorityScore: 87,
      riskLevel: 'CRITICAL',
      reportsCount: 14,
      estimatedPopulationImpact: 3240,
      nearbyInfrastructure: { schools: 1, hospitals: 1, busStops: 2, residentialCount: 12, commercialCount: 8 },
      recommendedAction: 'Deploy high-pressure hydraulic suction jetter to clear conduit obstruction within 12 hours.',
      reason: 'High traffic volume + proximity to school + repeated citizen reports.',
      priorityBreakdown: { severity: 20, traffic: 17, population: 18, infrastructure: 15, reports: 10, duration: 5, weatherRisk: 2 },
      assignedTeam: 'Water & Sewage Response Team Delta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-002',
      title: 'Deep Asphalt Pothole Cluster on MG Road Arterial',
      description: 'Multiple deep pothole depressions creating hazardous driving conditions. 4 vehicles damaged this week.',
      type: 'Pothole',
      severity: 'High',
      latitude: 12.9756,
      longitude: 77.6066,
      streetName: 'MG Road Arterial',
      status: 'IN PROGRESS',
      priorityScore: 83,
      riskLevel: 'HIGH',
      reportsCount: 9,
      estimatedPopulationImpact: 4800,
      nearbyInfrastructure: { schools: 0, hospitals: 1, busStops: 3, residentialCount: 5, commercialCount: 18 },
      recommendedAction: 'Apply hot-mix asphalt patching within 24 hours.',
      reason: 'High daily commute flow + danger of wheel damage and skidding.',
      priorityBreakdown: { severity: 16, traffic: 19, population: 19, infrastructure: 14, reports: 8, duration: 4, weatherRisk: 3 },
      assignedTeam: 'Road Maintenance Unit Alpha',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-003',
      title: 'Uncollected Garbage Dump on Commercial Street',
      description: 'Large overflow of solid waste accumulated on pedestrian sidewalk near fruit market. Health hazard for shoppers.',
      type: 'Garbage Accumulation',
      severity: 'High',
      latitude: 12.9822,
      longitude: 77.6083,
      streetName: 'Commercial Street Market',
      status: 'ASSIGNED',
      priorityScore: 76,
      riskLevel: 'HIGH',
      reportsCount: 11,
      estimatedPopulationImpact: 2100,
      nearbyInfrastructure: { schools: 1, hospitals: 0, busStops: 1, residentialCount: 4, commercialCount: 25 },
      recommendedAction: 'Deploy municipal compactor truck and apply sanitizing spray.',
      reason: 'High footfall market area + sanitation health hazard.',
      priorityBreakdown: { severity: 16, traffic: 12, population: 15, infrastructure: 12, reports: 9, duration: 8, weatherRisk: 4 },
      assignedTeam: 'Sanitation Squad 4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-004',
      title: 'High-Pressure Water Main Burst on Indiranagar 100ft Road',
      description: 'Underground potable water line ruptured, leaking 10,000L clean water/hr. Road surface sinking.',
      type: 'Water Leakage',
      severity: 'Critical',
      latitude: 12.9784,
      longitude: 77.6408,
      streetName: 'Indiranagar 100ft Road',
      status: 'VERIFIED',
      priorityScore: 89,
      riskLevel: 'CRITICAL',
      reportsCount: 18,
      estimatedPopulationImpact: 6500,
      nearbyInfrastructure: { schools: 2, hospitals: 1, busStops: 2, residentialCount: 20, commercialCount: 15 },
      recommendedAction: 'Isolate feeder valve #12 and execute emergency trench repair.',
      reason: 'Severe clean water loss + foundation erosion risk.',
      priorityBreakdown: { severity: 20, traffic: 18, population: 20, infrastructure: 15, reports: 10, duration: 3, weatherRisk: 3 },
      assignedTeam: 'Utility Emergency Crew 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-005',
      title: '12 Broken Streetlights on Outer Ring Road',
      description: 'Consecutive lamp failures along ORR exit 7. Night-time accident rate has doubled this month.',
      type: 'Broken Streetlight',
      severity: 'Medium',
      latitude: 12.9352,
      longitude: 77.6947,
      streetName: 'Outer Ring Road Expressway',
      status: 'ASSIGNED',
      priorityScore: 64,
      riskLevel: 'HIGH',
      reportsCount: 6,
      estimatedPopulationImpact: 8200,
      nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 4, residentialCount: 3, commercialCount: 12 },
      recommendedAction: 'Replace MSEDCL HPS lamp units and check feeder circuit within 48 hours.',
      reason: 'High-speed expressway + dark stretch + accident history.',
      priorityBreakdown: { severity: 12, traffic: 18, population: 14, infrastructure: 10, reports: 5, duration: 3, weatherRisk: 2 },
      assignedTeam: 'Electrical Maintenance Team Beta',
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-006',
      title: 'Damaged Sidewalk Tiles on Koramangala 5th Block',
      description: 'Multiple broken and uplifted sidewalk tiles creating trip hazard. Elderly and disabled residents affected.',
      type: 'Damaged Sidewalk',
      severity: 'Medium',
      latitude: 12.9347,
      longitude: 77.6205,
      streetName: 'Koramangala 5th Block Road',
      status: 'NEW',
      priorityScore: 52,
      riskLevel: 'MEDIUM',
      reportsCount: 5,
      estimatedPopulationImpact: 1800,
      nearbyInfrastructure: { schools: 1, hospitals: 0, busStops: 2, residentialCount: 18, commercialCount: 6 },
      recommendedAction: 'Replace damaged interlocking tiles and reset subsurface bedding.',
      reason: 'High pedestrian footfall area + elderly residential population.',
      priorityBreakdown: { severity: 10, traffic: 8, population: 14, infrastructure: 8, reports: 4, duration: 5, weatherRisk: 3 },
      assignedTeam: 'Civil Works Squad 7',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'ISSUE-007',
      title: 'Road Obstruction — Illegal Construction Debris on HSR Layout',
      description: 'Construction waste dumped on carriageway narrowing 4-lane road to 2 lanes. Creating severe peak-hour gridlock.',
      type: 'Road Obstruction',
      severity: 'High',
      latitude: 12.9116,
      longitude: 77.6474,
      streetName: 'HSR Layout Sector 2',
      status: 'NEW',
      priorityScore: 71,
      riskLevel: 'HIGH',
      reportsCount: 8,
      estimatedPopulationImpact: 3400,
      nearbyInfrastructure: { schools: 1, hospitals: 0, busStops: 2, residentialCount: 22, commercialCount: 10 },
      recommendedAction: 'Issue removal notice to construction site owner. Deploy loader for clearance.',
      reason: 'Arterial route blockage + school commute risk.',
      priorityBreakdown: { severity: 16, traffic: 18, population: 15, infrastructure: 10, reports: 7, duration: 2, weatherRisk: 3 },
      assignedTeam: 'Traffic Management Cell',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ISSUE-008',
      title: 'Major Traffic Congestion at Silk Board Junction',
      description: 'Signal timing mismatch causing 45+ minute delays during peak hours. Emergency vehicle access compromised.',
      type: 'Traffic Congestion',
      severity: 'High',
      latitude: 12.9172,
      longitude: 77.6220,
      streetName: 'Silk Board Junction',
      status: 'VERIFIED',
      priorityScore: 78,
      riskLevel: 'HIGH',
      reportsCount: 22,
      estimatedPopulationImpact: 12000,
      nearbyInfrastructure: { schools: 0, hospitals: 2, busStops: 6, residentialCount: 8, commercialCount: 30 },
      recommendedAction: 'Adjust adaptive signal timing algorithm. Deploy traffic wardens at peak hours 8-10AM and 5-8PM.',
      reason: 'Highest traffic volume junction in south Bengaluru + hospital proximity.',
      priorityBreakdown: { severity: 16, traffic: 20, population: 20, infrastructure: 12, reports: 10, duration: 0, weatherRisk: 0 },
      assignedTeam: 'Smart Traffic Operations Center',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getFallbackReports(): ICitizenReport[] {
  return [
    {
      reportId: 'ST-2026-00482',
      issueType: 'Blocked Drainage',
      description: 'Stormwater drain overflowing into road near Sector 4 elementary school. Kids unable to walk safely.',
      latitude: 12.9716,
      longitude: 77.5946,
      streetName: 'Sector 4 Road',
      severity: 'Critical',
      status: 'In Progress',
      contactEmail: 'citizen.rahul@gmail.com',
      aiAnalysis: { detectedIssue: 'Blocked Drainage', confidence: 94, suggestedSeverity: 'Critical', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      reportId: 'ST-2026-00391',
      issueType: 'Pothole',
      description: 'Deep dangerous hole near bus stop 3 on MG Road. My two-wheeler got damaged this morning.',
      latitude: 12.9756,
      longitude: 77.6066,
      streetName: 'MG Road Arterial',
      severity: 'High',
      status: 'Assigned',
      contactEmail: 'anita.p@yahoo.com',
      aiAnalysis: { detectedIssue: 'Pothole', confidence: 91, suggestedSeverity: 'High', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      reportId: 'ST-2026-00519',
      issueType: 'Broken Streetlight',
      description: 'Three streetlights not working near ORR exit 7. Very dark and unsafe at night.',
      latitude: 12.9352,
      longitude: 77.6947,
      streetName: 'Outer Ring Road Expressway',
      severity: 'Medium',
      status: 'Under Review',
      contactEmail: 'suresh.k@gmail.com',
      aiAnalysis: { detectedIssue: 'Broken Streetlight', confidence: 88, suggestedSeverity: 'Medium', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      reportId: 'ST-2026-00541',
      issueType: 'Water Leakage',
      description: 'Huge water pipe burst on 100ft road. Water wasting since yesterday morning. Road getting flooded.',
      latitude: 12.9784,
      longitude: 77.6408,
      streetName: 'Indiranagar 100ft Road',
      severity: 'Critical',
      status: 'Submitted',
      contactEmail: 'priya.m@hotmail.com',
      aiAnalysis: { detectedIssue: 'Water Leakage', confidence: 96, suggestedSeverity: 'Critical', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      reportId: 'ST-2026-00462',
      issueType: 'Garbage Accumulation',
      description: 'Garbage not collected for 5 days near Commercial Street. Stench is unbearable. Flies everywhere.',
      latitude: 12.9822,
      longitude: 77.6083,
      streetName: 'Commercial Street Market',
      severity: 'High',
      status: 'Assigned',
      contactEmail: 'ramesh.t@gmail.com',
      aiAnalysis: { detectedIssue: 'Garbage Accumulation', confidence: 89, suggestedSeverity: 'High', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      reportId: 'ST-2026-00577',
      issueType: 'Damaged Sidewalk',
      description: 'Broken tiles on footpath near Koramangala 5B bus stop. Elderly person fell yesterday.',
      latitude: 12.9347,
      longitude: 77.6205,
      streetName: 'Koramangala 5th Block Road',
      severity: 'Medium',
      status: 'Submitted',
      contactEmail: '',
      aiAnalysis: { detectedIssue: 'Damaged Sidewalk', confidence: 82, suggestedSeverity: 'Medium', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      reportId: 'ST-2026-00598',
      issueType: 'Road Obstruction',
      description: 'Construction rubble blocking half the road on HSR sector 2. Traffic jam lasting hours.',
      latitude: 12.9116,
      longitude: 77.6474,
      streetName: 'HSR Layout Sector 2',
      severity: 'High',
      status: 'Submitted',
      contactEmail: 'deepa.r@gmail.com',
      aiAnalysis: { detectedIssue: 'Road Obstruction', confidence: 85, suggestedSeverity: 'High', isDemo: true },
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getFallbackStreets(): IStreet[] {
  return [
    { name: 'Sector 4 Road', healthScore: 61, roadCondition: 58, lightingScore: 72, drainageScore: 42, wasteScore: 68, trafficScore: 65, latitude: 12.9716, longitude: 77.5946, activeIssuesCount: 5, floodRiskPercent: 78 },
    { name: 'MG Road Arterial', healthScore: 82, roadCondition: 78, lightingScore: 92, drainageScore: 80, wasteScore: 88, trafficScore: 72, latitude: 12.9756, longitude: 77.6066, activeIssuesCount: 3, floodRiskPercent: 22 },
    { name: 'Indiranagar 100ft Road', healthScore: 74, roadCondition: 70, lightingScore: 88, drainageScore: 64, wasteScore: 75, trafficScore: 60, latitude: 12.9784, longitude: 77.6408, activeIssuesCount: 4, floodRiskPercent: 45 },
    { name: 'Outer Ring Road Expressway', healthScore: 68, roadCondition: 62, lightingScore: 80, drainageScore: 55, wasteScore: 78, trafficScore: 48, latitude: 12.9352, longitude: 77.6947, activeIssuesCount: 6, floodRiskPercent: 62 },
    { name: 'Commercial Street Market', healthScore: 56, roadCondition: 52, lightingScore: 65, drainageScore: 60, wasteScore: 32, trafficScore: 70, latitude: 12.9822, longitude: 77.6083, activeIssuesCount: 4, floodRiskPercent: 40 },
    { name: 'Koramangala 5th Block Road', healthScore: 77, roadCondition: 72, lightingScore: 85, drainageScore: 74, wasteScore: 82, trafficScore: 70, latitude: 12.9347, longitude: 77.6205, activeIssuesCount: 2, floodRiskPercent: 18 },
    { name: 'HSR Layout Sector 2', healthScore: 71, roadCondition: 68, lightingScore: 75, drainageScore: 70, wasteScore: 72, trafficScore: 70, latitude: 12.9116, longitude: 77.6474, activeIssuesCount: 3, floodRiskPercent: 30 },
    { name: 'Silk Board Junction', healthScore: 49, roadCondition: 55, lightingScore: 78, drainageScore: 38, wasteScore: 60, trafficScore: 14, latitude: 12.9172, longitude: 77.6220, activeIssuesCount: 8, floodRiskPercent: 55 },
  ];
}
