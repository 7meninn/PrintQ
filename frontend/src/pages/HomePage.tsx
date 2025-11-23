import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext"; // 🔴 Uncomment for production
import { 
  ArrowRight, 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  Printer, 
  CheckCircle2, 
  Zap,
  AlertCircle,
  XCircle
} from "lucide-react";

// 🔹 Mock Auth Hook for Preview stability
// (In production, delete this and use the real import above)
const useAuth = () => {
  const [user, setUser] = useState<{id: number, name: string, email: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("printq_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("printq_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: any) => {
    setUser(userData);
    localStorage.setItem("printq_user", JSON.stringify(userData));
  };

  return { user, login, isLoading };
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user, login, isLoading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔹 Domain Validation Logic
  // Only apply strict check during Signup. During Login, we just let them try (or you can enforce it there too).
  const isDomainInvalid = !isLogin && email.length > 0 && !email.toLowerCase().endsWith("@cuchd.in");

  // 🔹 1. Auto-Redirect if Logged In
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/upload");
    }
  }, [user, isLoading, navigate]);

  // 🔹 2. Handle Real API Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Double check before submitting
    if (isDomainInvalid) return;

    setIsSubmitting(true);

    const endpoint = isLogin ? "http://localhost:3000/auth/login" : "http://localhost:3000/auth/signup";
    
    const payload = isLogin 
      ? { email, password } 
      : { name, email, password };

    try {
      // ⚠️ SIMULATED API CALL (Remove in Production)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success response
      const mockUser = {
        id: 1,
        name: name || "Student User",
        email: email,
        token: "mock-jwt-token"
      };

      // ✅ Success: Store user & token
      login(mockUser);

    } catch (err: any) {
      setError(err.message || "Unable to connect to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      
      {/* ⬅️ LEFT SIDE: Branding / Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        
        <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>
        </div>

        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Printer size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">PrintQ</h1>
            </div>
            
            <h2 className="text-5xl font-extrabold leading-tight mb-6">
                Skip the line.<br/>
                <span className="text-blue-400">Print smart.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-md">
                Upload documents from your room, select a shop on your way, and pick up your prints without waiting in queue.
            </p>
        </div>

        <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg"><Zap size={20} className="text-yellow-400" /></div>
                <p className="font-medium text-gray-300">Real-time queue tracking</p>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg"><CheckCircle2 size={20} className="text-green-400" /></div>
                <p className="font-medium text-gray-300">Secure cloud uploads</p>
            </div>
        </div>
      </div>

      {/* ➡️ RIGHT SIDE: Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                    {isLogin ? "Welcome back" : "Create an account"}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                    {isLogin 
                        ? "Enter your details to access your files" 
                        : "Join PrintQ to start printing smartly"
                    }
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {!isLogin && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-semibold text-gray-700">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                placeholder="John Doe"
                                required={!isLogin}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-sm font-semibold text-gray-700">Student Email</label>
                        {/* Live Validation Feedback */}
                        {!isLogin && (
                            <span className={`text-xs font-medium ${isDomainInvalid ? "text-red-600" : "text-gray-400"}`}>
                                Must be @cuchd.in
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDomainInvalid ? "text-red-400" : "text-gray-400"}`} size={18} />
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 transition-all outline-none ${
                                isDomainInvalid 
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50" 
                                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                            placeholder="student@cuchd.in"
                            required
                        />
                        {isDomainInvalid && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                        )}
                    </div>
                    {/* Helper Error Text */}
                    {isDomainInvalid && (
                        <p className="text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                            Please use your university email to register.
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-sm font-semibold text-gray-700">Password</label>
                        {isLogin && <a href="#" className="text-xs text-blue-600 hover:underline">Forgot?</a>}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || isDomainInvalid} // 🔒 Lock Button if invalid
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            {isLogin ? "Sign In" : "Create Account"}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setEmail(""); // Reset email to clear old validation errors
                        }}
                        className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                        {isLogin ? "Sign up" : "Log in"}
                    </button>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}