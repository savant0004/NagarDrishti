import mongoose, { ClientSession } from 'mongoose';
import { randomBytes } from 'crypto';
import { IssueModel, IIssue } from '../models/Issue';
import { CitizenReportModel, ICitizenReport } from '../models/CitizenReport';
import { StreetModel, IStreet } from '../models/Street';
import { INITIAL_STREETS, INITIAL_ISSUES, generateSeedReports } from '../data/seedData';
import { calculatePriorityScore } from './priorityEngine';

class DataStoreService {
  private isMongoConnected: boolean = false;
  private mongoState: 'connecting' | 'connected' | 'degraded' | 'unavailable' = 'unavailable';
  private get demoMode(): boolean { return process.env.DEMO_MODE === 'true'; }
  private memoryIssues: Map<string, any> = new Map();
  private memoryReports: Map<string, any> = new Map();
  private memoryStreets: Map<string, any> = new Map();

  constructor() {
    this.seedMemoryStore();
  }

  public async setMongoConnection(connected: boolean) {
    this.isMongoConnected = connected;
    this.mongoState = connected ? 'connected' : 'unavailable';
    if (connected && !this.demoMode) {
      console.log('🟢 MongoDB Connection Active. Serving live database records.');
    } else if (!connected && this.demoMode) {
      console.log('🟡 Running in DEMO MODE (In-Memory Fail-Safe Persistence)');
    } else if (!connected) {
      console.error('🔴 MongoDB unavailable; API data operations are disabled because DEMO_MODE is false');
    }
  }

  public isUsingMongo(): boolean {
    return !this.demoMode && mongoose.connection.readyState === 1 && this.isMongoConnected;
  }

