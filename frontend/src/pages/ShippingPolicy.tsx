import { Package, HelpCircle } from "lucide-react";
import Footer from "../components/Footer";

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b py-12">
        <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Shipping & Delivery Policy</h1>
            <p className="text-gray-500">Information about how we deliver our service.</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-12">

        <section className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="text-blue-600" size={24}/> A Note on "Shipping"
            </h2>
            <p className="text-gray-600 leading-relaxed">
                PrintQ is a digital platform that facilitates printing services at physical print shop locations. 
                <strong>We do not ship or deliver physical documents.</strong> 
                The term "delivery" refers to the successful transmission of your digital file to the printing station you have selected.
            </p>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex gap-3 items-start">
                <HelpCircle className="shrink-0 mt-1" size={20} />
                <p>
                    The following policy is a legal requirement for our payment processor.
                </p>
            </div>
        </section>

        <hr className="border-gray-200" />

        {/* Razorpay Policy */}
        <section className="space-y-4 text-gray-600 leading-relaxed">
            <h2 className="text-xl font-bold text-gray-900">General Shipping & Delivery Policy</h2>
            <p>
                For International buyers, orders are shipped and delivered through registered international courier companies and/or International speed post only. For domestic buyers, orders are shipped through registered domestic courier companies and /or speed post only. Orders are shipped within 'Not Applicable' days or as per the delivery date agreed at the time of order confirmation and delivering of the shipment is subject to Courier Company / post office norms. AYUSH PATHANIA is not liable for any delay in delivery by the courier company / postal authorities and only guarantees to hand over the consignment to the courier company or postal authorities within 'Not Applicable' days from the date of the order and payment or as per the delivery date agreed at the time of order confirmation. Delivery of all orders will be to the address provided by the buyer. Delivery of our services will be confirmed on your mail ID as specified during registration. For any issues in utilizing our services you may contact our helpdesk on +91 Coming Soon or support@printq.app.
            </p>
        </section>

      </div>
      <Footer />
    </div>
  );
}
