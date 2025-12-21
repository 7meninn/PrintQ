import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";

// Components
import Sidebar from "../components/Sidebar";

// Pages
import AdminLogin from "../pages/AdminLogin";
import Dashboard from "../pages/Dashboard";

// Placeholders (You will create actual files for these later)
const Orders = () => <div className="p-8"><h1 className="text-2xl font-bold">Order Management</h1><p className="text-slate-500 mt-2">Manage refunds and view details.</p></div>;
const Shops = () => <div className="p-8"><h1 className="text-2xl font-bold">Shop Management</h1><p className="text-slate-500 mt-2">Add or remove printing stations.</p></div>;
const Payouts = () => <div className="p-8"><h1 className="text-2xl font-bold">Payouts & Finance</h1><p className="text-slate-500 mt-2">Settle daily earnings manually.</p></div>;

const ProtectedLayout = () => {
  const { adminToken } = useAdminAuth();
  
  if (!adminToken) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

// --- Main Router Component ---
export default function AppRouter() {
  return (
    // 1. Wrap App in Auth Provider
    <AdminAuthProvider>
      {/* 2. Initialize Router */}
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<AdminLogin />} />
          
          {/* Protected Area */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/payouts" element={<Payouts />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}