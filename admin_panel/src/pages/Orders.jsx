import React, { useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { API_BASE_URL } from "../config";
import { 
  Search, RotateCcw, Calendar, Loader2, User, MapPin, 
  Clock, Filter, AlertOctagon, ListOrdered, Hash
} from "lucide-react";
import { format } from "date-fns";

export default function Orders() {
  const { adminToken } = useAdminAuth();
  
  // --- 1. Restore State for Search & Actions ---
  const [searchType, setSearchType] = useState("id");
  const [orderId, setOrderId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // --- 2. Restore Search Logic ---
  const fetchOrders = async () => {
    setLoading(true);
    setSearched(true);
    
    // Construct URL based on search type
    let url = `${API_BASE_URL}/admin/orders?`;
    if (searchType === "id" && orderId) {
      url += `order_id=${orderId}`;
    } else {
      url += `start_date=${startDate}&end_date=${endDate}`;
    }

    try {
      const res = await fetch(url, { headers: { "x-admin-secret": adminToken } });
      const data = await res.json();
      if (res.ok) {
          setOrders(data || []);
      } else {
          alert(data.error || "Failed to fetch");
      }
    } catch(e) {
      alert("Network Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Restore Action Handlers ---
  const handleRefund = async (id) => {
    const reason = prompt("Enter Refund Reason:");
    if (!reason) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/orders/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": adminToken },
            body: JSON.stringify({ order_id: id, reason })
        });
        if(res.ok) { alert("Refund Processed"); fetchOrders(); }
        else { const err = await res.json(); alert("Error: " + err.error); }
    } catch(e) { alert("Network Error"); }
  };

  const handleFail = async (id) => {
    const reason = prompt("Reason for Force Fail:");
    if (!reason) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/orders/fail`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": adminToken },
            body: JSON.stringify({ order_id: id, reason })
        });
        if(res.ok) { alert("Order Marked FAILED"); fetchOrders(); }
        else { const err = await res.json(); alert("Error: " + err.error); }
    } catch(e) { alert("Network Error"); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
       
       <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">Search transactions, manage refunds, and monitor status.</p>
       </div>

       {/* --- 4. Restore Search UI Card --- */}
       <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
          
          {/* Filter Toggle */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1.5 rounded-xl mb-6">
             <button 
                onClick={() => setSearchType("id")}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    searchType === 'id' 
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
             >
                <Hash size={14} /> By Order ID
             </button>
             <button 
                onClick={() => setSearchType("date")}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    searchType === 'date' 
                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
             >
                <Calendar size={14} /> By Date Range
             </button>
          </div>

          {/* Input Fields */}
          <div className="flex flex-col gap-4">
             {searchType === "id" ? (
                <div className="relative group">
                   <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Search size={20}/>
                   </div>
                   <input 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-900 transition-all placeholder:text-slate-400"
                      placeholder="e.g. 1045"
                      type="number"
                      value={orderId}
                      onChange={e => setOrderId(e.target.value)}
                   />
                </div>
             ) : (
                <div className="flex flex-col md:flex-row gap-3">
                   <div className="relative flex-1">
                        <span className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"><Calendar size={18}/></span>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                        />
                   </div>
                   <div className="relative flex-1">
                        <span className="absolute left-4 top-3.5 text-slate-400 pointer-events-none"><Calendar size={18}/></span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                        />
                   </div>
                </div>
             )}

             {/* Search Button */}
             <button 
                onClick={fetchOrders}
                disabled={loading}
                className="bg-slate-900 text-white w-full py-4 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
             >
                {loading ? <Loader2 className="animate-spin" /> : <>Search Records <Filter size={16}/></>}
             </button>
          </div>
       </div>

       {/* --- 5. Results Section --- */}
       {searched && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Results ({orders.length})</h3>
             </div>

             {orders.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
                   <Search className="mx-auto text-slate-300 mb-2" size={32}/>
                   <p className="text-slate-400 font-medium text-sm">No orders matching criteria.</p>
                </div>
             ) : (
                <div className="grid gap-5">
                   {orders.map(order => (
                      <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                         
                         {/* Header */}
                         <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-black text-slate-900">#{order.id}</h3>
                                    {order.queue_position && (
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                                            <ListOrdered size={10} /> Queue {order.queue_position}
                                        </span>
                                    )}
                               </div>
                               <p className="text-xs text-slate-400 font-mono truncate max-w-[150px] md:max-w-none">
                                   {order.razorpay_payment_id || "Unpaid"}
                               </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                order.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-100" :
                                order.status === 'REFUNDED' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                order.status === 'FAILED' ? "bg-red-50 text-red-700 border-red-100" :
                                "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
                                {order.status}
                            </span>
                         </div>

                         {/* Details */}
                         <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-y-4 gap-x-2 mb-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                                <p className="text-base font-bold text-slate-900">₹{order.amount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                                <p className="text-xs font-medium text-slate-700 truncate">{order.user || "Guest"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Shop</p>
                                <p className="text-xs font-medium text-slate-700 truncate">{order.shop}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Time</p>
                                <p className="text-xs font-medium text-slate-700">{format(new Date(order.created_at), "dd MMM, h:mm a")}</p>
                            </div>
                         </div>

                         {/* Actions Toolbar - ENABLED */}
                         <div className="flex gap-2 relative z-10">
                            {(order.status === 'COMPLETED' || order.status === 'FAILED') && (
                               <button 
                                  onClick={() => handleRefund(order.id)}
                                  className="flex-1 bg-white border border-red-100 text-red-600 text-xs font-bold py-3 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                               >
                                  <RotateCcw size={14}/> Refund
                               </button>
                            )}
                            {(order.status === 'QUEUED' || order.status === 'PRINTING') && (
                               <button 
                                  onClick={() => handleFail(order.id)}
                                  className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                               >
                                  <AlertOctagon size={14}/> Force Fail
                               </button>
                            )}
                         </div>

                      </div>
                   ))}
                </div>
             )}
          </div>
       )}
    </div>
  );
}