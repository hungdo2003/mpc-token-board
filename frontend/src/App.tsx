import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UsersPage } from "./pages/UsersPage";
import { TokensPage } from "./pages/TokensPage";
import { SendTokenPage } from "./pages/SendTokenPage";
import { BulkDistributePage } from "./pages/BulkDistributePage";
import { TransactionHistoryPage } from "./pages/TransactionHistoryPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionHistoryPage />} />

            {/* Admin only */}
            <Route path="/transfer" element={<ProtectedRoute adminOnly><SendTokenPage /></ProtectedRoute>} />
            <Route path="/bulk" element={<ProtectedRoute adminOnly><BulkDistributePage /></ProtectedRoute>} />
            <Route path="/tokens" element={<ProtectedRoute adminOnly><TokensPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute adminOnly><AuditLogsPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
