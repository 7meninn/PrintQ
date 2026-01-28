import React, { useState, useEffect } from "react";
import { 
  FileText, Printer, CheckCircle2, AlertOctagon, 
  RefreshCw, Lock, Palette, Loader2, Play
} from "lucide-react";

export default function ActiveJob({ order, config, onComplete, onFail }) {
  const [copiesPrinted, setCopiesPrinted] = useState({});
  const [printingFile, setPrintingFile] = useState(null); 
  
  useEffect(() => { 
    setCopiesPrinted({}); 
    setPrintingFile(null);
  }, [order.order_id]);

  const handlePrint = async (file) => {
    if (printingFile) return;
    setPrintingFile(file.filename);

    const printerName = file.color 
      ? config.color 
      : (config.bw !== 'Not Available' ? config.bw : config.color);

    if (printerName === 'Not Available') {
      alert("Error: No suitable printer configured for this job type.");
      setPrintingFile(null);
      return;
    }

    try {
      await window.electronAPI.printJob({ 
        printerName, 
        filePath: file.url,
        copies: 1
      });
      setCopiesPrinted(prev => ({ 
        ...prev, 
        [file.filename]: (prev[file.filename] || 0) + 1 
      }));
    } catch (e) {
      alert(`Print Error: ${e.message}`);
    } finally {
      setPrintingFile(null);
    }
  };

  const allFilesCompleted = order.files.every(f => (copiesPrinted[f.filename] || 0) >= f.copies);
  const isAnyFilePrinting = printingFile !== null;

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white mb-6">
         <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shadow-blue-100">
               <Printer size={32} />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Order #{order.order_id}</h2>
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wide border border-blue-200">
                     Processing
                  </span>
               </div>
               <p className="text-gray-500 font-medium text-lg">Student: <span className="text-gray-900 font-bold">{order.user_name || "Guest"}</span></p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Files</p>
            <p className="text-4xl font-extrabold text-gray-900 leading-none">{order.files.length}</p>
         </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden mb-6 relative">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
            <h3 className="font-bold text-gray-700">Document Queue (Sequential)</h3>
            <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 shadow-sm">
               {order.files.filter(f => (copiesPrinted[f.filename] || 0) >= f.copies).length} / {order.files.length} Done
            </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {order.files.map((file, idx) => {
             const numPrinted = copiesPrinted[file.filename] || 0;
             const isComplete = numPrinted >= file.copies;
             
             const isPrintingThis = printingFile === file.filename;
             const nextInQueueIndex = order.files.findIndex(f => (copiesPrinted[f.filename] || 0) < f.copies);
             const isTurn = nextInQueueIndex === -1 || nextInQueueIndex === idx;

             const isDisabled = isAnyFilePrinting || (!isTurn && !isComplete);

             let buttonText;
             if (isPrintingThis) {
                buttonText = <><Loader2 className="animate-spin" size={16}/> Printing...</>;
             } else if (isComplete) {
                buttonText = <><RefreshCw size={14}/> Reprint</>; 
             } else if (isTurn) {
                buttonText = file.copies > 1 
                  ? <><Play size={16}/> Print Copy ({numPrinted + 1}/{file.copies})</>
                  : <><Printer size={16}/> Print</>;
             } else {
                buttonText = <><Lock size={14}/> Locked</>;
             }

             return (
               <div key={idx} className={`p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${isComplete ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"}`}>
                  <div className={`p-3 rounded-xl shrink-0 ${file.color ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                     <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="font-bold text-gray-900 text-base truncate" title={file.filename}>{file.filename}</p>
                     <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${file.color ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                           {file.color ? <Palette size={10} /> : <Printer size={10} />}
                           {file.color ? "Color" : "B&W"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono font-medium truncate">
                           {file.copies} Copies • {file.pages} Pages
                        </span>
                        {file.copies > 1 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${isComplete ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            {numPrinted} / {file.copies} Printed
                          </span>
                        )}
                     </div>
                  </div>
                  <button 
                     disabled={isDisabled}
                     onClick={() => handlePrint(file)}
                     className={`w-48 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                        isPrintingThis 
                           ? "bg-gray-100 text-gray-400"
                           : !isTurn && !isComplete
                           ? "bg-gray-50 text-gray-300 border border-gray-100" // Locked visual
                           : isComplete
                           ? "bg-white border-2 border-blue-100 text-blue-600 hover:bg-blue-50"
                           : "bg-gray-900 text-white hover:bg-blue-600 hover:shadow-blue-200 active:scale-95"
                     }`}
                  >
                     {buttonText}
                  </button>
               </div>
             )
          })}
        </div>
      </div>

      <div className="h-24 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/50 flex items-center justify-between px-8">
        <button 
          onClick={() => { 
            if (confirm("Are you sure you want to fail this order? This cannot be undone.")) {
              onFail(order.order_id, "Failed by station operator");
            }
          }}
          disabled={isAnyFilePrinting}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
        >
          <AlertOctagon size={18} /> Fail Order
        </button>
        <div className="flex items-center gap-4">
          {!allFilesCompleted && (
            <div className="flex items-center text-amber-600 text-xs font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 animate-pulse">
              <Lock size={14} className="mr-2" />
              Complete all prints to unlock
            </div>
          )}
          <button 
            disabled={!allFilesCompleted || isAnyFilePrinting}
            onClick={() => onComplete(order.order_id)}
            className={`flex items-center px-8 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.98] ${
              allFilesCompleted 
                ? "bg-green-600 text-white hover:bg-green-700 hover:shadow-green-200" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
            }`}
          >
            <CheckCircle2 size={20} className="mr-2" /> Mark Completed
          </button>
        </div>
      </div>
    </div>
  );
}