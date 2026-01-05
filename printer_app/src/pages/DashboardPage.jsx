import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStation } from "../context/StationContext";
import { API_BASE_URL } from "../config";
import { 
  LogOut, PauseCircle, PlayCircle, History, Zap, 
  Server, Ban, ChevronRight, AlertTriangle, Clock
} from "lucide-react";

import HardwarePanel from "../components/HardwarePanel";
import ActiveJob from "../components/ActiveJob";

const PAUSE_TIMEOUT_SECONDS = 900; // 15 minutes

export default function DashboardPage() {
  const navigate = useNavigate();
  const { 
    station, config, setConfig, serviceStatus, setServiceStatus, printers, logout 
  } = useStation();
  
  const [queue, setQueue] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  
  // --- STATS LOGIC ---
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState(() => {
    if (!station?.id) return { bw: 0, color: 0 };
    try {
      const key = `printq_stats_${station.id}_${new Date().toISOString().split('T')[0]}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : { bw: 0, color: 0 };
    } catch (e) { return { bw: 0, color: 0 }; }
  });

  useEffect(() => {
    if (!station?.id) return;
    const key = `printq_stats_${station.id}_${currentDate}`;
    localStorage.setItem(key, JSON.stringify(stats));
  }, [stats, currentDate, station?.id]);

  const totalPagesToday = (stats?.bw || 0) + (stats?.color || 0);
  
  const activeJobRef = useRef(activeJob);
  useEffect(() => { activeJobRef.current = activeJob; }, [activeJob]);

  // --- PAUSE TIMER ---
  const [pauseTime, setPauseTime] = useState(PAUSE_TIMEOUT_SECONDS);
  useEffect(() => {
    if (serviceStatus === 'paused') {
      setPauseTime(PAUSE_TIMEOUT_SECONDS);
      const interval = setInterval(() => setPauseTime(prev => Math.max(0, prev - 1)), 1000);
      return () => clearInterval(interval);
    }
  }, [serviceStatus]);
  
  // --- POLLING LOGIC ---
  useEffect(() => {
    let isMounted = true;
    const poll = async () => {
      if (serviceStatus !== 'active' || !station?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/shop/orders?shop_id=${station.id}`);
        if (!isMounted) return;

        const serverTimeHeader = res.headers.get('Date');
        if (serverTimeHeader) {
          const dateStr = new Date(serverTimeHeader).toISOString().split('T')[0];
          if (dateStr !== currentDate) setCurrentDate(dateStr);
        }

        if (res.ok) {
          const jobs = await res.json();
          if (Array.isArray(jobs)) {
            // Server is the source of truth for the queue.
            setQueue(jobs);
            
            // If there's an active job, check if it was cancelled remotely.
            if (activeJobRef.current && !jobs.some(j => j.order_id === activeJobRef.current.order_id)) {
              console.log(`Active job #${activeJobRef.current.order_id} was remotely cancelled.`);
              setActiveJob(null);
            }
          }
        }
      } catch (e) { console.error("Polling Error:", e); }
    };

    if (serviceStatus === 'active') poll();
    const interval = setInterval(poll, 5000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [serviceStatus, station?.id, currentDate]);

  // --- HANDLERS ---
  const handleStartService = () => {
    if (config.bw === 'Not Available' && config.color === 'Not Available') {
      alert("Configuration Error: Select at least one active printer.");
      return;
    }
    setServiceStatus('active');
  };

  const handlePauseService = () => {
    if (confirm("Are you sure you want to pause? This will take your station offline and any pending orders will be failed after 15 minutes.")) {
      setServiceStatus('paused');
    }
  };

  const handleOpenOrder = () => {
    const nextInQueue = queue.find(j => j.order_id !== activeJob?.order_id);
    if (nextInQueue) {
      setActiveJob(nextInQueue);
    }
  };

  const handleCompleteJob = async (orderId) => {
    try {
      await fetch(`${API_BASE_URL}/shop/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId })
      });
      if (activeJob) {
        let bwCount = 0, colorCount = 0;
        activeJob.files.forEach(f => {
           const pages = (f.pages || 1) * (f.copies || 1);
           if (f.color) colorCount += pages; else bwCount += pages;
        });
        setStats(prev => ({ bw: (prev?.bw || 0) + bwCount, color: (prev?.color || 0) + colorCount }));
      }
      setActiveJob(null);
      if (window.electronAPI?.cleanupCache) await window.electronAPI.cleanupCache();
    } catch (e) { alert("Network Error: Could not mark complete."); }
  };

  const handleFailJob = async (orderId, reason = "Operator Cancelled") => {
    try {
      await fetch(`${API_BASE_URL}/shop/fail`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, reason })
      });
      if (activeJobRef.current?.order_id === orderId) {
        setActiveJob(null);
      }
      if (window.electronAPI?.cleanupCache) await window.electronAPI.cleanupCache();
    } catch(e) { alert("Network Error"); }
  };
  
  const handleFailQueueOrder = async (orderId) => {
    if(!confirm("Reject this order?")) return;
    await handleFailJob(orderId, "Rejected from Queue");
    setQueue(prev => prev.filter(j => j.order_id !== orderId));
  };
  
  const queuedJobs = queue.filter(j => j.order_id !== activeJob?.order_id);
  const nextOrder = queuedJobs[0];

  let canOpenNext = true, blockReason = "";
  if (nextOrder) {
    const hasColor = nextOrder.files.some(f => f.color);
    const hasBW = nextOrder.files.some(f => !f.color);
    if (hasColor && config.color === 'Not Available') {
      canOpenNext = false; blockReason = "Job requires a Color printer.";
    } else if (hasBW && config.bw === 'Not Available' && config.color === 'Not Available') {
      canOpenNext = false; blockReason = "Job requires a B/W or Color printer.";
    }
  }
  
  const nextColorPages = nextOrder?.files.filter(f => f.color).reduce((acc, f) => acc + (f.pages * f.copies), 0) || 0;
  const nextBwPages = nextOrder?.files.filter(f => !f.color).reduce((acc, f) => acc + (f.pages * f.copies), 0) || 0;

  const pauseMins = Math.floor(pauseTime / 60);
  const pauseSecs = Math.floor(pauseTime % 60);

  // --- RENDER ---
  if (serviceStatus === 'paused') {
    return (
      <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-200">
         <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><PauseCircle size={32} /></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Service Paused</h2>
            <p className="text-gray-500 text-sm mb-6">Change printer settings or resume service.</p>
            
            {(queue.length > 0 || activeJob) && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-left flex gap-3">
                  <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                  <div>
                      <p className="text-sm font-bold text-red-700">Warning: Pending Orders</p>
                      <p className="text-xs text-red-600 mt-1 leading-snug">
                          Your station is offline. Queued orders will be automatically failed in:
                      </p>
                      <p className="text-red-700 font-mono font-bold text-2xl mt-2 flex items-center gap-2">
                          <Clock size={18}/> {String(pauseMins).padStart(2, '0')}:{String(pauseSecs).padStart(2, '0')}
                      </p>
                  </div>
              </div>
            )}

            <div className="text-left mb-6">
               <HardwarePanel config={config} setConfig={setConfig} printers={printers} disabled={false} />
            </div>
            <button onClick={handleStartService} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg">Resume Operations</button>
         </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-gray-900 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between h-16 shrink-0 z-20">
        {/* Header */}
        <div className="flex items-center gap-4">
           <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200">P</div>
           <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Station Dashboard</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1.5">
                 {station?.name} 
                 <span className={`w-1.5 h-1.5 rounded-full ${serviceStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                 {serviceStatus === 'active' ? "Live" : "Standby"}
              </p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-6 text-right mr-4">
              <div className="flex flex-col items-end">
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pages Today</p>
                 <p className="text-xl font-mono font-bold text-blue-600 leading-none">{totalPagesToday}</p>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-end">
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">B/W</p>
                 <p className="text-xl font-mono font-bold text-gray-800 leading-none">{stats?.bw || 0}</p>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex flex-col items-end">
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Color</p>
                 <p className="text-xl font-mono font-bold text-purple-600 leading-none">{stats?.color || 0}</p>
              </div>
           </div>
           <button onClick={() => navigate("/history")} className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all mr-2"><History size={18} /> History</button>
           {serviceStatus === 'active' ? ( <button onClick={handlePauseService} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"><PauseCircle size={18}/> Pause Service</button>) : (<button onClick={handleStartService} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-all active:scale-95 animate-in fade-in"><PlayCircle size={18}/> Start Service</button>)}
           <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Sign Out"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Panel */}
        <div className="col-span-3 bg-white border-r border-gray-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="p-5 border-b border-gray-100 bg-gray-50/30">
               <HardwarePanel config={config} setConfig={setConfig} printers={printers} disabled={serviceStatus === 'active'} />
            </div>
            <div className="flex-1 p-5 flex flex-col bg-gray-50/30">
               <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider mb-4"><History size={14}/> Next Order</div>
               {nextOrder ? (
                  <div className="bg-white border-2 border-blue-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-left-4">
                     <div className="flex justify-between items-start mb-4">
                        <div><h3 className="text-lg font-bold text-gray-900 leading-none">#{nextOrder.order_id}</h3><p className="text-xs text-gray-500 mt-1 truncate max-w-[120px]">{nextOrder.user_name || "Guest"}</p></div>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold uppercase">Queued</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2 mb-6">
                        <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100"><p className="text-[10px] text-gray-400 font-bold uppercase">B/W Pages</p><p className="text-xl font-mono font-bold text-gray-800">{nextBwPages}</p></div>
                        <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100"><p className="text-[10px] text-purple-400 font-bold uppercase">Color Pages</p><p className="text-xl font-mono font-bold text-purple-800">{nextColorPages}</p></div>
                     </div>
                     {!canOpenNext && (<div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4 flex gap-2"><Ban className="text-red-500 shrink-0" size={16} /><p className="text-xs font-bold text-red-600 leading-tight">Locked: {blockReason}</p></div>)}
                     <div className="mt-auto space-y-2">
                        <button onClick={handleOpenOrder} disabled={activeJob !== null || !canOpenNext || serviceStatus !== 'active'} className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${activeJob !== null || !canOpenNext || serviceStatus !== 'active' ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"}`} >{activeJob ? "Finish Active Job" : "Open Order"} <ChevronRight size={16}/></button>
                        <button onClick={() => handleFailQueueOrder(nextOrder.order_id)} className="w-full py-2.5 text-red-500 font-bold text-xs hover:bg-red-50 rounded-lg transition-colors">Reject Order</button>
                     </div>
                  </div>
               ) : (
                  <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-4 bg-white">
                     <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400"><History size={20} /></div>
                     <p className="text-gray-400 font-bold text-sm">Queue Empty</p>
                  </div>
               )}
               <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">{queuedJobs.length > 1 ? `${queuedJobs.length - 1} More Waiting` : "Up Next"}</p>
            </div>
         </div>
        {/* Right Panel */}
         <div className="col-span-9 bg-slate-50 p-8 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none opacity-30" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10 h-full max-w-5xl mx-auto w-full flex flex-col">
               {serviceStatus === 'idle' && (<div className="flex-1 flex flex-col items-center justify-center text-center"><div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-blue-100 border border-blue-50 flex items-center justify-center mb-6"><Server size={48} className="text-blue-200" /></div><h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Station Offline</h2><p className="text-gray-500 mt-2">Configure printers and Start Service.</p></div>)}
               {serviceStatus === 'active' && !activeJob && (<div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[2.5rem] bg-white/40 animate-in fade-in"><div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse"><Zap size={32} className="text-blue-500" /></div><h2 className="text-2xl font-bold text-gray-900">Ready to Print</h2><p className="text-gray-500 mt-2">Open the next order to begin.</p></div>)}
               {activeJob && (<ActiveJob order={activeJob} config={config} onComplete={handleCompleteJob} onFail={handleFailJob} />)}
            </div>
         </div>
      </div>
    </div>
  );
}