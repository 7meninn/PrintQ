import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import { 
  ArrowLeft, Clock, MapPin, FileText, 
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2, Zap
} from "lucide-react";
import { format, addDays, parseISO, isFuture } from "date-fns";
import Footer from "../components/Footer";

// --- Types ---
interface OrderFile {
  filename: string;
  pages: number;
  copies: number;
  color: boolean;
}

interface Order {
  id: number;
  created_at: string;
  status: string;
  total_amount: string;
  shop_name: string;
  files: OrderFile[];
}

interface ActiveOrder {
  id: number;
  status: string;
  shop_name: string;
  queue_position: number;
  file_count: number;
  has_color: boolean;
  total_amount: string;
}

export default function UserHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  });

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [history, setHistory] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Logic to control History Refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const lastOrderIdRef = useRef<number | null>(null);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const getTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  // 1. Fetch Active Order (Polled)
  useEffect(() => {
    if (!user?.id) return;

    const fetchActive = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/user/active?user_id=${user.id}`);
        if (res.ok) {
          const data: ActiveOrder | null = await res.json();
          
          setActiveOrder(prev => {
             if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
             return prev;
          });

          // Check if order finished to refresh history
          const currentId = data ? data.id : null;
          const lastId = lastOrderIdRef.current;

          if (lastId !== null && currentId !== lastId) {
             setRefreshTrigger(prev => prev + 1);
          }

          lastOrderIdRef.current = currentId;
        }
      } catch (e) {
        console.error("Active order poll failed", e);
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [user?.id]);

  // 2. Fetch History (On Date Change OR Refresh Trigger)
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/user/history?user_id=${user.id}&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (e) {
        console.error("History fetch failed", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [selectedDate, user?.id, refreshTrigger]); 

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const newDate = addDays(current, days);
    if (isFuture(newDate) && format(newDate, 'yyyy-MM-dd') !== getTodayString()) return;
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setSelectedDate(e.target.value);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/upload")} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Orders</h1>
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto p-6 space-y-8">
        
        {/* --- ACTIVE ORDER SECTION --- */}
        {activeOrder && (
          <div className="animate-in slide-in-from-top-4 duration-500">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-500 fill-yellow-500"/> Live Status
            </h2>
            
            <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden relative">
              <div className="h-1.5 w-full bg-blue-50">
                <div className="h-full bg-blue-500 animate-pulse w-2/3 rounded-r-full"></div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">Queue #{activeOrder.queue_position}</h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin size={14}/> {activeOrder.shop_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-blue-100">
                      {activeOrder.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-2 font-mono">ID: {activeOrder.id}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl text-blue-600 shadow-sm">
                      <FileText size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{activeOrder.file_count} Documents</p>
                      <p className="text-xs text-gray-500">{activeOrder.has_color ? "Color Print" : "B/W Print"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">Total</p>
                    <p className="text-xl font-bold text-gray-900">₹{activeOrder.total_amount}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 justify-center">
                  <Loader2 size={12} className="animate-spin"/> 
                  Updating status automatically...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORY SECTION --- */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14}/> Past Orders
            </h2>

            {/* Date Navigator */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
              <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500"><ChevronLeft size={16}/></button>
              
              <div className="relative">
                <button onClick={() => dateInputRef.current?.showPicker()} className="px-2 py-1 text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors">
                  {format(parseISO(selectedDate), "MMM dd, yyyy")}
                </button>
                <input 
                  type="date" 
                  ref={dateInputRef} 
                  className="absolute opacity-0 w-0 h-0 top-full" 
                  value={selectedDate} 
                  max={getTodayString()}
                  onChange={handleDateSelect}
                />
              </div>

              <button 
                onClick={() => changeDate(1)} 
                disabled={selectedDate === getTodayString()}
                className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500 disabled:opacity-30"
              >
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="animate-spin mx-auto mb-2" size={24}/>
              <p className="text-xs">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white/50">
              <p className="text-gray-400 text-sm font-medium">No orders found for this date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((order) => {
                const isSuccess = order.status === 'COMPLETED';
                // Treat REFUNDED and FAILED visually the same
                const isFailed = order.status === 'FAILED' || order.status === 'REFUNDED';
                
                return (
                  <div key={order.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSuccess ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {isSuccess ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{order.shop_name}</h3>
                          <p className="text-xs text-gray-500">{format(parseISO(order.created_at), "h:mm a")} • Order #{order.id}</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">₹{order.total_amount}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                      {order.files.map((f, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="truncate max-w-[200px]">{f.filename}</span>
                          <span className="font-medium">{f.copies}x {f.color ? "Color" : "B/W"} ({f.pages} pgs)</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex justify-end">
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isSuccess ? "bg-green-50 text-green-700 border-green-100" :
                          "bg-red-50 text-red-700 border-red-100"
                       }`}>
                          {/* Force display 'FAILED' for refunds too */}
                          {isFailed ? "FAILED" : order.status}
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}