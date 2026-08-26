import { createContext, useContext } from 'react';

// Create the context
export const AppContext = createContext(null);

// Export the hook (this is NOT a component, so it's safe here)
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}