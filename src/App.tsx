import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/Dashboard";
import DataInputPage from "@/pages/DataInput";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import DataManagementPage from "@/pages/DataManagement";

// Placeholder pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-4 border border-dashed rounded-lg bg-background/50">
    <h2 className="text-2xl font-semibold text-muted-foreground">{title} - 建置中</h2>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/input" element={<DataInputPage />} />
          <Route path="/report" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={<Placeholder title="用戶管理" />} />
          <Route path="/data" element={<DataManagementPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
