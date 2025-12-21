import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { TrendingUp, Users, ShoppingCart, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { adminToken } = useAdminAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/admin/stats", {
      headers: { "x-admin-secret": adminToken }
    })
    .then(res => res.json())
    .then(data => setStats(data));
  }, [adminToken]);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-4 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={28} className={color.replace("bg-", "text-")} />
      </div>
    </div>
  );

  if (!stats) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={`₹${stats.total_revenue}`} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title="Total Orders" value={stats.total_orders} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
        <StatCard title="Active Shops" value={stats.total_shops} icon={Printer} color="bg-purple-100 text-purple-600" />
      </div>

      {/* Simple Placeholder Chart */}
      <div className="card h-80">
        <h3 className="text-lg font-bold mb-4">Revenue Trend (Demo)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[{name: 'Mon', uv: 400}, {name: 'Tue', uv: 300}, {name: 'Wed', uv: 500}]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="uv" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}