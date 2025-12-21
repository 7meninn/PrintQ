import React, { useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Shield, Lock, Loader2, Server, Activity, Key, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3000/admin/stats", {
        headers: { "x-admin-secret": secret }
      });
      
      if (res.ok) {
        login(secret);
        navigate("/");
      } else {
        throw new Error("Invalid Admin Secret");
      }
    } catch (err) {
      setError("Access Denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* --- Background Effects (Visible on both Mobile & Desktop) --- */}
      <div className="absolute inset-0 z-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        {/* Glow Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl shadow-blue-900/50 mb-4 border border-white/10">
                <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">PrintQ Admin</h1>
            <p className="text-slate-400 text-sm font-medium">Network Command Center</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            {/* Status Bar inside Card */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Online</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Server size={12} />
                    <span className="text-[10px] font-mono">v2.4.0</span>
                </div>
            </div>

            <div className="p-8 pt-6">
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center gap-1.5">
                            <Key size={14} /> Security Key
                        </label>
                        <div className="relative group">
                            <input 
                                type="password" 
                                className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all text-lg tracking-widest"
                                placeholder="••••••••"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute right-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                                <Lock size={20} />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                            <Activity size={18} className="shrink-0" />
                            <span className="text-sm font-bold">{error}</span>
                        </div>
                    )}

                    <button 
                        disabled={loading || !secret}
                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-300 hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Authenticate"}
                    </button>
                </form>
            </div>
        </div>

        {/* Footer Info (Mobile Friendly) */}
        <div className="grid grid-cols-2 gap-4 px-2">
             <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md flex items-center gap-3">
                 <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Server size={18}/></div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase font-bold">Latency</p>
                     <p className="text-xs font-mono text-white">24ms</p>
                 </div>
             </div>
             <div className="bg-white/5 border border-white/10 p-3 rounded-xl backdrop-blur-md flex items-center gap-3">
                 <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Shield size={18}/></div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase font-bold">Encryption</p>
                     <p className="text-xs font-mono text-white">TLS 1.3</p>
                 </div>
             </div>
        </div>

      </div>
    </div>
  );
}