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
                <a href="mailto:support@printq.app" className="text-blue-600 font-medium hover:underline">support@printq.app</a>
            </p>
        </section>

        <hr className="border-gray-200" />

        {/* Razorpay Policy */}
        <section className="space-y-4 text-gray-600 leading-relaxed">
            <h2 className="text-xl font-bold text-gray-900">General Cancellation & Refund Policy</h2>
            <p>
                AYUSH PATHANIA believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
            </p>
            <ul className="list-disc pl-5 space-y-2">
                <li>Cancellations will be considered only if the request is made within 1-2 days of placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.</li>
                <li>AYUSH PATHANIA does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.</li>
                <li>In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 1-2 days of receipt of the aproducts.</li>
                <li>In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 1-2 days of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.</li>
                <li>In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them.</li>
                <li>In case of any Refunds approved by the AYUSH PATHANIA, it’ll take 6-8 days for the refund to be processed to the end customer.</li>
            </ul>
        </section>
      </div>
      <Footer />
    </div>
  );
}