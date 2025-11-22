import { createContext, useContext, useState } from "react";

type User = {
  id: number;
  name: string;
  phone: string;
};

type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
