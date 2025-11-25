import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrder } from "../context/OrderContext";
import { 
  ArrowLeft, Store, FileText, Receipt, CheckCircle2, Printer, 
  Palette, Loader2, Info, User as UserIcon, LogOut
} from "lucide-react";

// ✅ FIX: Added shop_id and shop_name to the interface
interface PreviewData {
  files: {
    original_name: string;
    file_type: string;
    detected_pages: number;
    calculated_pages: number;
    cost: number;
    color: boolean;
    file_url: string;
  }[];
  summary: {
    total_bw_pages: number;
    total_color_pages: number;
    bw_cost: number;
    color_cost: number;
    total_amount: number;
  };
  shop_id: number;   // Added
  shop_name: string; // Added
}

export default function PreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { resetOrder } = useOrder();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get data passed via Router State
  const previewData = location.state as PreviewData;

  useEffect(() => {
    if (!previewData) navigate("/upload");
  }, [previewData, navigate]);

  if (!previewData) return null;

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user?.id,
        shop_id: previewData.shop_id,
        total_amount: previewData.summary.total_amount,
        files: previewData.files 
      };

      const res = await fetch("http://localhost:3000/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Order Placed Successfully! Order ID: ${data.order_id}`);
        resetOrder(); 
        navigate("/upload");
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/upload")} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Order Summary</h1>
            <p className="text-xs text-gray-500 font-medium">Review & Payment</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200">
                    {user?.name?.[0].toUpperCase() || <UserIcon size={16}/>}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-[100px]">{user?.name.split(' ')[0]}</span>
            </div>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Sign Out">
                <LogOut size={18} />
            </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Order Details */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Store size={24} /></div>
                    <div><p className="text-xs text-blue-600 uppercase font-bold tracking-wide">Printing At</p><h3 className="font-bold text-gray-900 text-lg">{previewData.shop_name}</h3></div>
                </div>
                <div className="text-right"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold"><Info size={12} /> Pay at Shop</span></div>
            </div>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700">Document Breakdown</h3><span className="text-xs font-medium text-gray-500">{previewData.files.length} Items</span></div>
                <div className="divide-y divide-gray-100">
                    {previewData.files.map((file, idx) => (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${file.color ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{file.file_type.includes('pdf') ? <FileText size={24} /> : <Printer size={24} />}</div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1" title={file.original_name}>{file.original_name}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${file.color ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{file.color ? <Palette size={10} /> : <Printer size={10} />}{file.color ? "Color" : "B&W"}</span>
                                        <span className="text-xs text-gray-500 font-medium px-1 py-0.5">{file.detected_pages} pgs × {file.calculated_pages / file.detected_pages} copies</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right min-w-[80px]"><p className="font-bold text-gray-900 text-lg">₹{file.cost}</p><p className="text-[10px] text-gray-400 font-medium">{file.calculated_pages} pages @ ₹{file.color ? 15 : 3}/pg</p></div>
                        </div>
                    ))}
                </div>
            </section>
        </div>

        {/* Bill Summary */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Current Rates</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600 flex items-center gap-2"><Printer size={14}/> B&W Print</span><span className="font-bold text-gray-900">₹3.00 <span className="text-gray-400 font-normal">/ pg</span></span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 flex items-center gap-2"><Palette size={14}/> Color Print</span><span className="font-bold text-gray-900">₹15.00 <span className="text-gray-400 font-normal">/ pg</span></span></div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl ring-4 ring-gray-100">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4"><Receipt className="text-blue-400" /><h3 className="font-bold text-lg">Payment Summary</h3></div>
                <div className="space-y-4 text-sm text-gray-300">
                    <div className="flex justify-between items-center"><span>Total B&W Pages</span><span className="font-medium text-white">{previewData.summary.total_bw_pages}</span></div>
                    <div className="flex justify-between items-center"><span>Total Color Pages</span><span className="font-medium text-white">{previewData.summary.total_color_pages}</span></div>
                    <div className="h-px bg-gray-700 my-2"></div>
                    <div className="flex justify-between items-center text-xs text-gray-500"><span>Processing Fee</span><span>₹0.00</span></div>
                </div>
                <div className="mt-8 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-end mb-6"><p className="text-xs text-gray-400 font-medium">Total Amount Payable</p><p className="text-3xl font-bold text-white tracking-tight">₹{previewData.summary.total_amount}</p></div>
                    <button onClick={handleConfirmOrder} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-blue-400 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <>Confirm & Pay <CheckCircle2 size={20} /></>}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}