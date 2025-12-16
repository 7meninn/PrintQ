import { Mail, Phone, MapPin, Send } from "lucide-react";
import Footer from "../components/Footer";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Get in touch</h1>
            <p className="text-blue-100 text-lg">We are here to help you with your printing needs.</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 -mt-10 mb-12 w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Info */}
            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Mail size={20}/></div>
                            <div>
                                <p className="font-bold text-gray-900">Email</p>
                                <p className="text-gray-500">support@printq.com</p>
                                <p className="text-gray-500">payments@printq.com</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Phone size={20}/></div>
                            <div>
                                <p className="font-bold text-gray-900">Phone</p>
                                <p className="text-gray-500">+91 98765 43210</p>
                                <p className="text-xs text-gray-400 mt-1">Mon-Fri, 9am - 5pm</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={20}/></div>
                            <div>
                                <p className="font-bold text-gray-900">Office</p>
                                <p className="text-gray-500">Block B, Innovation Hub</p>
                                <p className="text-gray-500">University Campus, India</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Placeholder */}
            <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-4">Send us a message</h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                        <input type="text" className="w-full rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500" placeholder="Your name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                        <input type="email" className="w-full rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500" placeholder="john@example.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                        <textarea className="w-full rounded-lg border-gray-200 focus:ring-blue-500 focus:border-blue-500 h-24" placeholder="How can we help?"></textarea>
                    </div>
                    <button className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                        Send Message <Send size={16} />
                    </button>
                </form>
            </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}