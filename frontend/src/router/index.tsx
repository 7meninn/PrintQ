import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import Upload from "../pages/Upload";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🏠 Home / Login Page */}
        <Route path="/" element={<HomePage />} />

        {/* 📤 Upload & Preview Page */}
        {/* Note: This page checks for auth internally and redirects to '/' if not logged in */}
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </BrowserRouter>
  );
}