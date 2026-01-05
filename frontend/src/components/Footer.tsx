import { Link } from "react-router-dom";
import { Printer, Heart } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Printer size={20} />
              </div>
              <span className="text-xl font-bold text-gray-900">PrintQ</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Smart campus printing made simple. Upload from anywhere, collect at your nearest station securely.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/upload" className="hover:text-blue-600 transition-colors">Print Documents</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Legal (Mandatory for Payment Gateway) */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/refunds" className="hover:text-blue-600 transition-colors">Refund Policy</Link></li>
              <li><Link to="/shipping" className="hover:text-blue-600 transition-colors">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Contact Snippet */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Contact Us</h3>
            <p className="text-sm text-gray-500 mb-2">support@printq.app</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {currentYear} PrintQ. All rights reserved.
          </p>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            Made with <Heart size={14} className="text-red-500 fill-red-500" /> for Students
          </p>
        </div>
      </div>
    </footer>
  );
}