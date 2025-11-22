import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Upload from "../pages/Upload";
import Orders from "../pages/Orders";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>hgmgm
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </BrowserRouter>
  );
}