  public getMode() { return this.isUsingMongo() ? 'live' : this.demoMode ? 'demo' : 'unavailable'; }
  public getDataSource() {
    if (this.demoMode) return 'demo';
    if (!this.isUsingMongo()) return 'unavailable';
    try {
      const uri = process.env.MONGO_DATABASE_MODE === 'demo' ? process.env.MONGO_DEMO_URI : process.env.MONGODB_URI;
      const databaseName = new URL(uri || '').pathname.replace(/^\//, '').split('/')[0]
        || (process.env.MONGO_DATABASE_MODE === 'demo' ? 'nagardrishti_demo' : process.env.MONGODB_DATABASE?.trim())
        || 'nagardrishti_demo';
      return databaseName === 'nagardrishti_demo' ? 'demo' : 'live';
    } catch {
      return 'live';
    }
  }
  public getDatabaseState() { return this.demoMode ? 'demo' : this.isUsingMongo() ? 'connected' : this.mongoState; }
  public isReady() { return this.demoMode || this.isUsingMongo(); }
  public setDatabaseState(state: 'connecting' | 'connected' | 'degraded' | 'unavailable') {
    this.mongoState = state;
    this.isMongoConnected = state === 'connected';
  }
  private ensureAvailable() {
    if (!this.isUsingMongo() && !this.demoMode) throw new Error('MongoDB is unavailable and DEMO_MODE is disabled');
  }
  private logDatabaseError(operation: string, error: unknown): never {
    const value = error as { name?: string; code?: string | number } | null;
    console.error(JSON.stringify({ level: 'error', event: 'mongodb_operation_failed', operation, errorName: value?.name || 'Error', errorCode: value?.code || undefined }));
    throw error;
  }
  private normalizeIssue(issue: any): any {
    if (!issue) return issue;
    const value = typeof issue.toObject === 'function' ? issue.toObject() : issue;
    return { ...value, id: value.id || value._id?.toString() };
  }
  private generateReportId(): string {
    return `ST-${new Date().getFullYear()}-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private seedMemoryStore() {
    // Populate Streets
    INITIAL_STREETS.forEach((st, idx) => {
      const id = `street-${idx + 1}`;
      this.memoryStreets.set(id, { _id: id, id, ...st, isDemo: true, createdAt: new Date(), updatedAt: new Date() });
    });

    // Populate Issues
    INITIAL_ISSUES.forEach((iss) => {
      this.memoryIssues.set(iss.id, { _id: iss.id, ...iss, location: { type: 'Point', coordinates: [iss.longitude, iss.latitude] }, isDemo: true, updatedAt: new Date() });
    });

    // Populate Reports
    const seedReports = generateSeedReports();
    seedReports.forEach((rep) => {
      this.memoryReports.set(rep.reportId, { _id: rep.reportId, ...rep, location: { type: 'Point', coordinates: [rep.longitude, rep.latitude] }, isDemo: true, updatedAt: new Date() });
    });
  }

  // --- ISSUES ---
  public async getIssues(): Promise<any[]> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        return (await IssueModel.find().sort({ priorityScore: -1 })).map((issue) => this.normalizeIssue(issue));
      } catch (err) {
        this.logDatabaseError('get issues', err);
      }
    }
    return Array.from(this.memoryIssues.values()).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  public async getIssueById(id: string): Promise<any | null> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        return this.normalizeIssue(await IssueModel.findOne(query));
      } catch (err) {
        this.logDatabaseError('get issue', err);
      }
    }
    return this.memoryIssues.get(id) || null;
  }

  public async createIssue(issueData: any): Promise<any> {
    this.ensureAvailable();
    const calculated = calculatePriorityScore({
      type: issueData.type,
      severity: issueData.severity || 'Medium',
      reportsCount: issueData.reportsCount || 1,
      estimatedPopulationImpact: issueData.estimatedPopulationImpact ?? null,
      nearbyInfrastructure: issueData.nearbyInfrastructure || { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 },
      aiDetectedSeverity: issueData.aiDetectedSeverity,
      verifiedVisualEvidence: issueData.verifiedVisualEvidence === true,
      isResolved: issueData.status === 'RESOLVED',
    });

    const newDoc = {
      ...issueData,
      id: issueData.id || `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`,
      priorityScore: calculated.priorityScore,
      riskLevel: calculated.riskLevel,
      priorityBreakdown: calculated.breakdown,
      recommendedAction: calculated.recommendedAction,
      reason: calculated.reason,
      priorityLevel: calculated.priorityLevel,
      priorityExplanation: calculated.priorityExplanation,
      recommendedResponseHours: calculated.recommendedResponseHours,
      status: issueData.status || 'NEW',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isUsingMongo()) {
      try {
        const created = await IssueModel.create(newDoc);
        return this.normalizeIssue(created);
      } catch (err) {
        this.logDatabaseError('create issue', err);
      }
    }

    this.memoryIssues.set(newDoc.id, { _id: newDoc.id, ...newDoc, isDemo: true });
    return this.memoryIssues.get(newDoc.id);
  }

  public async updateIssue(id: string, updates: Partial<IIssue>): Promise<any | null> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        const updated = await IssueModel.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: true });
        return this.normalizeIssue(updated);
      } catch (err) {
        this.logDatabaseError('update issue', err);
      }
    }

    const existing = this.memoryIssues.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date() };
    this.memoryIssues.set(id, merged);
    return merged;
  }

  public async deleteIssue(id: string): Promise<boolean> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        const target = await IssueModel.findOne(query);
        if (!target) return false;
        if (await CitizenReportModel.exists({ associatedIssueId: target.id })) throw new Error('ISSUE_HAS_ASSOCIATED_REPORTS');
        const deleted = await IssueModel.findOneAndDelete(query);
        return !!deleted;
      } catch (err) {
        this.logDatabaseError('delete issue', err);
      }
    }
    if ([...this.memoryReports.values()].some((report) => report.associatedIssueId === id)) throw new Error('ISSUE_HAS_ASSOCIATED_REPORTS');
    return this.memoryIssues.delete(id);
  }

  // --- REPORTS ---
  public async getReports(): Promise<any[]> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        return await CitizenReportModel.find().sort({ createdAt: -1 });
      } catch (err) {
        this.logDatabaseError('get reports', err);
      }
    }
    return Array.from(this.memoryReports.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getReportById(reportId: string): Promise<any | null> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        return await CitizenReportModel.findOne({ reportId });
      } catch (err) {
        this.logDatabaseError('get report', err);
      }
    }
    return this.memoryReports.get(reportId) || null;
  }

  public async getNearbyReports(latitude: number, longitude: number, radiusMeters = 500, issueType?: string): Promise<any[]> {
    this.ensureAvailable();
    const radians = Math.PI / 180;
    const distance = (report: any) => {
      const dLat = (Number(report.latitude) - latitude) * radians;
      const dLng = (Number(report.longitude) - longitude) * radians;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * radians) * Math.cos(Number(report.latitude) * radians) * Math.sin(dLng / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    if (this.isUsingMongo()) {
      try {
        const geometry = { type: 'Point', coordinates: [longitude, latitude] };
        const filter: any = { location: { $near: { $geometry: geometry, $maxDistance: radiusMeters } } };
        if (issueType) filter.issueType = issueType;
        return await CitizenReportModel.find(filter).limit(50);
      } catch (error) { this.logDatabaseError('find nearby reports', error); }
    }
    return [...this.memoryReports.values()].filter((report) => (!issueType || report.issueType === issueType) && distance(report) <= radiusMeters)
      .sort((a, b) => distance(a) - distance(b)).slice(0, 50);
  }

  public async getComplaintHotspots(cellMeters = 300, sourceReports?: any[]): Promise<Array<{ latitude: number; longitude: number; count: number; categories: Record<string, number>; openCount: number }>> {
    const reports = sourceReports || await this.getReports();
    const cells = new Map<string, { latSum: number; lngSum: number; count: number; openCount: number; categories: Map<string, number> }>();
    const latStep = cellMeters / 111320;
    for (const report of reports) {
      const lat = Number(report.latitude), lng = Number(report.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const lngStep = latStep / Math.max(0.1, Math.cos(lat * Math.PI / 180));
      const key = `${Math.floor(lat / latStep)}:${Math.floor(lng / lngStep)}`;
      const cell = cells.get(key) || { latSum: 0, lngSum: 0, count: 0, openCount: 0, categories: new Map<string, number>() };
      cell.latSum += lat; cell.lngSum += lng; cell.count += 1;
      if (report.status !== 'Resolved') cell.openCount += 1;
      cell.categories.set(report.issueType, (cell.categories.get(report.issueType) || 0) + 1);
      cells.set(key, cell);
    }
    return [...cells.values()].filter((cell) => cell.count >= 2)
      .map((cell) => ({ latitude: cell.latSum / cell.count, longitude: cell.lngSum / cell.count, count: cell.count, categories: Object.fromEntries(cell.categories), openCount: cell.openCount }))
      .sort((a, b) => b.count - a.count).slice(0, 25);
  }

  public async createReport(reportData: any): Promise<any> {
    this.ensureAvailable();
    const reportId = this.generateReportId();
    const newReport = {
      ...reportData,
      reportId,
      location: { type: 'Point', coordinates: [reportData.longitude, reportData.latitude] },
      status: reportData.status || 'Submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.isUsingMongo()) {
      try {
        try { return await CitizenReportModel.create(newReport); }
        catch (error: any) {
          if (error?.code !== 11000 || error?.keyPattern?.reportId === undefined) throw error;
          newReport.reportId = this.generateReportId();
          return await CitizenReportModel.create(newReport);
        }
      } catch (err) {
        this.logDatabaseError('create report', err);
      }
    }

    this.memoryReports.set(reportId, { _id: reportId, ...newReport, isDemo: true });
    return this.memoryReports.get(reportId);
  }

  private isUnsupportedTransaction(error: any): boolean {
    const message = String(error?.message || '');
    return error?.code === 20 || error?.codeName === 'IllegalOperation'
      || /transaction numbers are only allowed|does not support transactions|replica set member or mongos/i.test(message);
  }

  private async persistReportAndIssue(reportData: any, issueInput: any, session?: ClientSession): Promise<any> {
    const queryOptions = session ? { session } : {};
    const idempotencyKey = reportData.idempotencyKey;
    if (idempotencyKey) {
      let existingReportQuery = CitizenReportModel.findOne({ userId: reportData.userId, idempotencyKey });
      if (session) existingReportQuery = existingReportQuery.session(session);
      const existingReport = await existingReportQuery;
      if (existingReport) {
        let issueQuery = IssueModel.findOne({ id: existingReport.associatedIssueId });
        if (session) issueQuery = issueQuery.session(session);
        return { report: existingReport, issue: this.normalizeIssue(await issueQuery), issueCreated: false, idempotent: true };
      }
    }

    // Similarity is advisory. Every citizen submission gets a separate issue
    // until authorized staff explicitly confirms a duplicate link.
    const calculated = calculatePriorityScore({
      type: issueInput.type,
      severity: issueInput.severity,
      reportsCount: 1,
      estimatedPopulationImpact: issueInput.estimatedPopulationImpact ?? null,
      nearbyInfrastructure: issueInput.nearbyInfrastructure,
      aiDetectedSeverity: issueInput.aiDetectedSeverity,
      verifiedVisualEvidence: issueInput.verifiedVisualEvidence === true,
    });
    const issue = new IssueModel({
      ...issueInput,
      id: issueInput.id || `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`,
      reportsCount: 1,
      estimatedPopulationImpact: issueInput.estimatedPopulationImpact ?? null,
      priorityScore: calculated.priorityScore,
      riskLevel: calculated.riskLevel,
      priorityBreakdown: calculated.breakdown,
      recommendedAction: calculated.recommendedAction,
      reason: calculated.reason,
      priorityLevel: calculated.priorityLevel,
      priorityExplanation: calculated.priorityExplanation,
      recommendedResponseHours: calculated.recommendedResponseHours,
      status: 'NEW',
    });
    await issue.save(queryOptions);

    const reportId = this.generateReportId();
    const report = new CitizenReportModel({ ...reportData, priorityScore: issue.priorityScore, priorityLevel: issue.priorityLevel || issue.riskLevel, priorityExplanation: issue.priorityExplanation || issue.reason, recommendedResponseHours: issue.recommendedResponseHours, reportId, associatedIssueId: issue.id, duplicateGroupId: issue.id, status: 'Submitted', location: { type: 'Point', coordinates: [reportData.longitude, reportData.latitude] } });
    await report.save(queryOptions);
    return { report, issue: this.normalizeIssue(issue), issueCreated: true, idempotent: false };
  }

  public async createReportAndAssociateIssue(reportData: any, issueInput: any): Promise<any> {
    this.ensureAvailable();
    if (this.demoMode) {
      const duplicate = reportData.idempotencyKey && [...this.memoryReports.values()].find((report) => report.userId === reportData.userId && report.idempotencyKey === reportData.idempotencyKey);
      if (duplicate) return { report: duplicate, issue: this.memoryIssues.get(duplicate.associatedIssueId) || null, issueCreated: false, idempotent: true };
      const issue = await this.createIssue({ ...issueInput, estimatedPopulationImpact: null });
      try {
        const report = await this.createReport({ ...reportData, priorityScore: issue.priorityScore, priorityLevel: issue.priorityLevel || issue.riskLevel, priorityExplanation: issue.priorityExplanation || issue.reason, recommendedResponseHours: issue.recommendedResponseHours, associatedIssueId: issue.id, duplicateGroupId: issue.id });
        return { report, issue, issueCreated: true, idempotent: false };
      } catch (error) {
        this.memoryIssues.delete(issue.id);
        throw error;
      }
    }

    let session: ClientSession | undefined;
    try {
      session = await mongoose.startSession();
      let result: any;
      await session.withTransaction(async () => { result = await this.persistReportAndIssue(reportData, issueInput, session); });
      return result;
    } catch (error: any) {
      if (!this.isUnsupportedTransaction(error)) this.logDatabaseError('create complaint and associated issue', error);
      // Standalone MongoDB does not support transactions. Use a compensating write saga and report rollback failures.
      const idempotencyKey = reportData.idempotencyKey;
      if (idempotencyKey) {
        const duplicate = await CitizenReportModel.findOne({ userId: reportData.userId, idempotencyKey });
        if (duplicate) return { report: duplicate, issue: await IssueModel.findOne({ id: duplicate.associatedIssueId }), issueCreated: false, idempotent: true };
      }
      let createdIssue: any = null;
      try {
        const calc = calculatePriorityScore({ type: issueInput.type, severity: issueInput.severity, reportsCount: 1, estimatedPopulationImpact: null, nearbyInfrastructure: issueInput.nearbyInfrastructure, aiDetectedSeverity: issueInput.aiDetectedSeverity });
        createdIssue = await IssueModel.create({ ...issueInput, id: `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`, reportsCount: 1, estimatedPopulationImpact: null, priorityScore: calc.priorityScore, riskLevel: calc.riskLevel, priorityBreakdown: calc.breakdown, recommendedAction: calc.recommendedAction, reason: calc.reason, priorityLevel: calc.priorityLevel, priorityExplanation: calc.priorityExplanation, recommendedResponseHours: calc.recommendedResponseHours, status: 'NEW' });
        const report = await CitizenReportModel.create({ ...reportData, priorityScore: createdIssue.priorityScore, priorityLevel: createdIssue.priorityLevel || createdIssue.riskLevel, priorityExplanation: createdIssue.priorityExplanation || createdIssue.reason, recommendedResponseHours: createdIssue.recommendedResponseHours, reportId: this.generateReportId(), associatedIssueId: createdIssue.id, duplicateGroupId: createdIssue.id, status: 'Submitted', location: { type: 'Point', coordinates: [reportData.longitude, reportData.latitude] } });
        return { report, issue: this.normalizeIssue(createdIssue), issueCreated: true, idempotent: false };
      } catch (sagaError) {
        if (createdIssue) await IssueModel.deleteOne({ _id: createdIssue._id }).catch(() => console.error(JSON.stringify({ level: 'error', event: 'complaint_saga_rollback_failed', detail: 'Manual reconciliation is required.' })));
        this.logDatabaseError('create complaint with reconciliation', sagaError);
      }
    } finally {
      await session?.endSession();
    }
  }

  public async updateReportsForIssue(issue: any, status: string): Promise<any[]> {
    this.ensureAvailable();
    const statusMap: Record<string, string> = { NEW: 'Submitted', VERIFIED: 'Under Review', ASSIGNED: 'Assigned', 'IN PROGRESS': 'In Progress', RESOLVED: 'Resolved' };
    const reportStatus = statusMap[status];
    if (!reportStatus) throw new Error(`Unsupported issue status: ${status}`);
    if (this.isUsingMongo()) {
      try {
        const filter = { associatedIssueId: issue.id };
        return await CitizenReportModel.find(filter).then(async (reports) => {
          await CitizenReportModel.updateMany(filter, { $set: { status: reportStatus } });
          return reports.map((report) => ({ ...report.toObject(), status: reportStatus, updatedAt: new Date() }));
        });
      } catch (err) { this.logDatabaseError('update associated reports', err); }
    }
    const updated: any[] = [];
    for (const [id, report] of this.memoryReports) {
      if (report.associatedIssueId === issue.id) {
        const next = { ...report, status: reportStatus, updatedAt: new Date() };
        this.memoryReports.set(id, next); updated.push(next);
      }
    }
    return updated;
  }

  public async linkDuplicateReports(sourceReportId: string, targetReportId: string, actor: { id: string; role: string }): Promise<{ source: any; target: any } | null> {
    this.ensureAvailable();
    const source = await this.getReportById(sourceReportId), target = await this.getReportById(targetReportId);
    if (!source || !target || source.issueType !== target.issueType) return null;
    const issueId = source.associatedIssueId || target.associatedIssueId;
    if (!issueId) return null;
    const targetIssueId = target.associatedIssueId;
    const timestamp = new Date();
    if (this.demoMode) {
      for (const item of [source, target]) {
        const current = this.memoryReports.get(item.reportId);
        const linked = { ...current, associatedIssueId: issueId, duplicateGroupId: issueId, duplicateLinkedReportIds: [...new Set([...(current.duplicateLinkedReportIds || []), item.reportId === sourceReportId ? targetReportId : sourceReportId])], updatedAt: timestamp,
          history: [...(current.history || []), { action: 'duplicate_linked', note: `Linked with ${item.reportId === sourceReportId ? targetReportId : sourceReportId}`, actorId: actor.id, actorRole: actor.role, createdAt: timestamp }] };
        this.memoryReports.set(item.reportId, linked);
      }
      const linkedSource = this.memoryReports.get(sourceReportId), linkedTarget = this.memoryReports.get(targetReportId);
      const groupReports = [...this.memoryReports.values()].filter((report) => report.associatedIssueId === issueId);
      const issue = await this.getIssueById(issueId);
      if (issue) {
        const priority = calculatePriorityScore({ type: issue.type, severity: issue.severity, reportsCount: groupReports.length, estimatedPopulationImpact: issue.estimatedPopulationImpact, nearbyInfrastructure: issue.nearbyInfrastructure, createdAt: issue.createdAt, aiDetectedSeverity: issue.aiDetectedSeverity, verifiedVisualEvidence: issue.verifiedVisualEvidence });
        await this.updateIssue(issueId, { reportsCount: groupReports.length, priorityScore: priority.priorityScore, riskLevel: priority.riskLevel, priorityLevel: priority.priorityLevel, priorityBreakdown: priority.breakdown, priorityExplanation: priority.priorityExplanation, recommendedResponseHours: priority.recommendedResponseHours, recommendedAction: priority.recommendedAction, reason: priority.priorityExplanation });
      }
      if (targetIssueId && targetIssueId !== issueId && ![...this.memoryReports.values()].some((report) => report.associatedIssueId === targetIssueId)) this.memoryIssues.delete(targetIssueId);
      return { source: linkedSource, target: linkedTarget };
    }
    let session: ClientSession | undefined;
    try {
      session = await mongoose.startSession();
      let result: { source: any; target: any } | null = null;
      await session.withTransaction(async () => {
        const linkedSource = await CitizenReportModel.findOneAndUpdate({ reportId: sourceReportId }, { $set: { associatedIssueId: issueId, duplicateGroupId: issueId }, $addToSet: { duplicateLinkedReportIds: targetReportId }, $push: { history: { action: 'duplicate_linked', note: `Linked with ${targetReportId}`, actorId: actor.id, actorRole: actor.role, createdAt: timestamp } } }, { new: true, runValidators: true, session });
        const linkedTarget = await CitizenReportModel.findOneAndUpdate({ reportId: targetReportId }, { $set: { associatedIssueId: issueId, duplicateGroupId: issueId }, $addToSet: { duplicateLinkedReportIds: sourceReportId }, $push: { history: { action: 'duplicate_linked', note: `Linked with ${sourceReportId}`, actorId: actor.id, actorRole: actor.role, createdAt: timestamp } } }, { new: true, runValidators: true, session });
        if (!linkedSource || !linkedTarget) throw new Error('DUPLICATE_REPORT_NOT_FOUND');
        const count = await CitizenReportModel.countDocuments({ associatedIssueId: issueId }).session(session!);
        const issue = await IssueModel.findOne({ id: issueId }).session(session!);
        if (issue) {
          const priority = calculatePriorityScore({ type: issue.type, severity: issue.severity, reportsCount: count, estimatedPopulationImpact: issue.estimatedPopulationImpact, nearbyInfrastructure: issue.nearbyInfrastructure, createdAt: issue.createdAt, aiDetectedSeverity: issue.aiDetectedSeverity, verifiedVisualEvidence: issue.verifiedVisualEvidence });
          await IssueModel.updateOne({ id: issueId }, { $set: { reportsCount: count, priorityScore: priority.priorityScore, riskLevel: priority.riskLevel, priorityLevel: priority.priorityLevel, priorityBreakdown: priority.breakdown, priorityExplanation: priority.priorityExplanation, recommendedResponseHours: priority.recommendedResponseHours, recommendedAction: priority.recommendedAction, reason: priority.priorityExplanation } }, { session });
        }
        if (targetIssueId && targetIssueId !== issueId && !await CitizenReportModel.exists({ associatedIssueId: targetIssueId }).session(session!)) await IssueModel.deleteOne({ id: targetIssueId }, { session });
        result = { source: linkedSource, target: linkedTarget };
      });
      return result;
    } catch (error: any) {
      if (!this.isUnsupportedTransaction(error)) return this.logDatabaseError('link duplicate complaints', error);
      try {
        const sourceBefore = await CitizenReportModel.findOne({ reportId: sourceReportId });
        const targetBefore = await CitizenReportModel.findOne({ reportId: targetReportId });
        if (!sourceBefore || !targetBefore) return null;
        const linkedSource = await CitizenReportModel.findOneAndUpdate({ reportId: sourceReportId }, { $set: { associatedIssueId: issueId, duplicateGroupId: issueId }, $addToSet: { duplicateLinkedReportIds: targetReportId }, $push: { history: { action: 'duplicate_linked', note: `Linked with ${targetReportId}`, actorId: actor.id, actorRole: actor.role, createdAt: timestamp } } }, { new: true, runValidators: true });
        const linkedTarget = await CitizenReportModel.findOneAndUpdate({ reportId: targetReportId }, { $set: { associatedIssueId: issueId, duplicateGroupId: issueId }, $addToSet: { duplicateLinkedReportIds: sourceReportId }, $push: { history: { action: 'duplicate_linked', note: `Linked with ${sourceReportId}`, actorId: actor.id, actorRole: actor.role, createdAt: timestamp } } }, { new: true, runValidators: true });
        const count = await CitizenReportModel.countDocuments({ associatedIssueId: issueId });
        const issue = await IssueModel.findOne({ id: issueId });
        if (issue) {
          const priority = calculatePriorityScore({ type: issue.type, severity: issue.severity, reportsCount: count, estimatedPopulationImpact: issue.estimatedPopulationImpact, nearbyInfrastructure: issue.nearbyInfrastructure, createdAt: issue.createdAt, aiDetectedSeverity: issue.aiDetectedSeverity, verifiedVisualEvidence: issue.verifiedVisualEvidence });
          await IssueModel.updateOne({ id: issueId }, { $set: { reportsCount: count, priorityScore: priority.priorityScore, riskLevel: priority.riskLevel, priorityLevel: priority.priorityLevel, priorityBreakdown: priority.breakdown, priorityExplanation: priority.priorityExplanation, recommendedResponseHours: priority.recommendedResponseHours, recommendedAction: priority.recommendedAction, reason: priority.priorityExplanation } });
        }
        if (targetIssueId && targetIssueId !== issueId && !await CitizenReportModel.exists({ associatedIssueId: targetIssueId })) await IssueModel.deleteOne({ id: targetIssueId });
        return linkedSource && linkedTarget ? { source: linkedSource, target: linkedTarget } : null;
      } catch (fallbackError) {
        console.error(JSON.stringify({ level: 'error', event: 'duplicate_link_compensation_required', detail: 'Complaint link did not complete consistently.' }));
        return this.logDatabaseError('link duplicate complaints with reconciliation', fallbackError);
      }
      return null;
    } finally { await session?.endSession(); }
  }

  public async addResolutionEvidence(reportId: string, imagePath: string, note: string, actor: { id: string; role: string }): Promise<any | null> {
    this.ensureAvailable();
    const history = { action: 'resolution_evidence_added', note, actorId: actor.id, actorRole: actor.role, createdAt: new Date() };
    if (this.demoMode) {
      const report = this.memoryReports.get(reportId);
      if (!report) return null;
      const updated = { ...report, resolutionEvidence: [...(report.resolutionEvidence || []), imagePath], history: [...(report.history || []), history], updatedAt: new Date() };
      this.memoryReports.set(reportId, updated);
      return updated;
    }
    try { return await CitizenReportModel.findOneAndUpdate({ reportId }, { $push: { resolutionEvidence: imagePath, history } }, { new: true, runValidators: true }); }
    catch (error) { this.logDatabaseError('add resolution evidence', error); }
  }

  public async updateIssueAndAssociatedReports(id: string, updates: Record<string, unknown>, actor: { id: string; role: string } = { id: 'system', role: 'system' }): Promise<{ issue: any; reports: any[] } | null> {
    this.ensureAvailable();
    const statusMap: Record<string, string> = { NEW: 'Submitted', VERIFIED: 'Under Review', ASSIGNED: 'Assigned', 'IN PROGRESS': 'In Progress', RESOLVED: 'Resolved' };
    const requestedStatus = updates.status as string | undefined;
    const reportStatus = requestedStatus ? statusMap[requestedStatus] : undefined;
    if (requestedStatus && !reportStatus) throw new Error('Unsupported issue status');
    let resolvedAt: Date | null | undefined = requestedStatus === 'RESOLVED' ? new Date() : requestedStatus ? null : undefined;
    let nextUpdates: Record<string, unknown> = { ...updates, ...(resolvedAt !== undefined ? { resolvedAt } : {}) };
    const workflowChanged = !!requestedStatus || updates.assignedUserId !== undefined || updates.assignedTeam !== undefined || updates.department !== undefined || updates.resolutionNotes !== undefined || updates.verifiedVisualEvidence !== undefined;
    const reportSet: Record<string, unknown> = {};
    if (reportStatus) reportSet.status = reportStatus;
    if (resolvedAt !== undefined && reportStatus) reportSet.resolvedAt = resolvedAt;
    if (updates.assignedUserId !== undefined) reportSet.assignedTo = updates.assignedUserId;
    if (updates.department !== undefined) reportSet.department = updates.department;
    if (updates.resolutionNotes !== undefined) reportSet.resolutionNotes = updates.resolutionNotes;
    for (const field of ['priorityScore', 'priorityLevel', 'priorityExplanation', 'recommendedResponseHours'] as const) if (updates[field] !== undefined) reportSet[field] = updates[field];
    const historyEntry = { action: requestedStatus ? `status_${String(requestedStatus).toLowerCase().replace(/\s+/g, '_')}` : updates.assignedUserId !== undefined ? 'assigned' : 'workflow_updated', note: String(updates.resolutionNotes || updates.assignedTeam || ''), actorId: actor.id, actorRole: actor.role, createdAt: new Date() };
    if (this.demoMode) {
      const existingIssue = await this.getIssueById(id);
      if (requestedStatus === 'RESOLVED' && existingIssue?.resolvedAt) {
        resolvedAt = new Date(existingIssue.resolvedAt);
        nextUpdates = { ...updates, resolvedAt };
      }
      const issue = await this.updateIssue(id, nextUpdates as Partial<IIssue>);
      if (!issue) return null;
      const reports: any[] = [];
      if (workflowChanged) {
        for (const [reportId, existing] of this.memoryReports) {
          if (existing.associatedIssueId === id) {
            const updated = { ...existing, ...reportSet, history: [...(existing.history || []), historyEntry], updatedAt: new Date() };
            this.memoryReports.set(reportId, updated);
            reports.push(updated);
          }
        }
      }
      return { issue, reports };
    }

    let session: ClientSession | undefined;
    try {
      session = await mongoose.startSession();
      let result: { issue: any; reports: any[] } | null = null;
      await session.withTransaction(async () => {
        const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
        const priorIssue = await IssueModel.findOne(query).session(session!);
        if (!priorIssue) { result = null; return; }
        if (requestedStatus === 'RESOLVED' && priorIssue.resolvedAt) {
          resolvedAt = priorIssue.resolvedAt;
          nextUpdates = { ...updates, resolvedAt };
        }
        const issue = await IssueModel.findOneAndUpdate(query, { $set: nextUpdates }, { session, new: true, runValidators: true });
        if (!issue) { result = null; return; }
        let reports: any[] = [];
        if (workflowChanged) {
          const filter = { associatedIssueId: issue.id };
          reports = (await CitizenReportModel.find(filter).session(session!)).map((report) => ({ ...report.toObject(), ...reportSet, history: [...(report.history || []), historyEntry] }));
          await CitizenReportModel.updateMany(filter, { $set: reportSet, $push: { history: historyEntry } }, { session, runValidators: true });
        }
        result = { issue: this.normalizeIssue(issue), reports };
      });
      return result;
    } catch (error: any) {
      if (!this.isUnsupportedTransaction(error)) this.logDatabaseError('update issue and associated reports', error);
      // On standalone MongoDB, use a compensating saga. Only reports linked by the stable association id are touched.
      const query = mongoose.Types.ObjectId.isValid(id) ? { $or: [{ id }, { _id: id }] } : { id };
      const priorIssue = await IssueModel.findOne(query);
      if (!priorIssue) return null;
      if (requestedStatus === 'RESOLVED' && priorIssue.resolvedAt) {
        resolvedAt = priorIssue.resolvedAt;
        nextUpdates = { ...updates, resolvedAt };
      }
      const filter = { associatedIssueId: priorIssue.id };
      const priorReports = workflowChanged ? await CitizenReportModel.find(filter) : [];
      const issue = await IssueModel.findOneAndUpdate(query, { $set: nextUpdates }, { new: true, runValidators: true });
      if (!issue) return null;
      try {
        if (workflowChanged) await CitizenReportModel.updateMany(filter, { $set: reportSet, $push: { history: historyEntry } }, { runValidators: true });
        return { issue: this.normalizeIssue(issue), reports: priorReports.map((report) => ({ ...report.toObject(), ...reportSet, history: [...(report.history || []), historyEntry] })) };
      } catch (writeError) {
        try {
          const previous = priorIssue.toObject();
          const { _id: ignoredId, ...restore } = previous;
          await IssueModel.updateOne({ _id: priorIssue._id }, { $set: restore }, { runValidators: true });
          if (priorReports.length) await Promise.all(priorReports.map((report) => CitizenReportModel.updateOne({ _id: report._id }, { $set: { status: report.status, resolvedAt: report.resolvedAt } }, { runValidators: true })));
        } catch { console.error(JSON.stringify({ level: 'error', event: 'status_saga_rollback_failed', detail: 'Manual reconciliation is required.' })); }
        this.logDatabaseError('update issue and report status with reconciliation', writeError);
      }
      throw error;
    } finally {
      await session?.endSession();
    }
  }

  // --- STREETS ---
  public async getStreets(): Promise<any[]> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        return await StreetModel.find().sort({ healthScore: 1 });
      } catch (err) {
        this.logDatabaseError('get streets', err);
      }
    }
    return Array.from(this.memoryStreets.values());
  }

  public async getStreetByName(name: string): Promise<any | null> {
    this.ensureAvailable();
    if (this.isUsingMongo()) {
      try {
        return await StreetModel.findOne({ name });
      } catch (err) {
        this.logDatabaseError('get street', err);
      }
    }
    return Array.from(this.memoryStreets.values()).find((s) => s.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // --- ANALYTICS ---
  public async getAnalytics(scope?: { id: string; department?: string }): Promise<any> {
    let issues = await this.getIssues();
    let reports = await this.getReports();
    if (scope) {
      issues = issues.filter((issue) => issue.assignedUserId === scope.id || (scope.department && issue.department === scope.department) || (!issue.department && !issue.assignedUserId));
      reports = reports.filter((report) => report.assignedTo === scope.id || (scope.department && report.department === scope.department) || (!report.department && !report.assignedTo));
    }
    const streets = await this.getStreets();

    const activeIssues = issues.filter((i) => i.status !== 'RESOLVED');
    const criticalIssues = activeIssues.filter((i) => i.riskLevel === 'CRITICAL' || i.severity === 'Critical');
    const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;
    const complaintStatusMap: Record<string, number> = {};
    reports.forEach((report) => { complaintStatusMap[report.status] = (complaintStatusMap[report.status] || 0) + 1; });
    const knownImpact = activeIssues.filter((issue) => Number.isFinite(issue.estimatedPopulationImpact) && issue.estimatedPopulationImpact >= 0);
    const totalImpact = knownImpact.length === activeIssues.length
      ? knownImpact.reduce((acc, issue) => acc + issue.estimatedPopulationImpact, 0)
      : null;

    // Issues by category
    const categoryMap: Record<string, number> = {};
    issues.forEach((i) => {
      categoryMap[i.type] = (categoryMap[i.type] || 0) + 1;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      count: categoryMap[cat],
    }));

    const complaintCategoryMap: Record<string, number> = {};
    const complaintSeverityMap: Record<string, number> = {};
    reports.forEach((report) => {
      complaintCategoryMap[report.issueType] = (complaintCategoryMap[report.issueType] || 0) + 1;
      complaintSeverityMap[report.severity] = (complaintSeverityMap[report.severity] || 0) + 1;
    });
    const unresolved = reports.filter((report) => report.status !== 'Resolved');
    const unresolvedByArea = new Map<string, number>();
    const workload = new Map<string, { assigned: number; open: number; resolved: number }>();
    const unresolvedByCategory = new Map<string, number>();
    for (const report of unresolved) {
      const area = String(report.streetName || 'Area not specified');
      unresolvedByArea.set(area, (unresolvedByArea.get(area) || 0) + 1);
      unresolvedByCategory.set(report.issueType, (unresolvedByCategory.get(report.issueType) || 0) + 1);
    }
    for (const issue of issues) {
      const assignee = issue.assignedUserId || issue.assignedTeam || 'Unassigned';
      const item = workload.get(assignee) || { assigned: 0, open: 0, resolved: 0 };
      item.assigned += issue.assignedUserId || issue.assignedTeam ? 1 : 0;
      item.open += issue.status === 'RESOLVED' ? 0 : 1;
      item.resolved += issue.status === 'RESOLVED' ? 1 : 0;
      workload.set(assignee, item);
    }
    const possibleDuplicateReports = reports.filter((report) => Array.isArray(report.possibleDuplicateReportIds) && report.possibleDuplicateReportIds.length > 0).length;
    const confirmedDuplicateLinkedReports = reports.filter((report) => Array.isArray(report.duplicateLinkedReportIds) && report.duplicateLinkedReportIds.length > 0).length;
    const floodCategories = new Set(['Waterlogging', 'Blocked Drainage']);
    const floodObservations = reports.filter((report) => floodCategories.has(report.issueType));
    const hotspots = await this.getComplaintHotspots(300, reports);

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
      avgResolutionHours: this.averageResolutionHours(reports),
      totalComplaints: reports.length,
      pendingComplaints: reports.filter((r) => r.status !== 'Resolved').length,
      resolvedComplaints: reports.filter((r) => r.status === 'Resolved').length,
      complaintStatusDistribution: Object.entries(complaintStatusMap).map(([name, count]) => ({ name, count })),
      dataSource: this.getDataSource(),
      totalPopulationImpacted: totalImpact,
      categoryDistribution: categoryData,
      issueCategoryDistribution: categoryData,
      complaintCategoryDistribution: Object.entries(complaintCategoryMap).map(([name, count]) => ({ name, count })),
      complaintSeverityDistribution: Object.entries(complaintSeverityMap).map(([name, count]) => ({ name, count })),
      riskDistribution: riskData,
      streetsMonitored: streets.length,
      populationImpactComplete: totalImpact !== null,
      areaComplaintDensity: [...unresolvedByArea.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count),
      complaintHotspots: hotspots,
      unresolvedComplaintSummary: { total: unresolved.length, byArea: [...unresolvedByArea.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count).slice(0, 10), byCategory: [...unresolvedByCategory.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count) },
      staffWorkload: [...workload.entries()].map(([assignee, counts]) => ({ assignee, ...counts })),
      duplicateComplaintStatistics: { possibleDuplicateReports, confirmedDuplicateLinkedReports },
      floodRiskSummary: { historicalFloodRelatedComplaints: floodObservations.length, openFloodRelatedComplaints: floodObservations.filter((report) => report.status !== 'Resolved').length, byCategory: [...floodCategories].map((category) => ({ category, count: reports.filter((report) => report.issueType === category).length })), source: 'historical_complaint_records', currentSensorDataAvailable: false, elevationDataAvailable: false },
    };
  }

  private averageResolutionHours(reports: any[]): number | null {
    const resolved = reports.filter((report) => report.status === 'Resolved' && report.createdAt && report.resolvedAt);
    if (!resolved.length) return null;
    return Number((resolved.reduce((sum, report) => sum + (new Date(report.resolvedAt).getTime() - new Date(report.createdAt).getTime()) / 3600000, 0) / resolved.length).toFixed(1));
  }

  public async reseedAll() {
    if (!this.demoMode) throw new Error('Reseeding is available only in explicit demo mode');
    this.memoryIssues.clear();
    this.memoryReports.clear();
    this.memoryStreets.clear();
    this.seedMemoryStore();
  }
}

export const store = new DataStoreService();
