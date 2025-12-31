import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { API_BASE_URL } from "../config";
import { TrendingUp, Users, ShoppingCart, Printer, Activity, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const { adminToken } = useAdminAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { "x-admin-secret": adminToken }
    })
    .then(res => res.json())
    .then(data => setStats(data));
  }, [adminToken]);

  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  );

  if (!stats) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading Analytics...</div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
           <p className="text-sm text-slate-500">System Overview</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
           <Activity size={14} className="animate-pulse"/> Live
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
            title="Total Revenue" 
            value={`₹${stats.total_revenue || 0}`} 
            icon={TrendingUp} 
            color="bg-green-100 text-green-600" 
            subtext="Lifetime earnings"
        />
        <StatCard 
            title="Total Orders" 
            value={stats.total_orders} 
            icon={ShoppingCart} 
            color="bg-blue-100 text-blue-600" 
            subtext="Processed successfully"
        />
        <StatCard 
            title="Active Stations" 
            value={stats.total_shops} 
            icon={Printer} 
            color="bg-purple-100 text-purple-600" 
            subtext="Registered shops"
        />
      </div>

      {/* Quick Actions / Alerts */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
         <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={20}/>
            <div>
               <h3 className="font-bold text-amber-800 text-sm">System Health</h3>
               <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Cron jobs are scheduled for 11:00 PM IST. Ensure backend is running to process daily settlements.
               </p>
            </div>
         </div>
      </div>

    </div>
  );
}