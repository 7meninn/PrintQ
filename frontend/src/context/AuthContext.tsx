import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem("printq_user");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        
        if (parsed.user && parsed.token && !parsed.email) {
           console.warn("Detected malformed auth data. Fixing...");
           const flatUser = { ...parsed.user, token: parsed.token };
           setUser(flatUser);
           localStorage.setItem("printq_user", JSON.stringify(flatUser));
        } else {
           // Data is correct
           setUser(parsed);
        }
      } catch (error) {
        console.error("Auth data corrupted", error);
        localStorage.removeItem("printq_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("printq_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("printq_user");
    window.location.href = "/"; 
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};