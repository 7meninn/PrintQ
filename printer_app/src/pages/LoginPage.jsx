import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStation } from "../context/StationContext";
import { 
  Printer, Lock, Hash, AlertCircle, Loader2, 
  CheckCircle, ArrowRight
} from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useStation();
  
  const [stationId, setStationId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // DEBUG: Use this to log in immediately without backend if needed
    if (stationId === "1" && password === "admin") {
       login({ id: 1, name: "Station 01 (Dev)", token: "dev-token" });
       navigate("/dashboard");
       return;
    }

    try {
      // Trying the most likely correct endpoint based on your Auth pattern
      // Sending default printer status as false initially
      const payload = { 
        id: Number(stationId), // Changed from shop_id to id based on your controller code
        password: password,
        has_bw: false,
        has_color: false
      };

      console.log("Sending Login Payload:", payload);

      const res = await fetch("http://localhost:3000/shop/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type");
      
      // 1. Handle Non-JSON Responses (HTML Error Pages)
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("API Error (Raw):", text);
        
        let niceMsg = "Server returned HTML instead of JSON.";
        if (text.includes("<title>")) {
           const titleMatch = text.match(/<title>(.*?)<\/title>/);
           if (titleMatch) niceMsg = `Server Error: ${titleMatch[1]}`;
        } else if (text.includes("Cannot")) {
           niceMsg = `Route Error: ${text.split('\n')[0].replace(/<[^>]*>?/gm, '')}`; 
        }
        
        throw new Error(`${niceMsg} (Check backend URL)`);
      }

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login Failed");

      // 2. Success
      login({
        id: data.shop.id,
        name: data.shop.name,
        // Backend doesn't seem to return a token in your code snippet, 
        // but if it does, we use it. Otherwise just use ID.
        token: data.shop.id 
      });

      navigate("/dashboard");

    } catch (err) {
      console.error("Login Logic Error:", err);
      const msg = err.message === "Failed to fetch" 
        ? "Could not connect to Server (Port 3000). Is it running?" 
        : err.message;
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-gray-900 overflow-hidden relative flex items-center justify-center">
      
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-white opacity-70"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* LEFT: Branding */}
          <div className="text-center lg:text-left space-y-6">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Printer size={28} className="text-white" />
               </div>
               <span className="text-3xl font-bold tracking-tight text-gray-900">PrintQ</span>
            </div>

            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  Station Online
               </div>
               
               <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                 Station <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Access Portal</span>
               </h1>
               
               <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto lg:mx-0">
                  Welcome back, Partner. Authenticate to unlock the kiosk and manage the campus print queue.
               </p>
            </div>

            <div className="flex justify-center lg:justify-start gap-6 text-sm font-bold text-gray-500 pt-2">
               <div className="flex items-center gap-2"><div className="p-1 bg-green-100 rounded-full text-green-600"><CheckCircle size={14}/></div> Secure I/O</div>
               <div className="flex items-center gap-2"><div className="p-1 bg-green-100 rounded-full text-green-600"><CheckCircle size={14}/></div> Low Latency</div>
            </div>
          </div>

          {/* RIGHT: Login Card */}
          <div className="w-full max-w-[400px] mx-auto lg:ml-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
               
               <div className="px-8 pt-8 pb-6 border-b border-slate-50">
                  <h3 className="text-xl font-bold text-gray-900">Station Login</h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Enter your credentials to continue.</p>
               </div>

               <div className="p-8 pt-6 space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl flex items-start gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                      <span className="break-words">{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                     <div className="space-y-4">
                        <div>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Station ID</label>
                           <div className="relative group">
                              <Hash className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
                              <input 
                                 type="text" 
                                 className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-800 placeholder:text-gray-400"
                                 value={stationId}
                                 onChange={e => setStationId(e.target.value)}
                                 placeholder="e.g. 101"
                                 required
                                 autoFocus
                              />
                           </div>
                        </div>

                        <div>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                           <div className="relative group">
                              <Lock className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
                              <input 
                                 type="password" 
                                 className="w-full pl-11 p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-800 placeholder:text-gray-400"
                                 value={password}
                                 onChange={e => setPassword(e.target.value)}
                                 placeholder="••••••••"
                                 required
                              />
                           </div>
                        </div>
                     </div>

                     <button 
                        disabled={isSubmitting} 
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                     >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <>Unlock Dashboard <ArrowRight size={20} className="opacity-80"/></>}
                     </button>
                  </form>
               </div>
            </div>
            
            <p className="text-center text-[10px] uppercase tracking-widest text-gray-300 mt-8 font-bold">
               Secured by PrintQ Core
            </p>
          </div>
      </div>
    </div>
  );
}