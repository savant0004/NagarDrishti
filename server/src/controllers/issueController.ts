import { Request, Response } from 'express';
import { store } from '../services/store';

export async function getIssues(req: Request, res: Response) {
  try {
    const issues = await store.getIssues();
    return res.json({ success: true, count: issues.length, data: issues });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getIssueById(req: Request, res: Response) {
  try {
    const issue = await store.getIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }
    return res.json({ success: true, data: issue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createIssue(req: Request, res: Response) {
  try {
    const { title, description, type, severity, latitude, longitude, streetName } = req.body;
    if (!title || !type || !latitude || !longitude || !streetName) {
      return res.status(400).json({ success: false, error: 'Missing required issue parameters' });
    }

    const newIssue = await store.createIssue(req.body);

    const io = req.app.get('io');
    if (io) {
      io.emit('issue:created', newIssue);
    }

    return res.status(201).json({ success: true, data: newIssue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function updateIssue(req: Request, res: Response) {
  try {
    const updatedIssue = await store.updateIssue(req.params.id, req.body);
    if (!updatedIssue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    // Feature 5: Citizen Report ↔ Issue Status Synchronization
    if (req.body.status) {
      const allReports = await store.getReports();
      const statusMap: Record<string, string> = {
        NEW: 'Submitted',
        VERIFIED: 'Verified',
        ASSIGNED: 'Assigned',
        'IN PROGRESS': 'In Progress',
        RESOLVED: 'Resolved',
      };
      const syncedReportStatus = statusMap[req.body.status] || 'Submitted';

      const io = req.app.get('io');

      for (const rep of allReports) {
        const matchesId = rep.associatedIssueId === updatedIssue.id;
        const matchesLocation =
          rep.streetName === updatedIssue.streetName &&
          rep.issueType?.toLowerCase() === updatedIssue.type?.toLowerCase();

        if (matchesId || matchesLocation) {
          rep.status = syncedReportStatus;
          rep.updatedAt = new Date();
          if (io) {
            io.emit('report:updated', rep);
          }
        }
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('issue:updated', updatedIssue);
    }

    return res.json({ success: true, data: updatedIssue });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function deleteIssue(req: Request, res: Response) {
  try {
    const success = await store.deleteIssue(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('issue:deleted', { id: req.params.id });
    }

    return res.json({ success: true, message: 'Issue deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
