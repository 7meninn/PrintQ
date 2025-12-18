import React, { useState, useRef, useEffect } from "react";
import { Printer, ChevronDown, Zap, Ban, Check } from "lucide-react";

// --- Reusable Custom Select Component ---
const CustomSelect = ({ value, options, onChange, colorClass, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter out system junk printers
  const filteredOptions = options.filter(p => {
    const name = p.name.toLowerCase();
    return !name.includes("print to pdf") && 
           !name.includes("onenote") && 
           !name.includes("fax") && 
           !name.includes("xps document writer");
  });

  const selectedLabel = value === "Not Available" ? "Not Available" : (options.find(o => o.name === value)?.name || value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm font-bold shadow-sm transition-all outline-none ${
          disabled 
            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" 
            : `bg-white border-gray-200 hover:border-blue-300 text-gray-700 hover:shadow-md ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`p-1 rounded-md shrink-0 ${value === 'Not Available' ? 'bg-gray-100 text-gray-400' : `bg-white ${colorClass}`}`}>
            {value === 'Not Available' ? <Ban size={14}/> : <Printer size={14}/>}
          </div>
          <span className="truncate text-xs">{selectedLabel}</span>
        </div>
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${disabled ? "text-gray-300" : "text-gray-400"}`} />
      </button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top min-w-[200px]">
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {/* Not Available Option */}
            <button
              type="button"
              onClick={() => { onChange("Not Available"); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors mb-1 ${value === 'Not Available' ? 'bg-gray-100 text-gray-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <div className="p-1 bg-gray-100 rounded text-gray-500"><Ban size={12}/></div>
              <span>Not Available (Disabled)</span>
              {value === 'Not Available' && <Check size={12} className="ml-auto text-gray-600"/>}
            </button>
            
            {/* Real Printers */}
            {filteredOptions.map((printer) => (
              <button
                key={printer.name}
                type="button"
                onClick={() => { onChange(printer.name); setIsOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  value === printer.name 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {/* Always show Printer Icon */}
                <div className={`p-1 rounded ${value === printer.name ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                   <Printer size={12} />
                </div>
                <span className="truncate text-left flex-1">{printer.name}</span>
                {value === printer.name && <Check size={12} className="shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function HardwarePanel({ config, setConfig, printers, disabled }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all ${disabled ? "border-gray-100 opacity-70" : "border-blue-100 shadow-sm"}`}>
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
        <div className={`p-1.5 rounded-lg ${disabled ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>
          <Zap size={14} fill="currentColor" />
        </div>
        <div>
          <h3 className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${disabled ? "text-gray-400" : "text-blue-700"}`}>
            Hardware Config
          </h3>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Assign active printers</p>
        </div>
        {disabled && <span className="ml-auto text-[9px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-gray-200">LOCKED</span>}
      </div>

      <div className="space-y-4">
        {/* B/W Section */}
        <div>
          <label className={`block text-[10px] font-bold uppercase mb-1.5 ml-1 flex items-center gap-1.5 ${disabled ? "text-gray-300" : "text-gray-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${disabled ? "bg-gray-300" : "bg-blue-500"}`}></span>
            Black & White
          </label>
          <CustomSelect 
            value={config.bw} 
            options={printers} 
            onChange={(val) => setConfig({...config, bw: val})} 
            colorClass="text-blue-600"
            disabled={disabled}
          />
        </div>

        {/* Color Section */}
        <div>
          <label className={`block text-[10px] font-bold uppercase mb-1.5 ml-1 flex items-center gap-1.5 ${disabled ? "text-gray-300" : "text-gray-500"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${disabled ? "bg-gray-300" : "bg-purple-500"}`}></span>
            Color / Photo
          </label>
          <CustomSelect 
            value={config.color} 
            options={printers} 
            onChange={(val) => setConfig({...config, color: val})} 
            colorClass="text-purple-600"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}