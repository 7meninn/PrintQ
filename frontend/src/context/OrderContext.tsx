import { createContext, useContext, useState, ReactNode } from "react";

// Types
interface FileItem {
  file: File;
  color: boolean;
  copies: number;
}

interface PreviewData {
  files: any[];
  summary: any;
}

interface OrderContextType {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedShopId: number | null;
  setSelectedShopId: React.Dispatch<React.SetStateAction<number | null>>;
  previewData: PreviewData | null;
  setPreviewData: React.Dispatch<React.SetStateAction<PreviewData | null>>;
  resetOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const resetOrder = () => {
    setFiles([]);
    setSelectedShopId(null);
    setPreviewData(null);
  };

  return (
    <OrderContext.Provider 
      value={{ 
        files, setFiles, 
        selectedShopId, setSelectedShopId, 
        previewData, setPreviewData,
        resetOrder 
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
};