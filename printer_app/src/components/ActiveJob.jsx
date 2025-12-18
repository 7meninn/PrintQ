import React, { useState, useEffect } from "react";
import { 
  FileText, Printer, CheckCircle2, AlertOctagon, 
  RefreshCw, Lock, Palette, Loader2 
} from "lucide-react";

export default function ActiveJob({ order, config, onComplete, onFail }) {
  const [fileStatus, setFileStatus] = useState({}); // { filename: 'printed' }
  const [printingFile, setPrintingFile] = useState(null); 
  
  useEffect(() => { 
    setFileStatus({}); 
    setPrintingFile(null);
  }, [order.order_id]);

  const allPrinted = order.files.every(f => fileStatus[f.filename] === 'printed');
  const isGlobalProcessing = printingFile !== null;

  // --- SEQUENTIAL LOGIC ---
  // Find the index of the first file that hasn't been printed yet.
  // If all are printed, this returns -1.
  const nextFileIndex = order.files.findIndex(f => fileStatus[f.filename] !== 'printed');

  const handlePrint = async (file) => {
    if (isGlobalProcessing) return; 
    setPrintingFile(file.filename);

    const printerName = file.color ? config.color : config.bw;

    try {
      await window.electronAPI.printJob({ 
        printerName, 
        filePath: file.url 
      });
      setFileStatus(prev => ({ ...prev, [file.filename]: 'printed' }));
    } catch (e) {
      alert(`Print Error: ${e}`);
    } finally {
      setPrintingFile(null);
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
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

      {/* Files List */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden mb-6 relative">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
            <h3 className="font-bold text-gray-700">Document Queue (Sequential)</h3>
            <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 shadow-sm">
               {Object.keys(fileStatus).length} / {order.files.length} Done
            </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {order.files.map((file, idx) => {
             const isPrinted = fileStatus[file.filename] === 'printed';
             const isThisFileProcessing = printingFile === file.filename;
             
             // STRICT SEQUENCE RULES:
             // 1. You can print if you are the Next File.
             // 2. You can reprint if you are already printed.
             // 3. Otherwise, you are locked.
             const isSequenceAllowed = idx === nextFileIndex || isPrinted;
             
             const isLocked = isGlobalProcessing || !isSequenceAllowed;

             return (
               <div key={idx} className={`p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${isPrinted ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"}`}>
                  <div className={`p-3 rounded-xl shrink-0 ${file.color ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                     <FileText size={24} />
                  </div>

                  <div className="flex-1 min-w-0">
                     <p className="font-bold text-gray-900 text-base truncate" title={file.filename}>
                        {file.filename}
                     </p>
                     <div className="flex gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${file.color ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                           {file.color ? <Palette size={10} /> : <Printer size={10} />}
                           {file.color ? "Color" : "B&W"}
                        </span>
                        <span className="text-xs text-gray-400 font-mono font-medium truncate">
                           {file.copies} Copies • {file.pages} Pages
                        </span>
                     </div>
                  </div>

                  <button 
                     disabled={isLocked && !isThisFileProcessing}
                     onClick={() => handlePrint(file)}
                     className={`w-36 py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                        isThisFileProcessing 
                           ? "bg-gray-100 text-gray-400 cursor-wait"
                           : !isSequenceAllowed
                           ? "bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100" // Locked visual
                           : isPrinted
                           ? "bg-white border-2 border-blue-100 text-blue-600 hover:bg-blue-50"
                           : "bg-gray-900 text-white hover:bg-blue-600 hover:shadow-blue-200 active:scale-95"
                     }`}
                  >
                     {isThisFileProcessing ? (
                        <><Loader2 className="animate-spin" size={16}/> Processing</>
                     ) : !isSequenceAllowed && !isPrinted ? (
                        <><Lock size={14}/> Locked</>
                     ) : isPrinted ? (
                        <><RefreshCw size={14}/> Reprint</> 
                     ) : (
                        <><Printer size={16}/> Print</>
                     )}
                  </button>
               </div>
             )
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="h-24 bg-white border border-gray-200 rounded-2xl shadow-lg shadow-gray-200/50 flex items-center justify-between px-8">
        <button 
          onClick={() => { if(confirm("Mark FAILED?")) onFail(order.order_id); }}
          disabled={isGlobalProcessing}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
        >
          <AlertOctagon size={18} /> Fail Order
        </button>

        <div className="flex items-center gap-4">
          {!allPrinted && (
            <div className="flex items-center text-amber-600 text-xs font-bold bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 animate-pulse">
              <Lock size={14} className="mr-2" />
              Complete all prints to unlock
            </div>
          )}
          <button 
            disabled={!allPrinted || isGlobalProcessing}
            onClick={() => onComplete(order.order_id)}
            className={`flex items-center px-8 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.98] ${
              allPrinted 
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