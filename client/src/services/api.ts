import axios from 'axios';
import { IIssue, ICitizenReport, IStreet, ISimulationResult, IAuthUser, UserRole } from '../types';

export interface AIVisionResult {
  detected: boolean;
  category: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  severityExplanation: string;
  confidence: number;
  evidence: string[];
  recommendedAction: string;
  requiresHumanReview: boolean;
  provider: 'Groq';
  modelIdentifier: string;
  analyzedAt: string;
}

// In development, Vite proxies /api → localhost:5000
// In production (Vercel/Netlify/Render), set VITE_API_URL to your backend URL
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const API_BASE = configuredApiUrl ? `${configuredApiUrl}/api` : '/api';

export interface IServiceReadiness {
  success: boolean;
  status: 'healthy' | 'degraded' | 'connecting' | 'unavailable';
  applicationMode: 'live' | 'demo' | 'unavailable';
  dataSource?: 'live' | 'demo' | 'unavailable';
  applicationReady?: boolean;
  database: { status: 'connected' | 'connecting' | 'unavailable' | 'demo'; ready: boolean; mongoReadyState: number };
}

export interface IAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface IAssistantConversation {
  id: string;
  title: string;
  messages: IAssistantMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IDuplicateCheckResult { hasPossibleDuplicates: boolean; aiReview?: 'possible_match' | 'uncertain' | 'no_likely_match' | 'unavailable'; }
export interface INotification { id: string; kind: string; title: string; message: string; reportId?: string; readAt?: string | null; createdAt: string; }

axios.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('nagardrishti_session');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) { super(message); this.name = 'ApiError'; }
}

function toApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error || error.response?.data?.message;
    return new ApiError(message || (error.code === 'ERR_NETWORK' ? 'Backend is unavailable. Check that the NagarDrishti server is running.' : 'The request failed. Please try again.'), error.response?.status, error.response?.data?.code);
  }
  return error instanceof Error ? error : new Error('The request failed. Please try again.');
}

