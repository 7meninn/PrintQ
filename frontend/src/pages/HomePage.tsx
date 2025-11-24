import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/upload");
    }
  }, [user, isLoading, navigate]);

  // Validation Helper
  const isDomainInvalid = email.length > 0 && !email.toLowerCase().endsWith("@cuchd.in");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isDomainInvalid) return;

    setIsSubmitting(true);

    const endpoint = isLogin 
      ? "http://localhost:3000/auth/login" 
      : "http://localhost:3000/auth/signup";
    
    const payload = isLogin 
      ? { email, password } 
      : { name, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // ✅ REAL JWT LOGIN
      // The backend returns { user: {...}, token: "..." }
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        token: data.token
      });

      // Navigation happens automatically via useEffect

    } catch (err: any) {
      setError(err.message);
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
      
      {/* LEFT SIDE: Branding */}
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

      {/* RIGHT SIDE: Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                    {isLogin ? "Welcome back" : "Create an account"}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                    {isLogin ? "Login to access your files" : "Join using your university email"}
                </p>
            </div>

            {/* Error Box */}
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
                                type="text" value={name} onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="John Doe" required={!isLogin}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Student Email</label>
                    <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDomainInvalid ? "text-red-400" : "text-gray-400"}`} size={18} />
                        <input 
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition-all ${isDomainInvalid ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}
                            placeholder="student@cuchd.in" required
                        />
                        {isDomainInvalid && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />}
                    </div>
                    {isDomainInvalid && <p className="text-xs text-red-600 font-medium">Email must end with @cuchd.in</p>}
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-sm font-semibold text-gray-700">Password</label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="••••••••" required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || isDomainInvalid}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>{isLogin ? "Sign In" : "Create Account"} <ArrowRight size={18} /></>}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(""); }}
                        className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
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