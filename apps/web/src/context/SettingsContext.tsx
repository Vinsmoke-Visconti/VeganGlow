'use client';

import React, { createContext, useContext } from 'react';
import type { BrandInfo, SiteAssets } from '@/lib/admin/queries/settings';

type SettingsContextType = {
  brand: BrandInfo;
  assets: SiteAssets;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
  children,
  brand,
  assets,
}: {
  children: React.ReactNode;
  brand: BrandInfo;
  assets: SiteAssets;
}) {
  return (
    <SettingsContext.Provider value={{ brand, assets }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
