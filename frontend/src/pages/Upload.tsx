import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  UploadCloud, 
  FileText, 
  X, 
  Minus, 
  Plus, 
  Store, 
  ChevronRight,
  Palette,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Receipt,
  CheckCircle2,
  Printer
} from "lucide-react";

// --- Types ---
interface FileItem {
  file: File;
  color: boolean;
  copies: number;
}

interface Shop {
  id: number;
  name: string;
  queue: number;
  has_bw: boolean;
  has_color: boolean;
}

interface PreviewResponse {
  files: any[];
  summary: any;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !user) navigate("/");
  }, [user, isAuthLoading, navigate]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- State ---
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);

  // 🔹 1. Fetch Shops
  useEffect(() => {
    let isMounted = true;
    const fetchShops = async (silent = false) => {
      if (!silent) setIsLoadingShops(true);
      try {
        const res = await fetch("http://localhost:3000/shops");
        if (res.ok) {
            const data: Shop[] = await res.json();
            if (isMounted) {
                setShops(data);
                // Smart Selection Logic is now handled in derived state below
            }
        }
      } catch (e) {
        if (isMounted) setShops([]);
      } finally {
        if (isMounted && !silent) setIsLoadingShops(false);
      }
    };

    fetchShops();
    const intervalId = setInterval(() => fetchShops(true), 10000);
    return () => clearInterval(intervalId);
  }, []);

  // 🔹 2. Filter Shops based on File Requirements
  const doesOrderNeedColor = files.some(f => f.color);
  
  const availableShops = shops.filter(shop => {
    // If order needs color, exclude shops without color
    if (doesOrderNeedColor && !shop.has_color) return false;
    // If order is all B/W, ensure shop has B/W (usually all do, but safe to check)
    if (!doesOrderNeedColor && !shop.has_bw) return false;
    return true;
  });

  // Auto-deselect if current shop becomes invalid due to color change
  useEffect(() => {
    if (selectedShopId) {
      const shop = shops.find(s => s.id === selectedShopId);
      if (shop) {
        if (doesOrderNeedColor && !shop.has_color) {
          setSelectedShopId(null); // Reset because shop doesn't support color
        }
      }
    }
  }, [doesOrderNeedColor, shops]);


  // --- File Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
  };

  const processFiles = (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles.map(file => ({ file, color: false, copies: 1 }))]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleColor = (index: number) => {
    const updated = [...files];
    updated[index].color = !updated[index].color;
    setFiles(updated);
  };

  const changeCopies = (index: number, delta: number) => {
    const updated = [...files];
    const newCopies = updated[index].copies + delta;
    if (newCopies >= 1) {
      updated[index].copies = newCopies;
      setFiles(updated);
    }
  };

  // --- Submit ---
  const handleProceedToPreview = async () => {
    if (files.length === 0 || !selectedShopId) return;
    setIsPreviewLoading(true);

    // Construct FormData for backend
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file));
    const configArray = files.map(f => ({ color: f.color, copies: f.copies }));
    formData.append('config', JSON.stringify(configArray));

    try {
        const res = await fetch("http://localhost:3000/orders/preview", {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) throw new Error("Preview failed");
        
        const data = await res.json();
        setPreviewData(data);
        setStep("preview");
    } catch (e) {
        console.error(e);
        alert("Failed to generate preview. Please try again.");
    } finally {
        setIsPreviewLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!previewData || !selectedShopId || !user) return;
    
    // Final Order Creation
    const payload = {
        user_id: user.id,
        shop_id: selectedShopId,
        total_amount: previewData.summary.total_amount,
        files: previewData.files
    };

    try {
        const res = await fetch("http://localhost:3000/orders/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const data = await res.json();
            alert(`Order Created! ID: ${data.order_id}`);
            // Navigate to success page or dashboard
        }
    } catch (e) {
        alert("Failed to create order");
    }
  };

  const getQueueStatus = (count: number) => {
    if (count < 5) return { label: "Fast", color: "bg-green-100 text-green-700" };
    if (count < 20) return { label: "Moderate", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Busy", color: "bg-red-100 text-red-700" };
  };

  const selectedShop = shops.find(s => s.id === selectedShopId);

  if (isAuthLoading) return <div className="min-h-screen bg-gray-50" />;

  // --- PREVIEW RENDER ---
  if (step === "preview" && previewData) {
    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <div className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex items-center gap-4 shadow-sm">
                <button onClick={() => setStep("upload")} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20} /></button>
                <div><h1 className="text-xl font-bold text-gray-900">Order Summary</h1></div>
            </div>
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Store size={24} /></div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Printing At</p>
                            <h3 className="font-bold text-gray-900 text-lg">{selectedShop?.name}</h3>
                        </div>
                    </div>
                </div>
                
                {/* Bill */}
                <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
                        <Receipt className="text-blue-400" />
                        <h3 className="font-bold text-lg">Bill Receipt</h3>
                    </div>
                    <div className="space-y-3 text-sm text-gray-300">
                        <div className="flex justify-between"><span>B&W Pages ({previewData.summary.total_bw_pages})</span><span>₹{previewData.summary.bw_cost}</span></div>
                        <div className="flex justify-between"><span>Color Pages ({previewData.summary.total_color_pages})</span><span>₹{previewData.summary.color_cost}</span></div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-end">
                        <div><p className="text-xs text-gray-400">Total Payable</p><p className="text-3xl font-bold text-white mt-1">₹{previewData.summary.total_amount}</p></div>
                        <button onClick={handleProceedToPayment} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2">Pay Now <ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // --- UPLOAD RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">PrintQ</h1>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">{files.length} Files</div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: Upload */}
            <div className="lg:col-span-8 space-y-6">
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upload Documents</h2>
                    <div onClick={() => fileInputRef.current?.click()} className="group relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer">
                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <div className="flex flex-col items-center space-y-3 text-center z-10">
                            <div className="p-4 bg-gray-100 text-gray-500 rounded-full group-hover:scale-110 transition-transform"><UploadCloud size={28} /></div>
                            <p className="text-base text-gray-700 font-semibold"><span className="text-blue-600">Click to upload</span></p>
                        </div>
                    </div>
                </section>

                {/* Files List */}
                {files.length > 0 && (
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Configured Files</h2>
                    <div className="grid gap-3">
                        {files.map((item, idx) => (
                            <div key={idx} className={`group relative bg-white border rounded-xl p-4 shadow-sm transition-all ${item.color ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                <button onClick={() => removeFile(idx)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 rounded-full"><X size={16} /></button>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-6">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.color ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}><FileText size={20} /></div>
                                        <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{item.file.name}</p></div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                                        <button onClick={() => toggleColor(idx)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${item.color ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}><Palette size={14} />{item.color ? "Color" : "B&W"}</button>
                                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                                            <button onClick={() => changeCopies(idx, -1)} disabled={item.copies <= 1} className="p-1.5 hover:bg-white rounded-l-lg text-gray-600 disabled:opacity-30"><Minus size={14} /></button>
                                            <span className="w-8 text-center text-sm font-semibold text-gray-900">{item.copies}</span>
                                            <button onClick={() => changeCopies(idx, 1)} className="p-1.5 hover:bg-white rounded-r-lg text-gray-600"><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                )}
            </div>

            {/* RIGHT: Shop Selection */}
            <div className="lg:col-span-4 sticky top-24">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Select Station</h2>
                
                {availableShops.length === 0 && !isLoadingShops && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-900">
                        <AlertCircle className="mx-auto mb-2" />
                        <p className="font-bold">No Available Stations</p>
                        <p className="text-xs mt-1">{doesOrderNeedColor ? "No shops support COLOR printing." : "No active shops found."}</p>
                    </div>
                )}

                {availableShops.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                        <div onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="p-4 cursor-pointer flex justify-between items-center bg-white z-10 relative">
                             {selectedShop && availableShops.find(s => s.id === selectedShop.id) ? (
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Store size={20} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedShop.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getQueueStatus(selectedShop.queue).color}`}>{getQueueStatus(selectedShop.queue).label}</span>
                                            {/* Show Capabilities */}
                                            <div className="flex gap-1">
                                                {selectedShop.has_color && <span title="Color" className="p-0.5 bg-purple-100 text-purple-600 rounded"><Palette size={10}/></span>}
                                                {selectedShop.has_bw && <span title="B&W" className="p-0.5 bg-gray-100 text-gray-600 rounded"><Printer size={10}/></span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : <span className="text-gray-500 font-medium">Choose a shop...</span>}
                            {isShopDropdownOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                        </div>
                        {isShopDropdownOpen && (
                            <div className="border-t border-gray-100 max-h-80 overflow-y-auto bg-gray-50/50 p-2 space-y-1">
                                {availableShops.map((shop) => (
                                    <button key={shop.id} onClick={() => { setSelectedShopId(shop.id); setIsShopDropdownOpen(false); }} className={`w-full flex justify-between p-3 rounded-lg transition-colors ${selectedShopId === shop.id ? "bg-white border border-blue-200 shadow-sm" : "hover:bg-white hover:border-gray-200 border-transparent border"}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedShopId === shop.id ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"}`}><Store size={14} /></div>
                                            <div className="text-left">
                                                <p className={`font-semibold text-sm ${selectedShopId === shop.id ? "text-blue-900" : "text-gray-700"}`}>{shop.name}</p>
                                                <div className="flex gap-1 mt-1">
                                                    {shop.has_color && <span className="text-[10px] bg-purple-50 text-purple-700 px-1 rounded border border-purple-100">Color</span>}
                                                    {shop.has_bw && <span className="text-[10px] bg-gray-50 text-gray-700 px-1 rounded border border-gray-200">B&W</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right"><span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${getQueueStatus(shop.queue).color}`}>{getQueueStatus(shop.queue).label}</span><p className="text-[10px] text-gray-400 mt-0.5">Q: {shop.queue}</p></div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block"><p className="text-sm font-medium text-gray-900">{files.length} documents selected</p></div>
            <button
                onClick={handleProceedToPreview}
                disabled={files.length === 0 || !selectedShopId || isPreviewLoading}
                className="w-full sm:w-auto bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                {isPreviewLoading ? <Loader2 className="animate-spin" /> : <>Proceed to Preview <ChevronRight size={18} /></>}
            </button>
        </div>
      </div>
    </div>
  );
}