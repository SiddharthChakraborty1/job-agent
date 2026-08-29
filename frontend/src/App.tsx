import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage, AuthLoadingScreen } from './components/LoginPage';
import { useAuth } from './context/AuthContext';
import { usePipelineStream } from './hooks/usePipelineStream';
import { FindJobsPage } from './pages/FindJobsPage';
import { HistoryPage } from './pages/HistoryPage';

function AuthenticatedApp() {
  const { user } = useAuth();
  const pipeline = usePipelineStream(user?.sub ?? '');

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<FindJobsPage userSub={user!.sub} pipeline={pipeline} />}
        />
        <Route
          path="/history"
          element={<HistoryPage loadRunById={pipeline.loadRunById} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;

  return <AuthenticatedApp />;
}

export default App;
