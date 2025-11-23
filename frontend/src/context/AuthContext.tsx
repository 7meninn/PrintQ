import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// 🔹 User Type: Matches your backend response
interface User {
  id: number;
  name: string;
  email: string;
  token: string; // JWT Token is essential for secure requests
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

  // 🔹 Check Local Storage on Mount (Auto-Login)
  useEffect(() => {
    const storedUser = localStorage.getItem("printq_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Optional: You could verify if the token is expired here
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user data", error);
        localStorage.removeItem("printq_user");
      }
    }
    setIsLoading(false);
  }, []);

  // 🔹 Login Action: Saves User + Token
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("printq_user", JSON.stringify(userData));
  };

  // 🔹 Logout Action: Clears Storage
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