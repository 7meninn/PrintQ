import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b py-12">
        <div className="max-w-4xl mx-auto px-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-500">Please read these terms carefully before using PrintQ.</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 space-y-8 text-gray-600">
        
        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using PrintQ, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Use of Service</h2>
            <p>You agree to use this service only for lawful purposes. You are strictly prohibited from uploading content that is illegal, offensive, copyrighted without permission, or harmful.</p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. User Responsibility</h2>
            <p>You are responsible for ensuring the document uploaded is the correct version. PrintQ is not liable for printing errors caused by user mistakes (e.g., wrong file, wrong page range selection).</p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Service Availability</h2>
            <p>While we strive for 100% uptime, PrintQ does not guarantee that the service will be uninterrupted. We reserve the right to suspend service for maintenance or updates.</p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Pricing & Payments</h2>
            <p>Prices are subject to change. The final price calculated at checkout is binding. All payments are processed securely via third-party gateways.</p>
        </section>

        <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Limitation of Liability</h2>
            <p>PrintQ shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the service.</p>
        </section>

      </div>
      <Footer />
    </div>
  );
}