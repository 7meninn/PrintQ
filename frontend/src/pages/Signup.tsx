import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/apis";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-96">
        <h1 className="text-3xl font-bold text-center mb-6">Signup</h1>

        <input
          type="text"
          placeholder="Name"
          className="w-full border p-3 rounded mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
              const res = await api.post("/auth/user/signup", {
                name,
                phone,
              });
              login(res.data.user);
              navigate("/upload");
            } catch (err: any) {
              alert(err.response?.data?.error || "Signup failed");
            }
          }}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
        >
          Signup
        </button>

        <p className="text-center mt-4 text-sm">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
