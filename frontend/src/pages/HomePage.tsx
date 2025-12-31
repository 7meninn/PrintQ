import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import { 
  Loader2, Mail, Lock, User, 
  AlertCircle, XCircle, Key, CheckCircle, 
  Printer
} from "lucide-react";
import Footer from "../components/Footer";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, login, isLoading } = useAuth();
  
  // Added "forgot-password" state
  const [view, setView] = useState<"login" | "signup-email" | "signup-otp" | "signup-details" | "forgot-password">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form States
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoading && user) navigate("/upload");
  }, [user, isLoading, navigate]);

  // Validation logic
  const isDomainInvalid = email.length > 0 && !email.toLowerCase().endsWith("@gmail.com");

  // 🔹 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (isDomainInvalid) {
        setError("Only @gmail.com addresses are currently supported.");
        return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        token: data.token
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 2. Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDomainInvalid) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setView("signup-otp"); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 3. Verify & Create
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        token: data.token
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔹 4. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    if (isDomainInvalid) {
      setError("Please enter a valid @gmail.com address.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccessMsg(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-gray-900">
      
      {/* --- HERO SECTION --- */}
      <div className="flex-grow">
        <div className="relative overflow-hidden bg-white">
          {/* Background Decor */}
          <div className="absolute inset-0 z-0">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-white to-white opacity-70"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 lg:pb-24">
            
            {/* Navbar Placeholder */}
            <div className="flex justify-between items-center mb-10 lg:mb-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Printer size={24} className="text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-gray-900">PrintQ</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              
              {/* Left Column: Text Content */}
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Live at CUCHD Campus
                </div>
                <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.15]">
                  Skip the line. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Print Smart.</span>
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  Upload your documents from anywhere and collect them at any station. Secure, fast, and paperless until you need it.
                </p>
                
                <div className="hidden lg:flex gap-8 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/> Instant Upload</div>
                  <div className="flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/> Secure Payment</div>
                  <div className="flex items-center gap-2"><CheckCircle size={18} className="text-green-500"/> 24/7 Access</div>
                </div>
              </div>

              {/* Right Column: Auth Card */}
              <div className="w-full lg:w-1/2">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                  {/* Card Header */}
                  <div className="px-8 pt-8 pb-4 bg-gray-50/50 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">
                      {view === "login" ? "Welcome Back" : 
                       view === "forgot-password" ? "Recover Password" : 
                       "Create Account"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {view === "signup-otp" ? "Check your email for the code" : 
                       view === "signup-details" ? "Almost there" : 
                       view === "forgot-password" ? "We'll send it to your email" :
                       "Manage your prints efficiently"}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-8">
                    {error && (
                      <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-3 border border-red-100">
                        <AlertCircle size={18} className="mt-0.5 shrink-0"/>
                        <span>{error}</span>
                      </div>
                    )}

                    {successMsg && (
                      <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl flex items-start gap-3 border border-green-100">
                        <CheckCircle size={18} className="mt-0.5 shrink-0"/>
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* VIEW: LOGIN */}
                    {view === "login" && (
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 uppercase mb-2 ml-1">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                            <input 
                              type="email" 
                              value={email} 
                              onChange={e=>setEmail(e.target.value)} 
                              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                              placeholder="student@gmail.com" 
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-xs font-semibold text-gray-700 uppercase">Password</label>
                            <button type="button" onClick={() => setView("forgot-password")} className="text-xs text-blue-600 font-medium hover:underline">Forgot?</button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                            <input 
                              type="password" 
                              value={password} 
                              onChange={e=>setPassword(e.target.value)} 
                              className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                              placeholder="••••••••" 
                              required
                            />
                          </div>
                        </div>
                        <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all disabled:opacity-70 active:scale-[0.98]">
                          {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Sign In"}
                        </button>
                        <div className="text-center pt-2">
                          <p className="text-sm text-gray-500">Don't have an account? <button type="button" onClick={() => setView("signup-email")} className="text-blue-600 font-bold hover:underline">Get Started</button></p>
                        </div>
                      </form>
                    )}

                    {/* VIEW: FORGOT PASSWORD */}
                    {view === "forgot-password" && (
                      <form onSubmit={handleForgotPassword} className="space-y-6">
                        {!successMsg ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 uppercase mb-2 ml-1">Enter your registered email</label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                <input 
                                  type="email" 
                                  value={email} 
                                  onChange={e=>setEmail(e.target.value)} 
                                  className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                                  placeholder="student@gmail.com" 
                                  required
                                />
                              </div>
                            </div>
                            <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-70 active:scale-[0.98]">
                              {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Recover Password"}
                            </button>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 text-sm mb-6">You can now login with your recovered password.</p>
                            <button type="button" onClick={() => setView("login")} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold hover:bg-black transition-all">
                              Back to Login
                            </button>
                          </div>
                        )}
                        {!successMsg && (
                          <div className="text-center pt-2">
                            <button type="button" onClick={() => setView("login")} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to Login</button>
                          </div>
                        )}
                      </form>
                    )}

                    {/* VIEW: SIGNUP EMAIL */}
                    {view === "signup-email" && (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                           <label className="block text-xs font-semibold text-gray-700 uppercase mb-2 ml-1">Gmail Address</label>
                          <div className="relative">
                            <Mail className={`absolute left-3 top-3.5 ${isDomainInvalid ? "text-red-400" : "text-gray-400"}`} size={18}/>
                            <input 
                              type="email" 
                              value={email} 
                              onChange={e=>setEmail(e.target.value)} 
                              className={`w-full pl-10 p-3 border rounded-xl outline-none transition-all ${isDomainInvalid ? "border-red-300 bg-red-50 text-red-900 focus:ring-red-100" : "bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}`} 
                              placeholder="your.name@gmail.com" 
                              required
                            />
                            {isDomainInvalid && <XCircle className="absolute right-3 top-3.5 text-red-500" size={18} />}
                          </div>
                          {isDomainInvalid && <p className="text-xs text-red-600 mt-2 ml-1">Please use a valid @gmail.com address.</p>}
                        </div>
                        
                        <button disabled={isSubmitting || isDomainInvalid} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                          {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Continue"}
                        </button>
                        <div className="text-center pt-2">
                          <button type="button" onClick={() => setView("login")} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to Login</button>
                        </div>
                      </form>
                    )}

                    {/* VIEW: SIGNUP OTP & DETAILS */}
                    {view === "signup-otp" && (
                      <form onSubmit={handleCompleteSignup} className="space-y-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-center">
                          <p className="text-xs text-blue-800">OTP sent to <strong>{email}</strong></p>
                        </div>
                        <div className="relative">
                          <Key className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                          <input type="text" value={otp} onChange={e=>setOtp(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="6-digit OTP" required maxLength={6}/>
                        </div>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                          <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="Full Name" required/>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="Create Password" required/>
                        </div>
                        
                        <button disabled={isSubmitting} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all disabled:opacity-70">
                          {isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Create Account"}
                        </button>
                        <div className="text-center pt-2">
                          <button type="button" onClick={() => setView("signup-email")} className="text-sm text-blue-600 hover:underline">Change Email</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
}