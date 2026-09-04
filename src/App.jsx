import React, { useState } from 'react';
import { AppProvider } from './hooks/AppContext.jsx';
import { useAppContext } from './contexts/AppContextCore.jsx';
import Sidebar from './components/Sidebar.jsx';
import Toast from './components/Toast.jsx';
import MonthlyDashboard from './pages/MonthlyDashboard.jsx';
import TotalDashboard from './pages/TotalDashboard.jsx';
import ExtraBudget from './pages/ExtraBudget.jsx';
import Goals from './pages/Goals.jsx';
import Settings from './pages/Settings.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { UpdateWatcher } from './components/UpdateWatcher.jsx';

const PAGES = {
  monthly: MonthlyDashboard,
  total: TotalDashboard,
  'extra-budget': ExtraBudget,
  goals: Goals,
  settings: Settings,
};

function Shell() {
  const [page, setPage] = useState('monthly');
  const { toast, showToast } = useAppContext();
  const Page = PAGES[page] ?? MonthlyDashboard;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-paper/0 text-ink md:flex-row">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Page />
      </main>
      {toast && <Toast toast={toast} />}
      <UpdateWatcher onAvailable={(version) => showToast(`v${version} is available — install it from Settings.`)} />
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