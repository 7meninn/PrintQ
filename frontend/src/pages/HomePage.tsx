import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Loader2, Mail, Lock, User, Printer, 
  AlertCircle, XCircle, Key
} from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, login, isLoading } = useAuth();
  
  const [view, setView] = useState<"login" | "signup-email" | "signup-otp" | "signup-details">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoading && user) navigate("/upload");
  }, [user, isLoading, navigate]);

  // Validation logic
  const isDomainInvalid = email.length > 0 && 
    !email.toLowerCase().endsWith("@cuchd.in") && 
    !email.toLowerCase().endsWith("@gmail.com");

  // 🔹 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // ✅ FIX: Construct proper flat User object
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
      const res = await fetch("http://localhost:3000/auth/signup/initiate", {
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
      const res = await fetch("http://localhost:3000/auth/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // ✅ FIX: Construct proper flat User object
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

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 opacity-10"><svg className="h-full w-full"><path d="M0 100 C 20 0 50 0 100 100 Z" fill="white"/></svg></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center"><Printer size={24} /></div><h1 className="text-2xl font-bold">PrintQ</h1></div>
            <h2 className="text-5xl font-extrabold leading-tight mb-6">Skip the line.<br/><span className="text-blue-400">Print smart.</span></h2>
            <p className="text-gray-400 text-lg">Upload from anywhere. Print at any station.</p>
        </div>
      </div>

      {/* Right Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                    {view === "login" ? "Welcome Back" : "Create Account"}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                    {view === "signup-otp" ? "Enter the code sent to your email" : view === "signup-details" ? "Finalize your profile" : "Enter your details to continue"}
                </p>
            </div>

            {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16}/>{error}</div>}

            {/* LOGIN FORM */}
            {view === "login" && (
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="relative"><Mail className="absolute left-3 top-3 text-gray-400" size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 p-2.5 border rounded-xl outline-none focus:border-blue-500" placeholder="Email" required/></div>
                    <div className="relative"><Lock className="absolute left-3 top-3 text-gray-400" size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 p-2.5 border rounded-xl outline-none focus:border-blue-500" placeholder="Password" required/></div>
                    <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Log In"}</button>
                    <p className="text-center text-sm text-gray-600 mt-4">New here? <button type="button" onClick={() => setView("signup-email")} className="text-blue-600 font-bold hover:underline">Sign up</button></p>
                </form>
            )}

            {/* SIGNUP STEP 1: EMAIL */}
            {view === "signup-email" && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                    <div className="relative">
                        <Mail className={`absolute left-3 top-3 ${isDomainInvalid ? "text-red-400" : "text-gray-400"}`} size={18}/>
                        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={`w-full pl-10 p-2.5 border rounded-xl outline-none ${isDomainInvalid ? "border-red-300 bg-red-50" : "focus:border-blue-500"}`} placeholder="your.name@gmail.com" required/>
                        {isDomainInvalid && <XCircle className="absolute right-3 top-3 text-red-500" size={18} />}
                    </div>
                    {isDomainInvalid && <p className="text-xs text-red-600 mt-1">Only @gmail.com addresses are allowed.</p>}
                    <button disabled={isSubmitting || isDomainInvalid} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Send OTP"}</button>
                    <p className="text-center text-sm text-gray-600 mt-4"><button type="button" onClick={() => setView("login")} className="text-blue-600 font-bold hover:underline">Back to Login</button></p>
                </form>
            )}

            {/* SIGNUP STEP 2: OTP & DETAILS */}
            {view === "signup-otp" && (
                <form onSubmit={handleCompleteSignup} className="space-y-5">
                    <div className="relative"><Key className="absolute left-3 top-3 text-gray-400" size={18}/><input type="text" value={otp} onChange={e=>setOtp(e.target.value)} className="w-full pl-10 p-2.5 border rounded-xl outline-none focus:border-blue-500" placeholder="Enter 6-digit OTP" required maxLength={6}/></div>
                    <div className="relative"><User className="absolute left-3 top-3 text-gray-400" size={18}/><input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full pl-10 p-2.5 border rounded-xl outline-none focus:border-blue-500" placeholder="Full Name" required/></div>
                    <div className="relative"><Lock className="absolute left-3 top-3 text-gray-400" size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 p-2.5 border rounded-xl outline-none focus:border-blue-500" placeholder="Create Password" required/></div>
                    
                    <button disabled={isSubmitting} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50">{isSubmitting ? <Loader2 className="animate-spin mx-auto"/> : "Verify & Create Account"}</button>
                    <p className="text-center text-sm text-gray-600 mt-4"><button type="button" onClick={() => setView("signup-email")} className="text-blue-600 font-bold hover:underline">Change Email</button></p>
                </form>
            )}

        </div>
      </div>
    </div>
  );
}