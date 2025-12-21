import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import UploadPage from "../pages/Upload";
import PreviewPage from "../pages/PreviewPage";
import SuccessPage from "../pages/SuccessPage";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import Terms from "../pages/Terms";
import RefundPolicy from "../pages/RefundPolicy";
import Contact from "../pages/Contact";
import UserHistoryPage from "../pages/UserHistoryPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refunds" element={<RefundPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/history" element={<UserHistoryPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}