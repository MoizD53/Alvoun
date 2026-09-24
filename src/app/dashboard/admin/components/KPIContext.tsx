'use client';

import React, { createContext, useContext, useState } from 'react';

type KPIContextType = {
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  kpiDataCache: Record<string, any>;
  setKpiDataCache: (id: string, data: any) => void;
};

const KPIContext = createContext<KPIContextType | undefined>(undefined);

export function KPIProvider({ children }: { children: React.ReactNode }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [kpiDataCache, setKpiDataCacheState] = useState<Record<string, any>>({});

  const setKpiDataCache = (id: string, data: any) => {
    setKpiDataCacheState(prev => ({ ...prev, [id]: data }));
  };

  return (
    <KPIContext.Provider value={{ expandedId, setExpandedId, kpiDataCache, setKpiDataCache }}>
      {children}
    </KPIContext.Provider>
  );
}

export function useKPIContext() {
  const context = useContext(KPIContext);
  if (!context) {
    throw new Error('useKPIContext must be used within a KPIProvider');
  }
  return context;
}
