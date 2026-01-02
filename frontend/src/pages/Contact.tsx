import { Mail, MessageCircle, AlertCircle, CheckCircle2 } from "lucide-react";
import Footer from "../components/Footer";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      
      {/* Header Hero */}
      <div className="bg-blue-600 pt-20 pb-24">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
            <div className="inline-flex items-center gap-2 bg-blue-500/30 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-blue-400/30">
               <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
               Support Online
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
               How can we help?
            </h1>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed">
               PrintQ is built and maintained by students, for students. We might not have a call center, but we read every email.
            </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl mx-auto px-6 -mt-12 mb-20 w-full relative z-10">
        
        {/* Support Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-10 text-center">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Mail size={32} />
               </div>
               
               <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Support</h2>
               <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  For refunds, failed orders, or account issues, please drop us a mail. We usually reply within 48 hours.
               </p>

               <a 
                  href="mailto:support@printq.app" 
                  className="inline-flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 shadow-lg shadow-gray-200"
               >
                  <MessageCircle size={20} />
                  support@printq.app
               </a>
            </div>

            {/* Instructions Section */}
            <div className="bg-gray-50 p-8 md:p-10 border-t border-gray-100">
               <div className="flex items-start gap-4 mb-6">
                  <AlertCircle className="text-blue-600 shrink-0 mt-1" size={24} />
                  <div>
                     <h3 className="font-bold text-gray-900 text-lg">Help us resolve it faster</h3>
                     <p className="text-gray-500 text-sm mt-1">
                        To speed up your request, please include these details in your email body. No formal formatting needed!
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                     <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                     <span className="font-bold text-gray-700 text-sm">Order ID</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                     <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                     <span className="font-bold text-gray-700 text-sm">Shop Name</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
                     <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                     <span className="font-bold text-gray-700 text-sm">Registered Email</span>
                  </div>
               </div>
            </div>
        </div>

        {/* Note */}
        <p className="text-center text-gray-400 text-sm mt-8 font-medium">
           We appreciate your patience and support! 💙
        </p>

        {/* Razorpay Legal Info */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mt-8">
            <div className="p-8 md:p-10">
                <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Registered Business Details</h3>
                <div className="text-center text-gray-600 space-y-2">
                    <p><span className="font-semibold">Merchant Legal Name:</span> AYUSH PATHANIA</p>
                    <p><span className="font-semibold">Registered Address:</span> VPO SALOL DISTT KANGRA, Kangra, HIMACHAL PRADESH 176214</p>
                    <p><span className="font-semibold">Telephone No:</span> 8278755136</p>
                    <p><span className="font-semibold">E-Mail ID:</span> support@printq.app</p>
                </div>
            </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}