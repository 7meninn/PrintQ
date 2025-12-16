import { RefreshCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import Footer from "../components/Footer";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b py-12">
        <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Refund & Cancellation Policy</h1>
            <p className="text-gray-500">Ensuring a fair and transparent printing experience.</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-12">

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RefreshCcw className="text-blue-600" size={24}/> Automatic Refunds
            </h2>
            <p className="text-gray-600 leading-relaxed">
                PrintQ operates with an automated refund system to protect your money. Refunds are automatically initiated in the following scenarios:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={18} className="text-amber-500"/> Station Offline
                    </h3>
                    <p className="text-sm text-gray-500">
                        If a printing station goes offline and does not process your job within <strong>15 minutes</strong>, the system will mark the order as failed and initiate a full refund.
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={18} className="text-red-500"/> Hardware Failure
                    </h3>
                    <p className="text-sm text-gray-500">
                        If the printer reports a hardware jam or ink error during your job, the unprinted portion of your order will be refunded.
                    </p>
                </div>
            </div>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Cancellation Policy</h2>
            <ul className="list-disc pl-5 space-y-3 text-gray-600">
                <li>
                    <strong>Draft Orders:</strong> You can cancel any order <em>before</em> payment is completed at no charge. 
                </li>
                <li>
                    <strong>Queued Orders:</strong> Once payment is successful, the file is immediately sent to the print queue. Due to the instant nature of the service, <strong>orders cannot be manually cancelled once the status is 'Queued'</strong>.
                </li>
            </ul>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Refund Timeline</h2>
            <div className="bg-green-50 text-green-800 p-4 rounded-lg flex gap-3 items-start">
                <CheckCircle2 className="shrink-0 mt-1" size={20} />
                <p>
                    Refunds are processed to the original source of payment (UPI, Credit Card, or Debit Card). 
                    It typically takes <strong>5-7 business days</strong> for the amount to reflect in your bank account, depending on your bank's processing speed.
                </p>
            </div>
        </section>

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Contact for Payment Issues</h2>
            <p className="text-gray-600 leading-relaxed">
                If you haven't received a refund after 7 days, please contact us with your <strong>Order ID</strong> at:
                <br/>
                <a href="mailto:payments@printq.com" className="text-blue-600 font-medium hover:underline">payments@printq.com</a>
            </p>
        </section>

      </div>
      <Footer />
    </div>
  );
}