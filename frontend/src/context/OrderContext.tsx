import { createContext, useContext, useState, ReactNode } from "react";

// Represents a file BEFORE upload (Local)
export interface LocalFileItem {
  file: File;
  color: boolean;
  copies: number;
  detected_pages?: number;
  calculated_pages?: number;
  cost?: number;
  previewUrl?: string;
}

interface LocalPreviewData {
  files: LocalFileItem[];
  summary: {
    total_bw_pages: number;
    total_color_pages: number;
    bw_cost: number;
    color_cost: number;
    service_charge: number;
    total_amount: number;
  };
  shop_id: number;
  shop_name: string;
}

interface OrderContextType {
  files: LocalFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<LocalFileItem[]>>;
  selectedShopId: number | null;
  setSelectedShopId: React.Dispatch<React.SetStateAction<number | null>>;
  previewData: LocalPreviewData | null;
  setPreviewData: React.Dispatch<React.SetStateAction<LocalPreviewData | null>>;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<LocalFileItem[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<LocalPreviewData | null>(null);

  const resetOrder = () => {
    setFiles([]);
    setSelectedShopId(null);
    setPreviewData(null);
  };

  return (
    <OrderContext.Provider value={{ 
      files, setFiles, 
      selectedShopId, setSelectedShopId, 
      previewData, setPreviewData, 
      resetOrder 
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error("useOrder must be used within an OrderProvider");
  return context;
}