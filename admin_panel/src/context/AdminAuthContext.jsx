import React, { createContext, useContext, useState, useEffect } from "react";

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_secret"));

  const login = (secret) => {
    localStorage.setItem("admin_secret", secret);
    setAdminToken(secret);
  };

  const logout = () => {
    localStorage.removeItem("admin_secret");
    setAdminToken(null);
  };

  return (
    <AdminAuthContext.Provider value={{ adminToken, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}