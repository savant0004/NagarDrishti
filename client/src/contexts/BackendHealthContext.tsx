import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, IServiceReadiness } from '../services/api';

interface BackendHealthValue {
  readiness: IServiceReadiness | null;
  loading: boolean;
  error: boolean;
}

const BackendHealthContext = createContext<BackendHealthValue>({
  readiness: null,
  loading: true,
  error: false,
});

export function BackendHealthProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<BackendHealthValue>({ readiness: null, loading: true, error: false });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const readiness = await api.getHealth();
        if (active) setHealth({ readiness, loading: false, error: false });
      } catch {
        // Clear stale green state: a failed health request cannot imply a healthy database.
        if (active) setHealth({ readiness: null, loading: false, error: true });
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return <BackendHealthContext.Provider value={health}>{children}</BackendHealthContext.Provider>;
}

export function useBackendHealth() {
  return useContext(BackendHealthContext);
}
