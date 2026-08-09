import mongoose from 'mongoose';
import { IssueModel, IIssue } from '../models/Issue';
import { CitizenReportModel, ICitizenReport } from '../models/CitizenReport';
import { StreetModel, IStreet } from '../models/Street';
import { INITIAL_STREETS, INITIAL_ISSUES, generateSeedReports } from '../data/seedData';
import { calculatePriorityScore } from './priorityEngine';

class DataStoreService {
  private isMongoConnected: boolean = false;
  private memoryIssues: Map<string, any> = new Map();
  private memoryReports: Map<string, any> = new Map();
  private memoryStreets: Map<string, any> = new Map();

  constructor() {
    this.seedMemoryStore();
  }

  public setMongoConnection(connected: boolean) {
    this.isMongoConnected = connected;
    if (connected) {
      console.log('🟢 MongoDB Connection Active. Syncing Database...');
      this.syncMongoDatabase();
    } else {
      console.log('🟡 Running in DEMO MODE (In-Memory Fail-Safe Persistence)');
    }
  }

  public isUsingMongo(): boolean {
    return this.isMongoConnected;
  }

  private seedMemoryStore() {
    // Populate Streets
    INITIAL_STREETS.forEach((st, idx) => {
      const id = `street-${idx + 1}`;
      this.memoryStreets.set(id, { _id: id, id, ...st, createdAt: new Date(), updatedAt: new Date() });
    });

    // Populate Issues
    INITIAL_ISSUES.forEach((iss) => {
      this.memoryIssues.set(iss.id, { _id: iss.id, ...iss, updatedAt: new Date() });
    });

    // Populate Reports
    const seedReports = generateSeedReports();
    seedReports.forEach((rep) => {
      this.memoryReports.set(rep.reportId, { _id: rep.reportId, ...rep, updatedAt: new Date() });
    });
  }

  private async syncMongoDatabase() {
    try {
      const streetCount = await StreetModel.countDocuments();
      if (streetCount === 0) {
        await StreetModel.insertMany(INITIAL_STREETS);
        console.log('Seeded Streets into MongoDB');
      }

      const issueCount = await IssueModel.countDocuments();
      if (issueCount === 0) {
        await IssueModel.insertMany(INITIAL_ISSUES);
        console.log('Seeded Issues into MongoDB');
      }

      const reportCount = await CitizenReportModel.countDocuments();
      if (reportCount === 0) {
        await CitizenReportModel.insertMany(generateSeedReports());
        console.log('Seeded Citizen Reports into MongoDB');
      }
    } catch (err) {
      console.warn('Mongo sync error, continuing with fallback:', err);
    }
  }

