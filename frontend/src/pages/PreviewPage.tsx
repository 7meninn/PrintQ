import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrder, LocalFileItem } from "../context/OrderContext";
import { PDFDocument } from "pdf-lib";
import { 
  ArrowLeft, Store, FileText, Receipt, CheckCircle2, Printer, 
  Palette, Loader2, Info, User as UserIcon, LogOut, Eye, X
} from "lucide-react";

interface PreviewData {
    files: LocalFileItem[];
    shop_id: number;
    shop_name: string;
}

interface ProcessedFile {
  file: File;
  original_name: string;
  file_type: string;
  detected_pages: number;
  calculated_pages: number;
  cost: number;
  color: boolean;
  copies: number;
}

export default function PreviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { resetOrder } = useOrder();
  
  const [isCalculating, setIsCalculating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  
  const [summary, setSummary] = useState({
    total_bw_pages: 0,
    total_color_pages: 0,
    bw_cost: 0,
    color_cost: 0,
    print_cost: 0,
    service_charge: 0,
    separator_cost: 0,
    total_amount: 0
  });

  const [viewFile, setViewFile] = useState<File | null>(null);

  const state = location.state as PreviewData;

  useEffect(() => {
    if (!state || !state.files) {
      navigate("/upload");
      return;
    }

    const calculateOrder = async () => {
      try {
        const BW_PRICE = 2;
        const COLOR_PRICE = 15;
        const SEPARATOR_COST = 2;
        const SERVICE_CHARGE_PERCENTAGE = 0.25;
        const MAX_SERVICE_CHARGE = 30; // 🔹 Cap limit

        const results: ProcessedFile[] = [];
        let bwPages = 0;
        let colorPages = 0;
        let bwCostAccumulator = 0;
        let colorCostAccumulator = 0;
        let separatorCostAccumulator = 0;

        for (const item of state.files) {
            let pageCount = 1;

            if (item.file.type === 'application/pdf') {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                pageCount = pdf.getPageCount();
            }

            const totalPages = pageCount * item.copies;
            const isSeparator = item.file.name === "000_Separator.pdf";
            
            let fileCost = 0;

            if (isSeparator) {
                fileCost = SEPARATOR_COST;
                separatorCostAccumulator += fileCost;
            } else {
                const price = item.color ? COLOR_PRICE : BW_PRICE;
                fileCost = totalPages * price;

                if (item.color) {
                    colorPages += totalPages;
                    colorCostAccumulator += fileCost;
                } else {
                    bwPages += totalPages;
                    bwCostAccumulator += fileCost;
                }
            }

            results.push({
                file: item.file,
                original_name: item.file.name,
                file_type: item.file.name.split('.').pop() || 'file',
                detected_pages: pageCount,
                calculated_pages: totalPages,
                cost: fileCost,
                color: item.color,
                copies: item.copies
            });
        }

        const printCost = bwCostAccumulator + colorCostAccumulator;
        
        // 🔹 Updated Logic: Service Charge = min(25% of printCost, 30)
        const rawServiceCharge = printCost * SERVICE_CHARGE_PERCENTAGE;
        const serviceCharge = Math.ceil(Math.min(rawServiceCharge, MAX_SERVICE_CHARGE));

        const grandTotal = printCost + serviceCharge + separatorCostAccumulator;

        setProcessedFiles(results);
        
        setSummary({
            total_bw_pages: bwPages,
            total_color_pages: colorPages,
            bw_cost: bwCostAccumulator,
            color_cost: colorCostAccumulator,
            print_cost: printCost,
            service_charge: serviceCharge,
            separator_cost: separatorCostAccumulator,
            total_amount: grandTotal
        });
        
        setIsCalculating(false);
      } catch (e) {
        console.error("Calculation Error", e);
        alert("Failed to calculate order details.");
        navigate("/upload");
      }
    };

    calculateOrder();
  }, [state, navigate]);

  const handlePay = async () => {
    setIsSubmitting(true);
    setStatusMessage("Uploading documents...");

    try {
      const formData = new FormData();
      
      processedFiles.forEach((item) => {
         formData.append('files', item.file);
      });

      const configArray = processedFiles.map(f => ({ 
          color: f.color, 
          copies: f.copies 
      }));
      
      formData.append('config', JSON.stringify(configArray));
      formData.append('shop_id', String(state.shop_id));
      if(user?.id) formData.append('user_id', String(user.id));

      const initRes = await fetch("http://localhost:3000/orders/preview", {
        method: "POST",
        body: formData
      });

      if (!initRes.ok) {
          const err = await initRes.json();
          throw new Error(err.error || "Upload failed");
      }

      const orderDraft = await initRes.json();
      
      const backendTotal = Number(orderDraft.summary.total_amount);
      const frontendTotal = summary.total_amount;
      
      // Allow a small margin of error for floating point diffs, but strict on logic
      if (Math.abs(backendTotal - frontendTotal) > 2) { 
          if(!confirm(`Total adjusted by server to ₹${backendTotal} (was ₹${frontendTotal}). Proceed?`)) {
              throw new Error("Cancelled by user");
          }
      }

      setStatusMessage("Opening Payment Gateway...");
      const paymentRes = await fetch("http://localhost:3000/orders/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderDraft.order_id })
      });
      const paymentData = await paymentRes.json();

      const options = {
        key: paymentData.key_id,
        amount: paymentData.amount,
        currency: "INR",
        name: "PrintQ",
        description: `Order #${orderDraft.order_id}`,
        order_id: paymentData.razorpay_order_id,
        handler: async function (response: any) {
           setStatusMessage("Confirming Order...");
           await finalizeOrder(orderDraft.order_id, response);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#2563eb" },
        modal: { 
            ondismiss: function() {
                setIsSubmitting(false);
                setStatusMessage("");
            }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  const finalizeOrder = async (orderId: number, paymentData: any) => {
      try {
        const payload = {
            order_id: orderId,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature
        };

        const res = await fetch("http://localhost:3000/orders/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            resetOrder(); 
            navigate("/success", { 
                state: { 
                    order_id: orderId, 
                    total_amount: summary.total_amount, 
                    shop_name: state.shop_name, 
                    file_count: processedFiles.length
                } 
            });
        } else {
            throw new Error("Verification Failed");
        }
      } catch (e) {
          alert("Payment verified but order update failed. Contact support.");
          navigate("/upload");
      }
  };

  if (!state) return null;

  if (isCalculating) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
            <p className="text-gray-600 font-medium">Calculating Order Details...</p>
        </div>
      );
  }

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
        
        {/* Profile */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200">
                    {user?.name?.[0]?.toUpperCase() || <UserIcon size={16}/>}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-[100px]">{user?.name?.split(' ')[0]}</span>
            </div>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Sign Out">
                <LogOut size={18} />
            </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: File List */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Store size={24} /></div>
                    <div><p className="text-xs text-blue-600 uppercase font-bold tracking-wide">Printing At</p><h3 className="font-bold text-gray-900 text-lg">{state.shop_name}</h3></div>
                </div>
                <div className="text-right"><span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold"><Info size={12} /> Pay Online</span></div>
            </div>

            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700">Document Breakdown</h3><span className="text-xs font-medium text-gray-500">{processedFiles.length} Items</span></div>
                <div className="divide-y divide-gray-100">
                    {processedFiles.map((file, idx) => (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors group">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-xl shrink-0 ${file.color ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {file.file.name.endsWith('.pdf') ? <FileText size={24} /> : <Printer size={24} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1" title={file.original_name}>
                                        {file.original_name}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${file.color ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{file.color ? <Palette size={10} /> : <Printer size={10} />}{file.color ? "Color" : "B&W"}</span>
                                        <span className="text-xs text-gray-500 font-medium px-1 py-0.5">{file.detected_pages} pgs × {file.copies} copies</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setViewFile(file.file)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View File"
                                >
                                    <Eye size={18} />
                                </button>
                                <div className="text-right min-w-[80px]">
                                    <p className="font-bold text-gray-900 text-lg">₹{file.cost}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>

        {/* Right Column: Bill Summary */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Current Rates</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600 flex items-center gap-2"><Printer size={14}/> B&W Print</span><span className="font-bold text-gray-900">₹{2}.00 <span className="text-gray-400 font-normal">/ pg</span></span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 flex items-center gap-2"><Palette size={14}/> Color Print</span><span className="font-bold text-gray-900">₹15.00 <span className="text-gray-400 font-normal">/ pg</span></span></div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl ring-4 ring-gray-100">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4"><Receipt className="text-blue-400" /><h3 className="font-bold text-lg">Payment Summary</h3></div>
                
                <div className="space-y-4 text-sm text-gray-300">
                    <div className="flex justify-between items-center">
                        <span>B/W Pages ({summary.total_bw_pages})</span>
                        <span className="font-medium text-white">₹{summary.bw_cost}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Color Pages ({summary.total_color_pages})</span>
                        <span className="font-medium text-white">₹{summary.color_cost}</span>
                    </div>
                    
                    <div className="h-px bg-gray-700 my-2"></div>
                    
                    <div className="flex justify-between items-center text-xs text-yellow-400">
                        <span>Service Charge (Max ₹30)</span>
                        <span>₹{summary.service_charge}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-blue-400">
                        <span>Separator Page</span>
                        <span>₹{summary.separator_cost}</span>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-end mb-6"><p className="text-xs text-gray-400 font-medium">Total Amount Payable</p><p className="text-3xl font-bold text-white tracking-tight">₹{summary.total_amount}</p></div>
                    <button onClick={handlePay} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <>Pay with Razorpay <CheckCircle2 size={20} /></>}
                    </button>
                    {statusMessage && <p className="text-xs text-center text-blue-300 mt-3 animate-pulse">{statusMessage}</p>}
                </div>
            </div>
        </div>

      </div>

      {/* File Viewer Modal */}
      {viewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setViewFile(null)}>
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-bold text-lg text-gray-800">{viewFile.name}</h3>
                      <button onClick={() => setViewFile(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="flex-1 bg-gray-100 p-4">
                      {viewFile.type === 'application/pdf' ? (
                          <iframe 
                            src={URL.createObjectURL(viewFile)} 
                            className="w-full h-full rounded-lg border shadow-sm"
                            title="PDF Viewer"
                          />
                      ) : (
                          <div className="flex items-center justify-center h-full">
                              <img src={URL.createObjectURL(viewFile)} alt="Preview" className="max-h-full max-w-full rounded-lg shadow-md object-contain" />
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}