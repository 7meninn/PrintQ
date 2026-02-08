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

        <hr className="border-gray-200" />

        {/* Razorpay Terms */}
        <section className="space-y-4 text-gray-600 leading-relaxed">
            <h2 className="text-xl font-bold text-gray-900 mb-4">General Terms & Conditions</h2>
            <p>
                For the purpose of these Terms and Conditions, the term "we", "us", "our" used anywhere on this page shall mean AYUSH PATHANIA, whose registered/operational office is Greater Mohali, Punjab. "you", “your”, "user", “visitor” shall mean any natural or legal person who is visiting our website and/or agreed to purchase from us.
            </p>
            <p>
                Your use of the website and/or purchase from us are governed by following Terms and Conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2">
                <li>The content of the pages of this website is subject to change without notice.</li>
                <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                <li>Your use of any information or materials on our website and/or product pages is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through our website and/or product pages meet your specific requirements.</li>
                <li>Our website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</li>
                <li>All trademarks reproduced in our website which are not the property of, or licensed to, the operator are acknowledged on the website.</li>
                <li>Unauthorized use of information provided by us shall give rise to a claim for damages and/or be a criminal offense.</li>
                <li>From time to time our website may also include links to other websites. These links are provided for your convenience to provide further information.</li>
            </ul>
        </section>

      </div>
      <Footer />
    </div>
  );
}
