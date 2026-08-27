import React, { useState } from 'react';
import { AppProvider } from './hooks/AppContext.jsx';
import { useAppContext } from './contexts/AppContextCore.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import MonthlyDashboard from './pages/MonthlyDashboard.jsx';
import TotalDashboard from './pages/TotalDashboard.jsx';
import ExtraBudget from './pages/ExtraBudget.jsx';
import Settings from './pages/Settings.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

const PAGES = {
  monthly: MonthlyDashboard,
  total: TotalDashboard,
  'extra-budget': ExtraBudget,
  settings: Settings,
};

function Shell() {
  const [page, setPage] = useState('monthly');
  const { toast } = useAppContext();
  const Page = PAGES[page] ?? MonthlyDashboard;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-paper text-ink md:flex-row">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Page />
      </main>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { loading, progress } = useAppContext();

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  return <Shell />;
}