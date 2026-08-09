import { Request, Response } from 'express';
import { store } from '../services/store';
import { analyzeUploadedImage } from '../services/aiVisionService';
import { calculatePriorityScore } from '../services/priorityEngine';

export async function getReports(req: Request, res: Response) {
  try {
    const reports = await store.getReports();
    return res.json({ success: true, count: reports.length, data: reports });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getReportById(req: Request, res: Response) {
  try {
    const report = await store.getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createReport(req: Request, res: Response) {
  try {
    const { issueType, description, latitude, longitude, streetName, severity } = req.body;
    if (!issueType || !description || !latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Missing required report fields' });
    }

    const reportLat = Number(latitude);
    const reportLng = Number(longitude);

    // AI Analysis check
    const filename = req.file ? req.file.originalname : (req.body.imageName || '');
    const aiAnalysis = analyzeUploadedImage(filename, req.file?.mimetype);

    // Check for Issue Clustering (Feature 3: Duplicate Report Detection within ~500m)
    const allIssues = await store.getIssues();
    const existingIssue = allIssues.find((i) => {
      if (i.status === 'RESOLVED') return false;
      const typeMatch = i.type.toLowerCase() === String(issueType).toLowerCase();
      const dist = Math.hypot((i.latitude || 0) - reportLat, (i.longitude || 0) - reportLng);
      return typeMatch && dist <= 0.006;
    });

    let createdOrUpdatedIssue: any = null;
    let associatedIssueId = '';

    if (existingIssue) {
      // Cluster report into existing issue
      associatedIssueId = existingIssue.id;
      const newReportsCount = (existingIssue.reportsCount || 1) + 1;

      // Recalculate priority score with increased report count
      const updatedCalc = calculatePriorityScore({
        type: existingIssue.type,
        severity: existingIssue.severity || 'Medium',
        reportsCount: newReportsCount,
        estimatedPopulationImpact: existingIssue.estimatedPopulationImpact || 1200,
        nearbyInfrastructure: existingIssue.nearbyInfrastructure || { schools: 1, hospitals: 0, busStops: 2, residentialCount: 5, commercialCount: 5 },
      });

      const clusteringExplanation = `Multiple reports from nearby locations (${newReportsCount} citizen reports) were grouped into this infrastructure issue.`;

      createdOrUpdatedIssue = await store.updateIssue(existingIssue.id, {
        reportsCount: newReportsCount,
        priorityScore: updatedCalc.priorityScore,
        riskLevel: updatedCalc.riskLevel,
        priorityBreakdown: updatedCalc.breakdown,
        recommendedAction: updatedCalc.recommendedAction,
        reason: `${updatedCalc.reason} (${clusteringExplanation})`,
      });
    } else {
      // Create a brand new issue
      const issueTitle = `${issueType} reported on ${streetName || 'City Corridor'}`;
      createdOrUpdatedIssue = await store.createIssue({
        title: issueTitle,
        description: description,
        type: issueType,
        severity: severity || aiAnalysis.suggestedSeverity,
        latitude: reportLat,
        longitude: reportLng,
        streetName: streetName || 'General Area',
        reportsCount: 1,
        estimatedPopulationImpact: 1200,
      });
      associatedIssueId = createdOrUpdatedIssue.id;
    }

    const reportData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : (req.body.image || ''),
      aiAnalysis,
      associatedIssueId,
      status: 'Submitted',
    };

    const newReport = await store.createReport(reportData);

    const io = req.app.get('io');
    if (io) {
      io.emit('report:created', newReport);
      if (existingIssue) {
        io.emit('issue:updated', createdOrUpdatedIssue);
      } else {
        io.emit('issue:created', createdOrUpdatedIssue);
      }
    }

    return res.status(201).json({
      success: true,
      data: newReport,
      createdIssue: createdOrUpdatedIssue,
      isClustered: !!existingIssue,
      message: existingIssue
        ? 'Report grouped into existing nearby infrastructure issue.'
        : 'New infrastructure issue created.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function analyzeImageEndpoint(req: Request, res: Response) {
  try {
    const filename = req.file ? req.file.originalname : (req.body.filename || 'pothole_sample.jpg');
    const result = analyzeUploadedImage(filename, req.file?.mimetype);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
