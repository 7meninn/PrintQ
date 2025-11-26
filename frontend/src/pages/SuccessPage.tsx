import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  Printer, 
  Home,
  Store, 
  Receipt 
} from "lucide-react";

interface SuccessState {
  order_id: number;
  total_amount: number;
  shop_name: string;
  file_count: number;
}

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as SuccessState;

  // Protect Route: If accessed directly without data, go home
  useEffect(() => {
    if (!state) {
      navigate("/upload");
    }
  }, [state, navigate]);

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Success Header */}
        <div className="bg-green-600 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle2 className="text-green-600" size={32} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
          <p className="text-green-100 text-sm mt-1">Your order has been placed securely.</p>
        </div>

        {/* Order Details */}
        <div className="p-6 space-y-6">
          
          <div className="text-center">
            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Order ID</p>
            <p className="text-3xl font-mono font-bold text-gray-900 tracking-widest mt-1">#{state.order_id}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Store size={18} />
                <span className="text-sm font-medium">Station</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{state.shop_name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Printer size={18} />
                <span className="text-sm font-medium">Documents</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{state.file_count} Files</span>
            </div>

            <div className="h-px bg-gray-200 my-2"></div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-gray-600">
                <Receipt size={18} />
                <span className="text-sm font-medium">Amount Paid</span>
              </div>
              <span className="text-lg font-bold text-green-600">₹{state.total_amount}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => navigate("/upload")}
              className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Printer size={18} /> Print More Files
            </button>
            <button 
              onClick={() => navigate("/")} // Redirects to home/dashboard
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Home size={18} /> Back to Home
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}