export const api = {
  async getHealth(): Promise<IServiceReadiness> {
    try { const res = await axios.get(`${API_BASE}/health`, { timeout: 5000 }); return res.data; }
    catch (error) { throw toApiError(error); }
  },
  async getReadiness(): Promise<IServiceReadiness> {
    try { const res = await axios.get(`${API_BASE}/ready`, { validateStatus: () => true }); return res.data; }
    catch (error) { throw toApiError(error); }
  },
  async login(email: string, password: string): Promise<{ user: IAuthUser; token: string }> {
    try { const res = await axios.post(`${API_BASE}/auth/login`, { email, password }); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async register(name: string, email: string, password: string): Promise<{ user: IAuthUser; token: string }> {
    try { const res = await axios.post(`${API_BASE}/auth/register`, { name, email, password }); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async getCurrentUser(): Promise<IAuthUser> {
    try { const res = await axios.get(`${API_BASE}/auth/me`); return res.data.data.user; }
    catch (error) { throw toApiError(error); }
  },
  async createStaff(name: string, email: string, password: string, role: UserRole = 'municipal_staff', department = ''): Promise<IAuthUser> {
    try { const res = await axios.post(`${API_BASE}/auth/staff`, { name, email, password, role, department }); return res.data.data.user; }
    catch (error) { throw toApiError(error); }
  },
  async getStaffUsers(): Promise<Array<IAuthUser & { isActive: boolean }>> {
    try { const response = await axios.get(`${API_BASE}/auth/staff`); return response.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async updateStaffActive(id: string, isActive: boolean): Promise<void> {
    try { await axios.patch(`${API_BASE}/auth/staff/${encodeURIComponent(id)}/status`, { isActive }); }
    catch (error) { throw toApiError(error); }
  },
  // Issues
  async getIssues(): Promise<IIssue[]> {
    try {
      const res = await axios.get(`${API_BASE}/issues`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getIssueById(id: string): Promise<IIssue | null> {
    try {
      const res = await axios.get(`${API_BASE}/issues/${id}`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getWorkQueue(): Promise<IIssue[]> {
    try { const response = await axios.get(`${API_BASE}/issues/work-queue`); return response.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async getIssueHotspots(): Promise<Array<{ latitude: number; longitude: number; count: number; categories: Record<string, number>; openCount: number }>> {
    try { const response = await axios.get(`${API_BASE}/issues/hotspots`); return response.data.data; }
    catch (error) { throw toApiError(error); }
  },

  async updateIssueStatus(id: string, status: string, assignedTeam?: string, workflow?: { assignedUserId?: string; resolutionNotes?: string; department?: string }): Promise<IIssue | null> {
    try {
      const res = await axios.patch(`${API_BASE}/issues/${id}`, { status, assignedTeam, ...workflow });
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Reports
  async getReports(): Promise<ICitizenReport[]> {
    try {
      const res = await axios.get(`${API_BASE}/reports`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getReportById(reportId: string): Promise<ICitizenReport | null> {
    try {
      const res = await axios.get(`${API_BASE}/reports/${reportId}`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async uploadResolutionEvidence(reportId: string, file: File, note = ''): Promise<ICitizenReport> {
    try { const form = new FormData(); form.append('photo', file); form.append('note', note); const response = await axios.post(`${API_BASE}/reports/${encodeURIComponent(reportId)}/resolution-evidence`, form, { headers: { 'Content-Type': 'multipart/form-data' } }); return response.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async downloadResolutionEvidence(reportId: string, evidencePath: string): Promise<string> {
    try { const filename = evidencePath.split('/').pop() || ''; const response = await axios.get(`${API_BASE}/reports/${encodeURIComponent(reportId)}/evidence/${encodeURIComponent(filename)}`, { responseType: 'blob' }); return URL.createObjectURL(response.data); }
    catch (error) { throw toApiError(error); }
  },

  async createReport(formData: FormData, idempotencyKey: string): Promise<{ report: ICitizenReport; createdIssue?: IIssue }> {
    try {
      const res = await axios.post(`${API_BASE}/reports`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Idempotency-Key': idempotencyKey },
      });
      return { report: res.data.data, createdIssue: res.data.createdIssue };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async analyzeImage(file: File): Promise<AIVisionResult> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await axios.post(`${API_BASE}/reports/analyze-image`, formData);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Streets
  async getStreets(): Promise<IStreet[]> {
    try {
      const res = await axios.get(`${API_BASE}/streets`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Analytics
  async getAnalytics(): Promise<any> {
    try {
      const res = await axios.get(`${API_BASE}/analytics`);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  // Simulator
  async runSimulation(params: { rainfall: number; traffic: number; drainageCapacity: number; garbageDelay: number }): Promise<ISimulationResult> {
    try {
      const res = await axios.post(`${API_BASE}/simulation`, params);
      return res.data.data;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async reseedData(): Promise<void> {
    try {
      await axios.post(`${API_BASE}/seed`);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getAssistantConversations(): Promise<Array<Pick<IAssistantConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>>> {
    try { const res = await axios.get(`${API_BASE}/assistant/conversations`); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },

  async checkReportDuplicates(input: { issueType: string; description: string; latitude: number; longitude: number; imageHash?: string }): Promise<IDuplicateCheckResult> {
    try { const response = await axios.post(`${API_BASE}/reports/duplicates`, input); return response.data.data; }
    catch (error) { throw toApiError(error); }
  },
  async linkDuplicateReports(sourceReportId: string, targetReportId: string): Promise<void> {
    try { await axios.patch(`${API_BASE}/reports/${encodeURIComponent(sourceReportId)}/link-duplicate`, { targetReportId, confirm: true }); }
    catch (error) { throw toApiError(error); }
  },

  async getNotifications(unread = false): Promise<{ data: INotification[]; unreadCount: number }> {
    try { const response = await axios.get(`${API_BASE}/notifications`, { params: { unread } }); return response.data; }
    catch (error) { throw toApiError(error); }
  },
  async markNotificationRead(id: string): Promise<void> {
    try { await axios.patch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`); }
    catch (error) { throw toApiError(error); }
  },
  async markAllNotificationsRead(): Promise<void> {
    try { await axios.patch(`${API_BASE}/notifications/read-all`); }
    catch (error) { throw toApiError(error); }
  },

  async createAssistantConversation(): Promise<IAssistantConversation> {
    try { const res = await axios.post(`${API_BASE}/assistant/conversations`); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },

  async getAssistantConversation(id: string): Promise<IAssistantConversation> {
    try { const res = await axios.get(`${API_BASE}/assistant/conversations/${encodeURIComponent(id)}`); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },

  async sendAssistantMessage(id: string, content: string): Promise<{ conversation: IAssistantConversation; reply: string; model: string }> {
    try { const res = await axios.post(`${API_BASE}/assistant/conversations/${encodeURIComponent(id)}/messages`, { content }); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },

  async deleteAssistantConversation(id: string): Promise<void> {
    try { await axios.delete(`${API_BASE}/assistant/conversations/${encodeURIComponent(id)}`); }
    catch (error) { throw toApiError(error); }
  },

  async sendPublicAssistantMessage(content: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<{ reply: string; model: string; persisted: false }> {
    try { const res = await axios.post(`${API_BASE}/assistant/public-chat`, { content, history }); return res.data.data; }
    catch (error) { throw toApiError(error); }
  },
};
