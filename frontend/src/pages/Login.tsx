import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apis";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [phone, setPhone] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-3xl font-bold text-center mb-6">Login</h1>

        <input
          type="text"
          placeholder="Phone Number"
          className="w-full border p-3 rounded mb-4"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          onClick={async () => {
            try {
              const res = await api.post("/auth/user/login", {
                phone,
              });

              setUser(res.data.user);
              navigate("/upload");
            } catch (err: any) {
              alert(err.response?.data?.error || "Login failed");
            }
          }}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
        >
          Login
        </button>

        <p className="text-center mt-4 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600">
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}
