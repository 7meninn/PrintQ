import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { API_BASE_URL } from "../config";
import { Wallet, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Payouts() {
  const { adminToken } = useAdminAuth();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = () => {
    fetch(`${API_BASE_URL}/admin/payouts`, {
      headers: { "x-admin-secret": adminToken }
    })
    .then(res => res.json())
    .then(data => { setPayouts(data); setLoading(false); });
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleSettle = async (payout) => {
      const ref = prompt(`Enter UPI Transaction Ref for ₹${payout.amount}:`);
      if(!ref) return;

      try {
        await fetch(`${API_BASE_URL}/admin/payouts/mark-paid`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": adminToken },
            body: JSON.stringify({ payout_id: payout.id, transaction_ref: ref })
        });
        fetchPayouts();
      } catch(e) { alert("Error updating"); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-500">Daily Settlements</p>
       </div>

       {loading ? <div className="text-center py-12"><Loader2 className="animate-spin mx-auto"/></div> : (
          <div className="grid gap-4">
             {payouts.map(p => (
                 <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Shop #{p.shop_id}</p>
                          <h3 className="text-2xl font-mono font-bold text-slate-900">₹{p.amount}</h3>
                       </div>
                       <div className={`p-2 rounded-full ${p.status === 'PROCESSED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                          {p.status === 'PROCESSED' ? <CheckCircle2 size={20}/> : <Clock size={20}/>}
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 flex justify-between mb-4">
                       <span>{p.bw_count} B/W Pages</span>
                       <span>{p.color_count} Color Pages</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                       <span className="text-xs text-slate-400 font-medium">
                          {p.transaction_ref || "Pending Transfer"}
                       </span>
                       
                       {p.status !== 'PROCESSED' && (
                          <button 
                            onClick={() => handleSettle(p)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-all"
                          >
                            Mark Paid
                          </button>
                       )}
                    </div>
                 </div>
             ))}
          </div>
       )}
    </div>
  );
}