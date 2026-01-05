import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Store, Timer, Wallet, Shield, LogOut } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAdminAuth();

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Home" },
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/shops", icon: Store, label: "Shops" },
    { to: "/live-queues", icon: Timer, label: "Live Queues" },
    { to: "/payouts", icon: Wallet, label: "Finance" },
  ];

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <div className="hidden md:flex w-64 bg-white border-r border-slate-200 h-screen flex-col fixed left-0 top-0 z-50">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Shield size={24} className="fill-blue-600 text-white"/> PrintQ Admin
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.to}
              to={item.to} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.to ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* --- MOBILE BOTTOM NAV --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
            <Link 
              key={item.to}
              to={item.to} 
              className={`flex flex-col items-center gap-1 transition-colors ${
                location.pathname === item.to ? "text-blue-600" : "text-slate-400"
              }`}
            >
              <div className={`p-1.5 rounded-xl ${location.pathname === item.to ? "bg-blue-50" : ""}`}>
                <item.icon size={24} strokeWidth={location.pathname === item.to ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
        ))}
        <button onClick={logout} className="flex flex-col items-center gap-1 text-red-400">
            <div className="p-1.5"><LogOut size={24} /></div>
            <span className="text-[10px] font-bold">Exit</span>
        </button>
      </div>
    </>
  );
}
