import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStation } from "../context/StationContext";
import { API_BASE_URL } from "../config";
import { 
  ArrowLeft, Calendar, FileText, CheckCircle2, XCircle, Printer, 
  ChevronLeft, ChevronRight, Loader2, Banknote, Search, History, Wallet
} from "lucide-react";
import { format, addDays, parseISO, isFuture } from "date-fns";

// --- Sub-Components ---

const PrintHistoryView = ({ station }) => {
  const dateInputRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!station?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/shop/history?shop_id=${station.id}&date=${selectedDate}`);
        if (res.ok) setData(await res.json());
      } catch (e) { console.error("History fetch failed:", e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedDate, station?.id]);

  const changeDate = (days) => {
    const newDate = addDays(parseISO(selectedDate), days);
    if (isFuture(newDate) && format(newDate, 'yyyy-MM-dd') !== getTodayString()) return;
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
    setSearchQuery("");
  };

  const filteredOrders = data?.orders?.filter(order => 
    order.order_id.toString().includes(searchQuery) ||
    order.customer.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Date Navigator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"><ChevronLeft size={18}/></button>
            <button onClick={() => dateInputRef.current?.showPicker()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                <Calendar size={16} className="text-blue-600"/>
                <span className="text-sm font-bold text-gray-700 font-mono">{format(parseISO(selectedDate), "MMM dd, yyyy")}</span>
            </button>
            <input type="date" ref={dateInputRef} className="absolute opacity-0 w-0 h-0" value={selectedDate} max={getTodayString()} onChange={(e) => setSelectedDate(e.target.value)} />
            <button onClick={() => changeDate(1)} disabled={selectedDate === getTodayString()} className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 disabled:opacity-30"><ChevronRight size={18}/></button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard icon={Banknote} title="Your Earnings" value={`₹${data?.summary?.total_earnings || 0}`} color="green" />
            <SummaryCard icon={FileText} title="Pages Printed" value={`${(data?.summary?.bw_pages || 0) + (data?.summary?.color_pages || 0)}`} color="blue" />
            <SummaryCard icon={Printer} title="Total Orders" value={data?.summary?.total_orders || 0} color="gray" />
          </div>
          {/* Orders Table */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Transaction Log</h3>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search ID or Name..." className="pl-9 pr-4 py-2 bg-white border rounded-xl text-sm w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-gray-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Student</th>
                      <th className="px-6 py-3 text-center">B/W</th>
                      <th className="px-6 py-3 text-center">Color</th>
                      <th className="px-6 py-3 text-right">Earning</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map(order => <PrintHistoryRow key={order.order_id} order={order} />)}
                    {filteredOrders.length === 0 && (
                        <tr><td colSpan="7" className="py-12 text-center text-gray-400">No orders found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
        </>
      )}
    </div>
  );
};

const PayoutHistoryView = ({ station }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!station?.id) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/shop/payouts?shop_id=${station.id}`);
                if (res.ok) setHistory(await res.json());
            } catch (e) { console.error("Payout history fetch failed:", e); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [station?.id]);

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b bg-gray-50/50">
                <h3 className="font-bold text-gray-800">Payout History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-gray-400 uppercase text-[10px] font-bold">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Pages (B&W/Color)</th>
                            <th className="px-6 py-3">Transaction Ref</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {history.map(payout => (
                            <tr key={payout.id} className="hover:bg-blue-50/30">
                                <td className="px-6 py-4 font-mono text-gray-500">{format(parseISO(payout.created_at), "MMM dd, yyyy, h:mm a")}</td>
                                <td className="px-6 py-4 font-bold text-lg text-green-600">₹{payout.amount}</td>
                                <td className="px-6 py-4">{payout.bw_count} / {payout.color_count}</td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{payout.transaction_ref}</td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr><td colSpan="4" className="py-12 text-center text-gray-400">No payouts found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SummaryCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-3xl font-mono font-bold text-${color}-600`}>{value}</p>
      </div>
      <div className={`w-12 h-12 bg-${color}-50 text-${color}-600 rounded-xl flex items-center justify-center`}>
        <Icon size={24} />
      </div>
    </div>
);

const PrintHistoryRow = ({ order }) => (
    <tr className="hover:bg-blue-50/30 transition-colors">
      <td className="px-6 py-4 font-mono text-gray-500">{format(parseISO(order.timestamp), "h:mm a")}</td>
      <td className="px-6 py-4 font-bold text-gray-900">#{order.order_id}</td>
      <td className="px-6 py-4 text-gray-600">{order.customer}</td>
      <td className="px-6 py-4 text-center font-mono font-medium">{order.details.bw_pages}</td>
      <td className="px-6 py-4 text-center font-mono font-bold text-purple-600">{order.details.color_pages}</td>
      <td className="px-6 py-4 text-right font-mono font-bold text-green-600">{order.status === 'COMPLETED' ? `₹${order.financials.shop_earnings}` : '-'}</td>
      <td className="px-6 py-4 text-right">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${order.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
          {order.status === 'COMPLETED' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
          {order.status}
        </span>
      </td>
    </tr>
);


export default function HistoryPage() {
  const navigate = useNavigate();
  const { station } = useStation();
  const [view, setView] = useState('prints'); // 'prints' | 'payouts'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">History & Records</h1>
            <p className="text-xs text-gray-500 font-medium">{station?.name}</p>
          </div>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
            <button onClick={() => setView('prints')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${view === 'prints' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <History size={16} /> Print History
            </button>
            <button onClick={() => setView('payouts')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${view === 'payouts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Wallet size={16} /> Payout History
            </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8">
        {view === 'prints' ? <PrintHistoryView station={station} /> : <PayoutHistoryView station={station} />}
      </div>
    </div>
  );
}
