import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Store, Wallet, LogOut, Shield } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAdminAuth();

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
          <Shield size={24}/> PrintQ Admin
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/orders" icon={ShoppingBag} label="Orders" />
        <NavItem to="/shops" icon={Store} label="Shops" />
        <NavItem to="/payouts" icon={Wallet} label="Payouts" />
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}