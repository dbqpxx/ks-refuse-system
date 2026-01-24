import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/Dashboard";
import DataInputPage from "@/pages/DataInput";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import DataManagementPage from "@/pages/DataManagement";


import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import UserManagementPage from "@/pages/UserManagement";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes - All Auth users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/report" element={<ReportsPage />} />

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/input" element={<DataInputPage />} />
                <Route path="/data" element={<DataManagementPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/users" element={<UserManagementPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
