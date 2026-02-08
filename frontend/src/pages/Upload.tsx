import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import { useOrder } from "../context/OrderContext"; 
import { API_BASE_URL } from "../config";
import { 
  UploadCloud, FileText, X, Minus, Plus, Store, Palette, 
  ChevronDown, ChevronUp, Loader2, AlertCircle, RefreshCw, 
  Printer, LogOut, User as UserIcon, ChevronRight, History, Eye
} from "lucide-react";
import Footer from "../components/Footer";

interface Shop {
  id: number;
  name: string;
  queue: number;
  has_bw: boolean;
  has_color: boolean;
  has_bw_a3?: boolean;
  has_color_a3?: boolean;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  const { 
    files, setFiles, 
    selectedShopId, setSelectedShopId 
  } = useOrder();

  useEffect(() => {
    if (!isAuthLoading && !user) navigate("/");
  }, [user, isAuthLoading, navigate]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  
  // NEW: State for viewing files
  const [viewFile, setViewFile] = useState<File | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchShops = async (silent = false) => {
      if (!silent) setIsLoadingShops(true);
      try {
        const res = await fetch(`${API_BASE_URL}/shops`);
        if (res.ok) {
            const data: Shop[] = await res.json();
            if (isMounted) {
                setShops(data);
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

  const needsColor = files.some(f => f.color);
  const needsBW = files.some(f => !f.color);
  const needsA3Color = files.some(f => f.paper_size === "A3" && f.color);
  const needsA3BW = files.some(f => f.paper_size === "A3" && !f.color);
  const needsA4Color = files.some(f => f.paper_size !== "A3" && f.color);
  const needsA4BW = files.some(f => f.paper_size !== "A3" && !f.color);
   
  const availableShops = shops.filter(shop => {
    const supportsA4Color = !!shop.has_color;
    const supportsA4BW = !!shop.has_bw;
    const supportsA3Color = !!shop.has_color_a3;
    const supportsA3BW = !!shop.has_bw_a3;

    if (needsA4Color && !supportsA4Color) return false;
    if (needsA4BW && !supportsA4BW) return false;
    if (needsA3Color && !supportsA3Color) return false;
    if (needsA3BW && !supportsA3BW) return false;

    if (needsColor && !supportsA4Color && !supportsA3Color) return false;
    if (needsBW && !supportsA4BW && !supportsA3BW) return false;

    return true;
  });

  // Auto-deselect if the previously selected shop becomes unavailable
  useEffect(() => {
    if (selectedShopId) {
      const isStillAvailable = availableShops.some(s => s.id === selectedShopId);
      if (!isStillAvailable) {
        setSelectedShopId(null);
      }
    }
  }, [files, shops]); // Reruns when files or shops list change


  // --- File Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
  };

  const processFiles = (newFiles: File[]) => {
    const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60 MB Total Limit
    
    let currentTotalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    
    const validFiles: File[] = [];
    const skippedFiles: string[] = [];

    for (const file of newFiles) {
        if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
            skippedFiles.push(file.name);
        } else {
            validFiles.push(file);
            currentTotalSize += file.size;
        }
    }

    if (skippedFiles.length > 0) {
        alert(`Storage Limit Exceeded (60MB Total). The following files were skipped:\n\n- ${skippedFiles.join('\n- ')}`);
    }

    if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles.map(file => ({ file, color: false, copies: 1, paper_size: "A4" as const }))]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const setColor = (index: number, isColor: boolean) => {
    setFiles(prev => {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], color: isColor };
        return newArr;
    });
  };

  const setPaperSize = (index: number, paperSize: "A3" | "A4") => {
    setFiles(prev => {
        const newArr = [...prev];
        newArr[index] = { ...newArr[index], paper_size: paperSize };
        return newArr;
    });
  };

  const changeCopies = (index: number, delta: number) => {
    setFiles(prev => {
        const newArr = [...prev];
        const newCopies = newArr[index].copies + delta;
        if (newCopies >= 1) newArr[index] = { ...newArr[index], copies: newCopies };
        return newArr;
    });
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(Array.from(e.dataTransfer.files));
  };

  // --- Submit ---
  const handleProceedToPreview = async () => {
    if (files.length === 0 || !selectedShopId) return;
    setIsProcessing(true);

    try {
        const shop = shops.find(s => s.id === selectedShopId);
        
        navigate("/preview", { 
            state: { 
                files, 
                shop_id: selectedShopId, 
                shop_name: shop?.name,
                shop_has_bw: shop?.has_bw,
                shop_has_color: shop?.has_color,
                shop_has_bw_a3: shop?.has_bw_a3,
                shop_has_color_a3: shop?.has_color_a3
            } 
        });

    } catch (e) {
        console.error(e);
        alert("Error preparing files.");
    } finally {
        setIsProcessing(false);
    }
  };

  const getQueueStatus = (count: number) => {
    if (count < 5) return { label: "Fast", color: "bg-green-100 text-green-700 border-green-200" };
    if (count < 20) return { label: "Moderate", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: "Busy", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const selectedShop = shops.find(s => s.id === selectedShopId);

  if (isAuthLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">P</div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">PrintQ</h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden sm:block bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100">
               {files.length} Files Added
            </div>
            
            <button 
              onClick={() => navigate("/history")} 
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Order History"
            >
              <History size={18} />
              <span className="hidden sm:inline">Order History</span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm border border-gray-200">
                        {user?.name?.[0]?.toUpperCase() || <UserIcon size={16}/>}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-[100px]">{user?.name ? user.name.split(' ')[0] : "User"}</span>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" title="Sign Out">
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT: Upload */}
            <div className="lg:col-span-8 space-y-6">
                <section>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Upload Documents</h2>
                    <div onClick={() => fileInputRef.current?.click()} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`group relative flex flex-col items-center justify-center w-full h-52 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.01]" : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"}`}>
                        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <div className="flex flex-col items-center space-y-4 text-center z-10">
                            <div className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110 ${isDragging ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}><UploadCloud size={32} /></div>
                            <div><p className="text-lg text-gray-700 font-semibold"><span className="text-blue-600">Click to upload</span> or drag & drop</p><p className="text-sm text-gray-400 mt-1">PDF, PNG, JPG (Max 60MB Total)</p></div>
                        </div>
                    </div>
                </section>

                {/* Files List */}
                {files.length > 0 && (
                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end"><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configured Files</h2><button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline">Clear All</button></div>
                    <div className="grid gap-3">
                        {files.map((item, idx) => (
                            <div key={idx} className={`group relative bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 ${item.color ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                <button onClick={() => removeFile(idx)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={16} /></button>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${item.color ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{item.file.name.endsWith('pdf') ? <FileText size={24} /> : <Printer size={24} />}</div>
                                        <div className="min-w-0"><p className="font-medium text-gray-900 break-all text-sm sm:text-base">{item.file.name}</p><p className="text-xs text-gray-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 w-full sm:w-auto">
                                        {/* View File Button */}
                                        <button 
                                          onClick={() => setViewFile(item.file)} 
                                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                          title="View File"
                                        >
                                          <Eye size={18} />
                                        </button>

                                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                                            <button onClick={() => setColor(idx, false)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!item.color ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>B&W</button>
                                            <button onClick={() => setColor(idx, true)} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${item.color ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}`}>Color</button>
                                        </div>
                                            <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                                                <button onClick={() => setPaperSize(idx, "A4")} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${item.paper_size !== "A3" ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500'}`}>A4</button>
                                                <button onClick={() => setPaperSize(idx, "A3")} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${item.paper_size === "A3" ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500'}`}>A3</button>
                                            </div>
                                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5"><button onClick={() => changeCopies(idx, -1)} disabled={item.copies <= 1} className="p-1.5 hover:bg-white rounded-md text-gray-600 disabled:opacity-30 transition-all"><Minus size={14} /></button><span className="w-8 text-center text-sm font-bold text-gray-900">{item.copies}</span><button onClick={() => changeCopies(idx, 1)} className="p-1.5 hover:bg-white rounded-md text-gray-600 transition-all"><Plus size={14} /></button></div>
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Station</h2>
                    {!isLoadingShops && (
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-100 animate-pulse">
                            <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} /> LIVE
                        </div>
                    )}
                </div>
                
                {availableShops.length === 0 && !isLoadingShops && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-amber-900">
                        <AlertCircle className="mx-auto mb-2" />
                        <p className="font-bold text-sm">No Available Stations</p>
                        <p className="text-xs mt-1 opacity-80">
                            {needsA3Color || needsA3BW
                                ? "No shop supports the selected A3 print requirements." 
                                : needsColor && needsBW 
                                    ? "No shop supports BOTH B/W and Color printing." 
                                    : needsColor 
                                        ? "No shops support COLOR printing right now." 
                                        : "No shops support B/W printing right now."}
                        </p>
                    </div>
                )}

                {availableShops.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm transition-all hover:border-gray-300">
                        <div onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)} className="p-4 cursor-pointer flex justify-between items-center bg-white z-10 relative hover:bg-gray-50/50 transition-colors">
                             {selectedShop && availableShops.find(s => s.id === selectedShop.id) ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Store size={20} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{selectedShop.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getQueueStatus(selectedShop.queue).color} border-opacity-50`}>{getQueueStatus(selectedShop.queue).label} Queue</span>
                                            <div className="flex gap-1 opacity-75">
                                                 {selectedShop.has_color && <span title="A4 Color Supported" className="p-0.5 bg-purple-100 text-purple-600 rounded"><Palette size={10}/></span>}
                                                 {selectedShop.has_bw && <span title="A4 B&W Supported" className="p-0.5 bg-gray-200 text-gray-600 rounded"><Printer size={10}/></span>}
                                                {selectedShop.has_color_a3 && <span title="A3 Color Supported" className="px-1 text-[9px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-100">A3C</span>}
                                                {selectedShop.has_bw_a3 && <span title="A3 B&W Supported" className="px-1 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-100">A3B</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-lg flex items-center justify-center shrink-0"><Store size={20} /></div>
                                    <div>
                                        <p className="font-bold text-gray-500 text-sm">Choose a printing station</p>
                                        <p className="text-xs text-gray-400 mt-1">Click here to see options</p>
                                    </div>
                                </div>
                            )}
                            {isShopDropdownOpen ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
                        </div>
                        {isShopDropdownOpen && (
                            <div className="border-t border-gray-100 max-h-[300px] overflow-y-auto bg-gray-50/50 p-2 space-y-1">
                                {availableShops.map((shop) => (
                                    <button key={shop.id} onClick={() => { setSelectedShopId(shop.id); setIsShopDropdownOpen(false); }} className={`w-full flex justify-between items-center p-3 rounded-lg transition-all duration-200 group ${selectedShopId === shop.id ? "bg-white border border-blue-500 shadow-sm ring-1 ring-blue-100" : "hover:bg-white hover:border-gray-300 border border-transparent"}`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedShopId === shop.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 group-hover:bg-gray-300"}`}><Store size={16} /></div>
                                            <div className="text-left truncate">
                                                <p className={`font-bold text-sm truncate ${selectedShopId === shop.id ? "text-blue-900" : "text-gray-700"}`}>{shop.name}</p>
                                                <div className="flex gap-1 mt-0.5">
                                                    {shop.has_color && <span className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded font-medium">A4 Color</span>}
                                                    {shop.has_bw && <span className="text-[10px] text-gray-600 bg-gray-100 px-1 rounded font-medium">A4 B&W</span>}
                                                    {shop.has_color_a3 && <span className="text-[10px] text-purple-700 bg-purple-50 px-1 rounded font-medium border border-purple-100">A3 Color</span>}
                                                    {shop.has_bw_a3 && <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded font-medium border border-blue-100">A3 B&W</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 pl-2">
                                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded border ${getQueueStatus(shop.queue).color}`}>{getQueueStatus(shop.queue).label}</span>
                                            <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{shop.queue} in queue</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
      <Footer />
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block"><p className="text-sm font-bold text-gray-900">{files.length} documents ready</p><p className="text-xs text-gray-500">Proceed to calculate cost</p></div>
            <button onClick={handleProceedToPreview} disabled={files.length === 0 || !selectedShopId || isProcessing} className="w-full sm:w-auto bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                {isProcessing ? <Loader2 className="animate-spin" /> : <>Proceed to Preview <ChevronRight size={18} /></>}
            </button>
        </div>
      </div>

      {/* --- NEW: View File Modal --- */}
      {viewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewFile(null)}>
              <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b">
                      <h3 className="font-bold text-lg text-gray-800 truncate pr-4">{viewFile.name}</h3>
                      <button onClick={() => setViewFile(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
                  </div>
                  <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center overflow-auto">
                      {viewFile.type === 'application/pdf' ? (
                          <iframe 
                            src={URL.createObjectURL(viewFile)} 
                            className="w-full h-full rounded-lg border shadow-sm"
                            title="PDF Viewer"
                          />
                      ) : (
                          <img src={URL.createObjectURL(viewFile)} alt="Preview" className="max-h-full max-w-full rounded-lg shadow-md object-contain" />
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
