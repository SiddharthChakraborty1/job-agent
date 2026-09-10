import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { LoginPage, AuthLoadingScreen } from './components/LoginPage';
import { AdminLoginPage } from './components/AdminLoginPage';
import { AdminShell } from './components/AdminShell';
import { useAuth } from './context/AuthContext';
import { usePipelineStream } from './hooks/usePipelineStream';
import { AdminForbidden } from './pages/AdminForbidden';
import { AdminRunDetailPage } from './pages/AdminRunDetailPage';
import { AdminUserDetailPage } from './pages/AdminUserDetailPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { FindJobsPage } from './pages/FindJobsPage';
import { HistoryPage } from './pages/HistoryPage';

function AdminGate() {
  const { user } = useAuth();
  if (!user) return <AdminLoginPage />;
  if (!user.isAdmin) return <AdminForbidden />;
  return <Outlet />;
}

function adminRoute() {
  return (
    <Route path="/admin" element={<AdminGate />}>
      <Route element={<AdminShell />}>
        <Route index element={<AdminUsersPage />} />
        <Route path="users/:sub" element={<AdminUserDetailPage />} />
        <Route path="users/:sub/runs/:runId" element={<AdminRunDetailPage />} />
      </Route>
    </Route>
  );
}

function LoggedInRoutes() {
  const { user } = useAuth();
  const pipeline = usePipelineStream(user!.sub);

  return (
    <Routes>
      {adminRoute()}
      <Route path="/" element={<FindJobsPage userSub={user!.sub} pipeline={pipeline} />} />
      <Route path="/history" element={<HistoryPage loadRunById={pipeline.loadRunById} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function LoggedOutRoutes() {
  return (
    <Routes>
      {adminRoute()}
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;

  return (
    <BrowserRouter>
      {user ? <LoggedInRoutes /> : <LoggedOutRoutes />}
    </BrowserRouter>
  );
}

export default App;
