import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "../context/AdminAuthContext";
import Sidebar from "../components/Sidebar";
import AdminLogin from "../pages/AdminLogin";
import Dashboard from "../pages/Dashboard";
import Orders from "../pages/Orders";
import Shops from "../pages/Shops";
import Payouts from "../pages/Payouts";
import LiveQueues from "../pages/LiveQueues";

const ProtectedLayout = () => {
  const { adminToken } = useAdminAuth();
  
  if (!adminToken) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 md:ml-64 pb-24 md:pb-8 transition-all duration-300">
        <Outlet />
      </main>
    </div>
  );
};

export default function AppRouter() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/live-queues" element={<LiveQueues />} />
            <Route path="/payouts" element={<Payouts />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
