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
      this.memoryIssues.set(iss.id, { _id: iss.id, ...iss, isDemo: true, updatedAt: new Date() });
    });

    // Populate Reports
    const seedReports = generateSeedReports();
    seedReports.forEach((rep) => {
      this.memoryReports.set(rep.reportId, { _id: rep.reportId, ...rep, isDemo: true, updatedAt: new Date() });
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
      nearbyInfrastructure: issueData.nearbyInfrastructure || { schools: 0, hospitals: 0, busStops: 1, residentialCount: 5, commercialCount: 5 },
    });

    const newDoc = {
      ...issueData,
      id: issueData.id || `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`,
      priorityScore: calculated.priorityScore,
      riskLevel: calculated.riskLevel,
      priorityBreakdown: calculated.breakdown,
      recommendedAction: calculated.recommendedAction,
      reason: calculated.reason,
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

  public async createReport(reportData: any): Promise<any> {
    this.ensureAvailable();
    const reportId = this.generateReportId();
    const newReport = {
      ...reportData,
      reportId,
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

    const possibleMatches = await IssueModel.find({
      type: issueInput.type,
      status: { $ne: 'RESOLVED' },
      latitude: { $gte: issueInput.latitude - 0.006, $lte: issueInput.latitude + 0.006 },
      longitude: { $gte: issueInput.longitude - 0.006, $lte: issueInput.longitude + 0.006 },
    }, null, queryOptions).sort({ reportsCount: -1 });
    const existingIssue = possibleMatches.find((issue) => Math.hypot(issue.latitude - issueInput.latitude, issue.longitude - issueInput.longitude) <= 0.006);
    let issue: any;
    let issueCreated = false;
    if (existingIssue) {
      const reportsCount = (existingIssue.reportsCount || 1) + 1;
      const calculated = calculatePriorityScore({
        type: existingIssue.type,
        severity: existingIssue.severity,
        reportsCount,
        estimatedPopulationImpact: existingIssue.estimatedPopulationImpact,
        nearbyInfrastructure: existingIssue.nearbyInfrastructure,
        createdAt: existingIssue.createdAt,
      });
      issue = await IssueModel.findOneAndUpdate({ _id: existingIssue._id }, { $set: {
        reportsCount,
        priorityScore: calculated.priorityScore,
        riskLevel: calculated.riskLevel,
        priorityBreakdown: calculated.breakdown,
        recommendedAction: calculated.recommendedAction,
        reason: `${calculated.reason} (Grouped ${reportsCount} nearby citizen reports.)`,
      } }, { ...queryOptions, new: true, runValidators: true });
    } else {
      const calculated = calculatePriorityScore({
        type: issueInput.type,
        severity: issueInput.severity,
        reportsCount: 1,
        estimatedPopulationImpact: issueInput.estimatedPopulationImpact ?? null,
        nearbyInfrastructure: issueInput.nearbyInfrastructure,
      });
      const doc = new IssueModel({
        ...issueInput,
        id: issueInput.id || `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`,
        reportsCount: 1,
        estimatedPopulationImpact: issueInput.estimatedPopulationImpact ?? null,
        priorityScore: calculated.priorityScore,
        riskLevel: calculated.riskLevel,
        priorityBreakdown: calculated.breakdown,
        recommendedAction: calculated.recommendedAction,
        reason: calculated.reason,
        status: 'NEW',
      });
      await doc.save(queryOptions);
      issue = doc;
      issueCreated = true;
    }

    const reportId = this.generateReportId();
    const report = new CitizenReportModel({ ...reportData, reportId, associatedIssueId: issue.id, status: 'Submitted' });
    await report.save(queryOptions);
    return { report, issue: this.normalizeIssue(issue), issueCreated, idempotent: false };
  }

  public async createReportAndAssociateIssue(reportData: any, issueInput: any): Promise<any> {
    this.ensureAvailable();
    if (this.demoMode) {
      const duplicate = reportData.idempotencyKey && [...this.memoryReports.values()].find((report) => report.userId === reportData.userId && report.idempotencyKey === reportData.idempotencyKey);
      if (duplicate) return { report: duplicate, issue: this.memoryIssues.get(duplicate.associatedIssueId) || null, issueCreated: false, idempotent: true };
      const previousIssues = new Map(this.memoryIssues);
      const possibleMatches = [...this.memoryIssues.values()].filter((issue) => issue.type === issueInput.type && issue.status !== 'RESOLVED' && Math.hypot(issue.latitude - issueInput.latitude, issue.longitude - issueInput.longitude) <= 0.006);
      let issue: any;
      let issueCreated = false;
      if (possibleMatches.length) {
        const existing = possibleMatches.sort((a, b) => b.reportsCount - a.reportsCount)[0];
        const reportsCount = (existing.reportsCount || 1) + 1;
        const calculated = calculatePriorityScore({ type: existing.type, severity: existing.severity, reportsCount, estimatedPopulationImpact: existing.estimatedPopulationImpact, nearbyInfrastructure: existing.nearbyInfrastructure, createdAt: existing.createdAt });
        issue = await this.updateIssue(existing.id, { reportsCount, priorityScore: calculated.priorityScore, riskLevel: calculated.riskLevel, priorityBreakdown: calculated.breakdown, recommendedAction: calculated.recommendedAction, reason: `${calculated.reason} (Grouped ${reportsCount} nearby citizen reports.)` });
      } else {
        issue = await this.createIssue({ ...issueInput, estimatedPopulationImpact: null });
        issueCreated = true;
      }
      try {
        const report = await this.createReport({ ...reportData, associatedIssueId: issue.id });
        return { report, issue, issueCreated, idempotent: false };
      } catch (error) {
        this.memoryIssues = previousIssues;
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
      let priorIssue: any = null;
      let changedIssue: any = null;
      try {
        const matches = await IssueModel.find({ type: issueInput.type, status: { $ne: 'RESOLVED' }, latitude: { $gte: issueInput.latitude - 0.006, $lte: issueInput.latitude + 0.006 }, longitude: { $gte: issueInput.longitude - 0.006, $lte: issueInput.longitude + 0.006 } });
        priorIssue = matches.find((candidate) => Math.hypot(candidate.latitude - issueInput.latitude, candidate.longitude - issueInput.longitude) <= 0.006) || null;
        if (priorIssue) {
          const count = (priorIssue.reportsCount || 1) + 1;
          const calc = calculatePriorityScore({ type: priorIssue.type, severity: priorIssue.severity, reportsCount: count, estimatedPopulationImpact: priorIssue.estimatedPopulationImpact, nearbyInfrastructure: priorIssue.nearbyInfrastructure, createdAt: priorIssue.createdAt });
          changedIssue = await IssueModel.findByIdAndUpdate(priorIssue._id, { $set: { reportsCount: count, priorityScore: calc.priorityScore, riskLevel: calc.riskLevel, priorityBreakdown: calc.breakdown, recommendedAction: calc.recommendedAction, reason: `${calc.reason} (Grouped ${count} nearby citizen reports.)` } }, { new: true, runValidators: true });
        } else {
          const calc = calculatePriorityScore({ type: issueInput.type, severity: issueInput.severity, reportsCount: 1, estimatedPopulationImpact: null, nearbyInfrastructure: issueInput.nearbyInfrastructure });
          changedIssue = await IssueModel.create({ ...issueInput, id: `ISSUE-${randomBytes(12).toString('hex').toUpperCase()}`, reportsCount: 1, estimatedPopulationImpact: null, priorityScore: calc.priorityScore, riskLevel: calc.riskLevel, priorityBreakdown: calc.breakdown, recommendedAction: calc.recommendedAction, reason: calc.reason, status: 'NEW' });
        }
        const report = await CitizenReportModel.create({ ...reportData, reportId: this.generateReportId(), associatedIssueId: changedIssue.id, status: 'Submitted' });
        return { report, issue: this.normalizeIssue(changedIssue), issueCreated: !priorIssue, idempotent: false };
      } catch (sagaError) {
        if (changedIssue) {
          try {
            if (priorIssue) await IssueModel.updateOne({ _id: priorIssue._id }, { $set: { reportsCount: priorIssue.reportsCount, priorityScore: priorIssue.priorityScore, riskLevel: priorIssue.riskLevel, priorityBreakdown: priorIssue.priorityBreakdown, recommendedAction: priorIssue.recommendedAction, reason: priorIssue.reason } }, { runValidators: true });
            else await IssueModel.deleteOne({ _id: changedIssue._id });
          } catch (rollbackError) { console.error(JSON.stringify({ level: 'error', event: 'complaint_saga_rollback_failed', detail: 'Manual reconciliation is required.' })); }
        }
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

  public async updateIssueAndAssociatedReports(id: string, updates: Record<string, unknown>): Promise<{ issue: any; reports: any[] } | null> {
    this.ensureAvailable();
    const statusMap: Record<string, string> = { NEW: 'Submitted', VERIFIED: 'Under Review', ASSIGNED: 'Assigned', 'IN PROGRESS': 'In Progress', RESOLVED: 'Resolved' };
    const requestedStatus = updates.status as string | undefined;
    const reportStatus = requestedStatus ? statusMap[requestedStatus] : undefined;
    if (requestedStatus && !reportStatus) throw new Error('Unsupported issue status');
    let resolvedAt: Date | null | undefined = requestedStatus === 'RESOLVED' ? new Date() : requestedStatus ? null : undefined;
    let nextUpdates: Record<string, unknown> = { ...updates, ...(resolvedAt !== undefined ? { resolvedAt } : {}) };
    if (this.demoMode) {
      const existingIssue = await this.getIssueById(id);
      if (requestedStatus === 'RESOLVED' && existingIssue?.resolvedAt) {
        resolvedAt = new Date(existingIssue.resolvedAt);
        nextUpdates = { ...updates, resolvedAt };
      }
      const issue = await this.updateIssue(id, nextUpdates as Partial<IIssue>);
      if (!issue) return null;
      const reports: any[] = [];
      if (reportStatus) {
        for (const [reportId, existing] of this.memoryReports) {
          if (existing.associatedIssueId === id) {
            const updated = { ...existing, status: reportStatus, resolvedAt, updatedAt: new Date() };
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
        if (reportStatus) {
          const filter = { associatedIssueId: issue.id };
          reports = (await CitizenReportModel.find(filter).session(session!)).map((report) => ({ ...report.toObject(), status: reportStatus, resolvedAt }));
          await CitizenReportModel.updateMany(filter, { $set: { status: reportStatus, resolvedAt } }, { session, runValidators: true });
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
      const priorReports = reportStatus ? await CitizenReportModel.find(filter) : [];
      const issue = await IssueModel.findOneAndUpdate(query, { $set: nextUpdates }, { new: true, runValidators: true });
      if (!issue) return null;
      try {
        if (reportStatus) await CitizenReportModel.updateMany(filter, { $set: { status: reportStatus, resolvedAt } }, { runValidators: true });
        return { issue: this.normalizeIssue(issue), reports: priorReports.map((report) => ({ ...report.toObject(), status: reportStatus ?? report.status, resolvedAt: reportStatus ? resolvedAt : report.resolvedAt })) };
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
  public async getAnalytics(): Promise<any> {
    const issues = await this.getIssues();
    const reports = await this.getReports();
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
      dataSource: this.getMode(),
      totalPopulationImpacted: totalImpact,
      categoryDistribution: categoryData,
      issueCategoryDistribution: categoryData,
      complaintCategoryDistribution: Object.entries(complaintCategoryMap).map(([name, count]) => ({ name, count })),
      complaintSeverityDistribution: Object.entries(complaintSeverityMap).map(([name, count]) => ({ name, count })),
      riskDistribution: riskData,
      streetsMonitored: streets.length,
      populationImpactComplete: totalImpact !== null,
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
