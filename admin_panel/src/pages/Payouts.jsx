import React, { useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { API_BASE_URL } from "../config";
import { Loader2, DollarSign, BookCheck, Info, X, Search } from "lucide-react";

// Modal Component remains the same...
const LogPaymentModal = ({ payout, onClose, onConfirm }) => {
    const [transactionRef, setTransactionRef] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!transactionRef.trim()) {
            alert("Please enter a transaction reference.");
            return;
        }
        setIsSubmitting(true);
        await onConfirm(transactionRef);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Log a Payment</h2>
                <p className="text-sm text-slate-500 mb-4">
                    You are logging a payment for <span className="font-bold">{payout.shop_name}</span>.
                </p>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="text-xs text-slate-500 font-bold uppercase">Amount Paid</label>
                        <p className="text-2xl font-bold text-slate-900">₹{payout.amount_owed}</p>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="transactionRef" className="text-sm font-bold text-slate-800 mb-1 block">
                            Transaction Reference ID
                        </label>
                        <input
                            id="transactionRef"
                            type="text"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            placeholder="e.g., UPI Transaction ID"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div className="flex gap-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="w-full bg-slate-100 text-slate-800 font-bold py-3 rounded-lg hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-all disabled:bg-slate-400 flex items-center justify-center"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm & Log'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function Payouts() {
    const { adminToken } = useAdminAuth();
    const [view, setView] = useState('pending');
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchPending = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/admin/payouts/pending`, { headers: { "x-admin-secret": adminToken } })
            .then(res => res.json()).then(data => { setPending(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const fetchHistory = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/admin/payouts`, { headers: { "x-admin-secret": adminToken } })
            .then(res => res.json()).then(data => { setHistory(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        if (view === 'pending') fetchPending();
        else fetchHistory();
    }, [view]);

    const handleLogPaymentConfirm = async (transaction_ref) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/payouts/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminToken },
                body: JSON.stringify({
                    shop_id: selectedPayout.shop_id,
                    amount: selectedPayout.amount_owed,
                    bw_pages_total: selectedPayout.bw_pages_total,
                    color_pages_total: selectedPayout.color_pages_total,
                    transaction_ref
                })
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to log payment.");
            setSelectedPayout(null);
            fetchPending();
        } catch (e) {
            console.error(e);
            alert(e.message);
        }
    };
    
    // Filtering Logic
    const lowercasedQuery = searchQuery.toLowerCase();
    const filteredPending = pending.filter(p => p.shop_name.toLowerCase().includes(lowercasedQuery));
    const filteredHistory = history.filter(p => p.shop_name?.toLowerCase().includes(lowercasedQuery));

    const PayoutCard = ({ payout }) => (
        <div className={`bg-white p-5 rounded-3xl border shadow-sm flex flex-col ${payout.shop_status === 'INACTIVE' ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start gap-2">
                <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">{payout.shop_name}</h3>
                    <p className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 w-fit select-all">
                        {payout.upi_id || 'No UPI ID'}
                    </p>
                </div>
                {payout.shop_status === 'INACTIVE' && (
                    <span className="text-xs font-bold bg-amber-500 text-white px-2 py-1 rounded-full flex-shrink-0">Inactive</span>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Last Paid: {payout.last_paid_on ? new Date(payout.last_paid_on).toLocaleDateString() : 'Never'}</p>
            <div className="my-auto pt-4">
                <p className="text-4xl font-bold text-slate-900">₹{payout.amount_owed}</p>
                <p className="text-xs text-slate-500 mt-1">From {payout.bw_pages_total} B&W pages and {payout.color_pages_total} Color pages.</p>
            </div>
            <button onClick={() => setSelectedPayout(payout)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-black transition-all mt-4">
                Log a Payment
            </button>
        </div>
    );

    const HistoryTable = () => (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100"><th className="text-left p-3">Shop</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Pages (B&W/Color)</th><th className="text-left p-3">Date</th><th className="text-left p-3">Transaction ID</th></tr>
                </thead>
                <tbody>
                    {filteredHistory.map(p => (
                        <tr key={p.id} className="border-b border-slate-100 last:border-0">
                            <td className="p-3 font-medium text-slate-800">{p.shop_name || 'N/A'}</td>
                            <td className="p-3 font-bold text-slate-900">₹{p.amount}</td>
                            <td className="p-3">{p.bw_count} / {p.color_count}</td>
                            <td className="p-3">{new Date(p.created_at).toLocaleString()}</td>
                            <td className="p-3 font-mono text-xs bg-slate-50 rounded">{p.transaction_ref}</td>
                        </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-12 text-slate-400">No records found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24">
            <div className="md:flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Finance & Payouts</h1>
                    <p className="text-sm text-slate-500 mt-1">Track and manage station owner payouts.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder="Search by shop name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 w-full sm:w-64" />
                     </div>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                        <button onClick={() => { setView('pending'); setSearchQuery(''); }} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'pending' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Pending</button>
                        <button onClick={() => { setView('history'); setSearchQuery(''); }} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'history' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>History</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500"/></div>
            ) : (
                view === 'pending' ? (
                    filteredPending.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPending.map(p => <PayoutCard key={p.shop_id} payout={p} />)}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                            <DollarSign size={48} className="mx-auto text-green-500" />
                            <h3 className="mt-4 text-lg font-bold text-slate-800">{searchQuery ? 'No Matches' : 'All Clear!'}</h3>
                            <p className="text-sm text-slate-500">{searchQuery ? `No pending payouts found for "${searchQuery}".` : 'There are no pending payouts right now.'}</p>
                        </div>
                    )
                ) : (
                     <HistoryTable />
                )
            )}

            {selectedPayout && (
                <LogPaymentModal payout={selectedPayout} onClose={() => setSelectedPayout(null)} onConfirm={handleLogPaymentConfirm} />
            )}
        </div>
    );
}
