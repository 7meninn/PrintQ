import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { API_BASE_URL } from '../config';
import { Loader2, AlertTriangle, Clock, Server, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LiveQueues() {
    const { adminToken } = useAdminAuth();
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchQueues = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/queues`, {
                headers: { 'x-admin-secret': adminToken },
            });
            if (!res.ok) {
                throw new Error('Failed to fetch live queues.');
            }
            const data = await res.json();
            setQueues(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueues();
        const interval = setInterval(fetchQueues, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [adminToken]);

    const handleFailAll = async (shopId) => {
        if (!confirm(`Are you sure you want to fail ALL queued orders for Shop ID #${shopId}?`)) {
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/admin/queues/fail-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': adminToken,
                },
                body: JSON.stringify({ shop_id: shopId }),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fail orders.');
            }
            // Refresh queues immediately after action
            fetchQueues();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Live Station Queues</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time view of waiting orders.</p>
                </div>
            </div>

            {loading && <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>}
            {error && <div className="py-20 text-center text-red-500">{error}</div>}

            {!loading && !error && queues.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <Server className="mx-auto text-slate-400 mb-4" size={48} />
                    <h3 className="font-bold text-slate-700">All Queues Clear</h3>
                    <p className="text-sm text-slate-500">No stations have orders waiting right now.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {queues.map(shopQueue => (
                    <div key={shopQueue.shop_id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 truncate">{shopQueue.shop_name}</h3>
                            <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">
                                {shopQueue.orders.length} Waiting
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 mb-4">
                            {shopQueue.orders.map(order => (
                                <div key={order.id} className="bg-slate-50/70 p-3 rounded-lg flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700">Order #{order.id}</span>
                                    <span className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                        <Clock size={12} />
                                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleFailAll(shopQueue.shop_id)}
                            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <AlertTriangle size={16} />
                            Fail All Queued Orders
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
