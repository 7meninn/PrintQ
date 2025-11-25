import React from "react";
import ReactDOM from "react-dom/client";
import AppRouter from "./router";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { OrderProvider } from "./context/OrderContext"; // ✅ Import

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <OrderProvider>
        <AppRouter />
      </OrderProvider>
    </AuthProvider>
  </React.StrictMode>
);