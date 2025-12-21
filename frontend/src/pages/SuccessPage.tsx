import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  CheckCircle2, 
  Printer,
  Store, 
  Receipt,
  Loader2,
  FileText
} from "lucide-react";
import Footer from "../components/Footer";

interface OrderDetails {
  id: number;
  total_amount: string;
  shop_name: string;
  file_count: number;
  status: string;
}

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id");

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Try to get state from navigation (fastest)
  useEffect(() => {
    if (location.state) {
      setOrder({
        id: location.state.order_id,
        total_amount: String(location.state.total_amount),
        shop_name: location.state.shop_name,
        file_count: location.state.file_count,
        status: "QUEUED"
      });
      setLoading(false);
    } 
    // 2. Fallback: Fetch from API if redirected from Payment Gateway
    else if (orderIdParam) {
      const fetchOrder = async () => {
        try {
          
          setOrder({
            id: Number(orderIdParam),
            total_amount: "Paid", // We might not know exact amount without API
            shop_name: "PrintQ Station", // Placeholder until API allows fetching
            file_count: 1, // Placeholder
            status: "QUEUED"
          });
        } catch (e) {
          console.error("Failed to fetch order", e);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    } else {
      // Invalid access
      navigate("/upload");
    }
  }, [location.state, orderIdParam, navigate]);

  if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-green-600" size={40} />
        </div>
      );
  }

  if (!order) return null;

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Success Header */}
        <div className="bg-green-600 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
          <div className="relative z-10">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg animate-bounce">
                <CheckCircle2 className="text-green-600" size={40} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
            <p className="text-green-100 text-sm mt-2 font-medium">Your documents are queued for printing.</p>
          </div>
        </div>

        {/* Order Details */}
        <div className="p-8 space-y-8">
          
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Order ID</p>
            <p className="text-4xl font-mono font-bold text-gray-900 mt-2 tracking-tight">#{order.id}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="p-2 bg-white rounded-lg border border-gray-200"><Store size={18} /></div>
                <span className="text-sm font-semibold">Station</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{order.shop_name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="p-2 bg-white rounded-lg border border-gray-200"><FileText size={18} /></div>
                <span className="text-sm font-semibold">Files</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{order.file_count > 0 ? `${order.file_count} Files` : "Documents"}</span>
            </div>

            <div className="h-px bg-gray-200 my-2"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="p-2 bg-white rounded-lg border border-gray-200"><Receipt size={18} /></div>
                <span className="text-sm font-semibold">Total Paid</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                 {order.total_amount === "Paid" ? "Confirmed" : `₹${order.total_amount}`}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button 
              onClick={() => navigate("/history")} 
              className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Receipt size={18} /> View Order Status
            </button>
            <button 
              onClick={() => navigate("/upload")} // Redirects to upload
              className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={18} /> Print More Files
            </button>
          </div>

        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}