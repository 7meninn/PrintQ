import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { API_BASE_URL } from "../config";
import { Plus, Store, MapPin, Trash2, Loader2, Printer, Palette, Ban, Wifi, WifiOff } from "lucide-react";

export default function Shops() {
  const { adminToken } = useAdminAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchShops = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/admin/shops`, {
      headers: { "x-admin-secret": adminToken }
    })
    .then(res => res.json())
    .then(data => { setShops(data); setLoading(false); })
    .catch(() => setLoading(false));
  };

  useEffect(() => { fetchShops(); }, []);

  const handleAddShop = async () => {
      const name = prompt("Shop Name:");
      if(!name) return;
      const location = prompt("Location:");
      const password = prompt("Password:");
      const upi_id = prompt("UPI ID:");

      try {
        await fetch(`${API_BASE_URL}/admin/shops/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-admin-secret": adminToken },
            body: JSON.stringify({ name, location, password, upi_id })
        });
        fetchShops();
      } catch(e) { alert("Failed"); }
  };

  const handleDelete = async (id) => {
      if(!confirm(`Delete Shop #${id}?`)) return;
      await fetch(`${API_BASE_URL}/admin/shops/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-secret": adminToken },
          body: JSON.stringify({ id })
      });
      fetchShops();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
       {/* Header */}
       <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Station Network</h1>
            <p className="text-sm text-slate-500 mt-1">Live status monitoring</p>
          </div>
          <button onClick={handleAddShop} className="bg-slate-900 text-white p-3.5 rounded-xl shadow-lg hover:bg-black transition-all active:scale-95">
             <Plus size={20} />
          </button>
       </div>

       {loading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
       ) : (
          <div className="grid gap-4">
             {shops.map(shop => {
                 const isOnline = shop.status === 'ONLINE';
                 return (
                     <div key={shop.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        
                        {/* Top Row: Icon + Name + Status */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isOnline ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                   <Store size={24} />
                                </div>
                                <div>
                                   <h3 className="font-bold text-lg text-slate-900 leading-tight">{shop.name}</h3>
                                   <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium"><MapPin size={12}/> {shop.location}</p>
                                </div>
                            </div>
                            
                            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border ${
                                isOnline ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                                {isOnline ? <Wifi size={12}/> : <WifiOff size={12}/>}
                                {shop.status}
                            </div>
                        </div>

                        {/* Middle Row: Capabilities (Only if Online) */}
                        {isOnline ? (
                            <div className="flex gap-2 mb-4">
                                {/* B/W Status */}
                                <div className={`flex-1 p-3 rounded-xl border flex items-center gap-2 ${
                                    shop.has_bw ? "bg-white border-blue-100" : "bg-slate-50 border-transparent opacity-60"
                                }`}>
                                    <div className={`p-1.5 rounded-lg ${shop.has_bw ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}>
                                        {shop.has_bw ? <Printer size={14}/> : <Ban size={14}/>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">B/W</p>
                                        <p className={`text-xs font-bold ${shop.has_bw ? "text-slate-900" : "text-slate-400"}`}>
                                            {shop.has_bw ? "Ready" : "Offline"}
                                        </p>
                                    </div>
                                </div>

                                {/* Color Status */}
                                <div className={`flex-1 p-3 rounded-xl border flex items-center gap-2 ${
                                    shop.has_color ? "bg-white border-purple-100" : "bg-slate-50 border-transparent opacity-60"
                                }`}>
                                    <div className={`p-1.5 rounded-lg ${shop.has_color ? "bg-purple-100 text-purple-600" : "bg-slate-200 text-slate-400"}`}>
                                        {shop.has_color ? <Palette size={14}/> : <Ban size={14}/>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Color</p>
                                        <p className={`text-xs font-bold ${shop.has_color ? "text-slate-900" : "text-slate-400"}`}>
                                            {shop.has_color ? "Ready" : "Offline"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 rounded-xl p-3 text-center mb-4 border border-slate-100">
                                <p className="text-xs text-slate-400 font-medium">Station is currently unreachable.</p>
                            </div>
                        )}
                        
                        {/* Bottom Row: Details & Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                           <div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">UPI ID</p>
                              <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded w-fit">
                                  {shop.upi_id || "Not Configured"}
                              </p>
                           </div>
                           
                           <button 
                             onClick={() => handleDelete(shop.id)} 
                             className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                             title="Delete Shop"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>

                     </div>
                 );
             })}
          </div>
       )}
    </div>
  );
}