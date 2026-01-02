import { Shield, Clock, Lock, FileText } from "lucide-react";
import Footer from "../components/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b py-12">
        <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-500">Last updated: December 2025</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-12">
        
        {/* Key Highlight Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-blue-900 mb-4">
                <Shield className="text-blue-600" /> Our Data Promise
            </h2>
            <p className="text-blue-800 leading-relaxed">
                At PrintQ, we understand that your documents are private. Our system is designed with a 
                <strong> "Zero-Retention" architecture</strong>. We do not mine, read, or permanently store your files.
            </p>
        </div>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="text-gray-400" size={20}/> 1. File Retention Policy
            </h2>
            <p className="text-gray-600 leading-relaxed">
                We employ a strict automated cleanup process for all uploaded documents:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>Drafts:</strong> Files uploaded but not paid for are deleted after <strong>60 minutes</strong>.</li>
                <li><strong>Completed Orders:</strong> Once printed, files are deleted immediately from our secure cloud storage.</li>
                <li><strong>Failed/Cancelled Orders:</strong> Files are deleted immediately upon cancellation or failure.</li>
            </ul>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Lock className="text-gray-400" size={20}/> 2. Data Security
            </h2>
            <p className="text-gray-600 leading-relaxed">
                All file transfers are encrypted using SSL/TLS protocols. Files are stored in secure Microsoft Azure Blob Storage containers 
                with strict access controls. Only the designated printing station can access your file for the duration of the print job.
            </p>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-gray-400" size={20}/> 3. Information We Collect
            </h2>
            <p className="text-gray-600 leading-relaxed">
                To provide our service, we collect basic information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Name and Email Address (for account management and order receipts).</li>
                <li>Transaction IDs (we do NOT store card details; all payments are handled by Razorpay).</li>
                <li>Usage logs (timestamp of print jobs) for analytics.</li>
            </ul>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">4. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
                If you have questions about your data, please contact us at <strong>support@printq.app</strong>.
            </p>
        </section>

        <hr className="border-gray-200" />

        {/* Razorpay Privacy Policy */}
        <section className="space-y-4 text-gray-600 leading-relaxed">
            <h2 className="text-xl font-bold text-gray-900">General Privacy Policy</h2>
            <p>
                This privacy policy sets out how AYUSH PATHANIA uses and protects any information that you give AYUSH PATHANIA when you visit their website and/or agree to purchase from them. AYUSH PATHANIA is committed to ensuring that your privacy is protected. Should we ask you to provide certain information by which you can be identified when using this website, and then you can be assured that it will only be used in accordance with this privacy statement. AYUSH PATHANIA may change this policy from time to time by updating this page. You should check this page from time to time to ensure that you adhere to these changes.
            </p>
            
            <h3 className="text-lg font-bold text-gray-800 pt-4">Information We May Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Name</li>
                <li>Contact information including email address</li>
                <li>Demographic information such as postcode, preferences and interests, if required</li>
                <li>Other information relevant to customer surveys and/or offers</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-800 pt-4">What we do with the information we gather</h3>
            <p>
                We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:
            </p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Internal record keeping.</li>
                <li>We may use the information to improve our products and services.</li>
                <li>We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.</li>
                <li>From time to time, we may also use your information to contact you for market research purposes. We may contact you by email, phone, fax or mail.</li>
                <li>We may use the information to customise the website according to your interests.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-800 pt-4">Security</h3>
            <p>
                We are committed to ensuring that your information is secure. In order to prevent unauthorised access or disclosure we have put in suitable measures.
            </p>

            <h3 className="text-lg font-bold text-gray-800 pt-4">How we use cookies</h3>
            <p>
                A cookie is a small file which asks permission to be placed on your computer's hard drive. Once you agree, the file is added and the cookie helps analyze web traffic or lets you know when you visit a particular site. Cookies allow web applications to respond to you as an individual. The web application can tailor its operations to your needs, likes and dislikes by gathering and remembering information about your preferences.
            </p>
        </section>

      </div>
      <Footer />
    </div>
  );
}