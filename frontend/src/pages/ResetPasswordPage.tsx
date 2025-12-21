import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, CheckCircle, AlertCircle, ArrowRight, Printer } from "lucide-react";
import Footer from "../components/Footer";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
        setError("Invalid link. Please request a new password reset.");
    }
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    
    if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("https://printq-api-c6h3bsewd5cxfwgr.centralindia-01.azurewebsites.net/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setSuccess(true);
      // Optional: Auto redirect after 3 seconds
      setTimeout(() => navigate("/"), 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-gray-900">
      <div className="flex-grow flex items-center justify-center p-4">
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
             <div className="flex justify-between items-center mb-10 lg:mb-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Printer size={24} className="text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-gray-900">PrintQ</span>
              </div>
            </div>
             <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
             <p className="text-sm text-gray-500 mt-2">Enter a new secure password for your account.</p>
          </div>

          <div className="p-8">
             {success ? (
                <div className="text-center py-6">
                   <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                      <CheckCircle size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900 mb-2">Password Updated!</h3>
                   <p className="text-gray-500 mb-6">Your password has been changed successfully.</p>
                   <button 
                     onClick={() => navigate("/")} 
                     className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                   >
                     Go to Login
                   </button>
                </div>
             ) : (
               <form onSubmit={handleReset} className="space-y-4">
                 {error && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                      <AlertCircle size={18} className="mt-0.5 shrink-0"/>
                      <span>{error}</span>
                    </div>
                  )}

                  {!token ? (
                     <button 
                        type="button"
                        onClick={() => navigate("/")} 
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all"
                     >
                        Back to Home
                     </button>
                  ) : (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">New Password</label>
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

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                                <input 
                                    type="password" 
                                    value={confirmPassword} 
                                    onChange={e=>setConfirmPassword(e.target.value)} 
                                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                                    placeholder="••••••••" 
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            disabled={isSubmitting} 
                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-70 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <>Reset Password <ArrowRight size={18}/></>}
                        </button>
                    </>
                  )}
               </form>
             )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}