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
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export interface IServiceReadiness {
  success: boolean;
  status: 'healthy' | 'degraded' | 'connecting' | 'unavailable';
  applicationMode: 'live' | 'demo' | 'unavailable';
  database: { status: string; ready: boolean; mongoReadyState: number };
}

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
    try { const res = await axios.get(`${API_BASE}/health`); return res.data; }
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
  async createStaff(name: string, email: string, password: string, role: UserRole = 'municipal_staff'): Promise<IAuthUser> {
    try { const res = await axios.post(`${API_BASE}/auth/staff`, { name, email, password, role }); return res.data.data.user; }
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

  async updateIssueStatus(id: string, status: string, assignedTeam?: string): Promise<IIssue | null> {
    try {
      const res = await axios.patch(`${API_BASE}/issues/${id}`, { status, assignedTeam });
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
};