  // --- ISSUES ---
  public async getIssues(): Promise<any[]> {
    if (this.isMongoConnected) {
      try {
        return await IssueModel.find().sort({ priorityScore: -1 });
      } catch {
        return Array.from(this.memoryIssues.values()).sort((a, b) => b.priorityScore - a.priorityScore);
      }
    }
    return Array.from(this.memoryIssues.values()).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  public async getIssueById(id: string): Promise<any | null> {
    if (this.isMongoConnected) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        return await IssueModel.findOne(query);
      } catch {
        return this.memoryIssues.get(id) || null;
      }
    }
    return this.memoryIssues.get(id) || null;
  }

  public async createIssue(issueData: any): Promise<any> {
    const calculated = calculatePriorityScore({
      type: issueData.type,
      severity: issueData.severity || 'Medium',
      reportsCount: issueData.reportsCount || 1,
      estimatedPopulationImpact: issueData.estimatedPopulationImpact || 800,
      nearbyInfrastructure: issueData.nearbyInfrastructure || { schools: 0, hospitals: 0, busStops: 1, residentialCount: 5, commercialCount: 5 },
    });

    const newDoc = {
      ...issueData,
      id: issueData.id || `ISSUE-${Date.now().toString().slice(-4)}`,
      priorityScore: calculated.priorityScore,
      riskLevel: calculated.riskLevel,
      priorityBreakdown: calculated.breakdown,
      recommendedAction: calculated.recommendedAction,
      reason: calculated.reason,
      status: issueData.status || 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isMongoConnected) {
      try {
        const created = await IssueModel.create(newDoc);
        return created;
      } catch {
        // Fallback
      }
    }

    this.memoryIssues.set(newDoc.id, { _id: newDoc.id, ...newDoc });
    return this.memoryIssues.get(newDoc.id);
  }

  public async updateIssue(id: string, updates: Partial<IIssue>): Promise<any | null> {
    if (this.isMongoConnected) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        const updated = await IssueModel.findOneAndUpdate(query, { $set: updates }, { new: true });
        if (updated) return updated;
      } catch {
        // Fallback
      }
    }

    const existing = this.memoryIssues.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date() };
    this.memoryIssues.set(id, merged);
    return merged;
  }

  public async deleteIssue(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        await IssueModel.findOneAndDelete(query);
        return true;
      } catch {
        // Fallback
      }
    }
    return this.memoryIssues.delete(id);
  }

  // --- REPORTS ---
  public async getReports(): Promise<any[]> {
    if (this.isMongoConnected) {
      try {
        return await CitizenReportModel.find().sort({ createdAt: -1 });
      } catch {
        return Array.from(this.memoryReports.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    }
    return Array.from(this.memoryReports.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getReportById(reportId: string): Promise<any | null> {
    if (this.isMongoConnected) {
      try {
        return await CitizenReportModel.findOne({ reportId });
      } catch {
        return this.memoryReports.get(reportId) || null;
      }
    }
    return this.memoryReports.get(reportId) || null;
  }

  public async createReport(reportData: any): Promise<any> {
    const reportId = reportData.reportId || `ST-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const newReport = {
      ...reportData,
      reportId,
      status: reportData.status || 'Submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isMongoConnected) {
      try {
        return await CitizenReportModel.create(newReport);
      } catch {
        // Fallback
      }
    }

    this.memoryReports.set(reportId, { _id: reportId, ...newReport });
    return this.memoryReports.get(reportId);
  }

  // --- STREETS ---
  public async getStreets(): Promise<any[]> {
    if (this.isMongoConnected) {
      try {
        return await StreetModel.find().sort({ healthScore: 1 });
      } catch {
        return Array.from(this.memoryStreets.values());
      }
    }
    return Array.from(this.memoryStreets.values());
  }

  public async getStreetByName(name: string): Promise<any | null> {
    if (this.isMongoConnected) {
      try {
        return await StreetModel.findOne({ name });
      } catch {
        return Array.from(this.memoryStreets.values()).find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
      }
    }
    return Array.from(this.memoryStreets.values()).find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // --- ANALYTICS ---
  public async getAnalytics(): Promise<any> {
    const issues = await this.getIssues();
    const reports = await this.getReports();
    const streets = await this.getStreets();

    const activeIssues = issues.filter((i) => i.status !== 'RESOLVED');
    const criticalIssues = issues.filter((i) => i.riskLevel === 'CRITICAL' || i.severity === 'Critical');
    const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;
    const totalImpact = activeIssues.reduce((acc, i) => acc + (i.estimatedPopulationImpact || 0), 0);

    // Issues by category
    const categoryMap: Record<string, number> = {};
    issues.forEach((i) => {
      categoryMap[i.type] = (categoryMap[i.type] || 0) + 1;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      count: categoryMap[cat],
    }));

    // Risk distribution
    const riskMap = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    activeIssues.forEach((i) => {
      const risk = (i.riskLevel as keyof typeof riskMap) || 'MEDIUM';
      if (riskMap[risk] !== undefined) riskMap[risk]++;
    });

    const riskData = Object.keys(riskMap).map((k) => ({
      name: k,
      value: riskMap[k as keyof typeof riskMap],
    }));

    return {
      totalActiveIssues: activeIssues.length,
      criticalIssuesCount: criticalIssues.length,
      resolvedCount,
      totalCitizenReports: reports.length,
      avgResolutionHours: 28.4,
      totalPopulationImpacted: totalImpact,
      categoryDistribution: categoryData,
      riskDistribution: riskData,
      streetsMonitored: streets.length,
    };
  }

  public async reseedAll() {
    this.memoryIssues.clear();
    this.memoryReports.clear();
    this.memoryStreets.clear();
    this.seedMemoryStore();
    if (this.isMongoConnected) {
      await IssueModel.deleteMany({});
      await CitizenReportModel.deleteMany({});
      await StreetModel.deleteMany({});
      await this.syncMongoDatabase();
    }
  }
}

export const store = new DataStoreService();
