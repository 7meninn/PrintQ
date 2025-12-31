import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStation } from "../context/StationContext";
import { API_BASE_URL } from "../config";
import { 
  ArrowLeft, Calendar, FileText, 
  CheckCircle2, XCircle, Printer, ChevronLeft, ChevronRight, Loader2,
  Banknote, Search
} from "lucide-react";
import { format, addDays, parseISO, isFuture } from "date-fns";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { station } = useStation();
  
  // Ref for the hidden date input
  const dateInputRef = useRef(null);

  // Initialize with local YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const getTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!station?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/shop/history?shop_id=${station.id}&date=${selectedDate}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("History fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, station?.id]);

  // Robust Date Increment/Decrement using date-fns
  const changeDate = (days) => {
    const current = parseISO(selectedDate);
    const newDate = addDays(current, days);
    // Prevent going into the future
    if (isFuture(newDate) && format(newDate, 'yyyy-MM-dd') !== getTodayString()) {
        return; 
    }
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
    setSearchQuery(""); 
  };

  // Calendar Picker Handler
  const handleDateSelect = (e) => {
    if (e.target.value) {
      setSelectedDate(e.target.value);
      setSearchQuery("");
    }
  };

  // Filter Logic
  const filteredOrders = data?.orders?.filter(order => 
    order.order_id.toString().includes(searchQuery) ||
    order.customer.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900">
      
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Order History</h1>
            <p className="text-xs text-gray-500 font-medium">Records for {station?.name}</p>
          </div>
        </div>

        {/* --- HYBRID DATE NAVIGATOR --- */}
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm relative">
          
          {/* Previous Day */}
          <button 
            onClick={() => changeDate(-1)} 
            className="p-2 hover:bg-gray-50 hover:text-blue-600 rounded-lg text-gray-500 transition-all active:scale-95"
            title="Previous Day"
          >
            <ChevronLeft size={18}/>
          </button>

          {/* Middle Button (Triggers Calendar) */}
          <div className="relative">
            <button 
                onClick={() => dateInputRef.current?.showPicker()} 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors group cursor-pointer"
                title="Select Specific Date"
            >
                <Calendar size={16} className="text-blue-600 group-hover:scale-110 transition-transform"/>
                <span className="text-sm font-bold text-gray-700 font-mono group-hover:text-blue-700">
                    {format(parseISO(selectedDate), "MMM dd, yyyy")}
                </span>
            </button>
            
            {/* Hidden Native Date Input */}
            <input 
                type="date"
                ref={dateInputRef}
                className="absolute top-10 left-0 w-0 h-0 opacity-0 pointer-events-none"
                value={selectedDate}
                max={getTodayString()} // Disable future dates in picker
                onChange={handleDateSelect}
            />
          </div>

          {/* Next Day */}
          <button 
            onClick={() => changeDate(1)} 
            disabled={selectedDate === getTodayString()} 
            className="p-2 hover:bg-gray-50 hover:text-blue-600 rounded-lg text-gray-500 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed active:scale-95"
            title="Next Day"
          >
            <ChevronRight size={18}/>
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Loading Records...</p>
          </div>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Earnings</p>
                  <p className="text-3xl font-mono font-bold text-green-600">₹{data?.summary?.total_earnings || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                  <Banknote size={24} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pages Printed</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-gray-800">{data?.summary?.bw_pages || 0}</span>
                    <span className="text-[10px] font-bold text-gray-400">BW</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-2xl font-mono font-bold text-purple-600">{data?.summary?.color_pages || 0}</span>
                    <span className="text-[10px] font-bold text-purple-400">COL</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Orders</p>
                  <p className="text-3xl font-mono font-bold text-gray-800">{data?.summary?.total_orders || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center">
                  <Printer size={24} />
                </div>
              </div>
            </div>

            {/* ORDERS TABLE */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-gray-800">Transaction Log</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                    {filteredOrders.length} Entries
                  </span>
                </div>
                
                {/* Search Input */}
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Order ID or Name..." 
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Order ID</th>
                      <th className="px-6 py-3">Student</th>
                      <th className="px-6 py-3 text-center">B/W Pg</th>
                      <th className="px-6 py-3 text-center">Col Pg</th>
                      <th className="px-6 py-3 text-right">Earning</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                          {searchQuery ? "No matching orders found." : "No orders found for this date."}
                        </td>
                      </tr>
                    )}
                    {filteredOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">
                          {format(parseISO(order.timestamp), "h:mm a")}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          #{order.order_id}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {order.customer}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-gray-600 font-medium">
                          {order.details.bw_pages}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-purple-600 font-bold">
                          {order.details.color_pages}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                          {order.status === 'COMPLETED' ? `₹${order.financials.shop_earnings}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            order.status === 'COMPLETED' 
                              ? "bg-green-50 text-green-700 border-green-100" 
                              : "bg-red-50 text-red-700 border-red-100"
                          }`}>
                            {order.status === 'COMPLETED' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}