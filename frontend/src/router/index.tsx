import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import UploadPage from "../pages/Upload";
import PreviewPage from "../pages/PreviewPage";
import SuccessPage from "../pages/SuccessPage"; // ✅ Import

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="/success" element={<SuccessPage />} /> {/* ✅ Add Route */}
      </Routes>
    </BrowserRouter>
  );
}