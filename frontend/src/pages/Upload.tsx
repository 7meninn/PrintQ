import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/apis"
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.min.js";


export default function Upload() {
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);

  const handleFile = async (file: File) => {
    setFile(file);

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPages(pdf.numPages);    // <-- AUTO SET PAGE COUNT
    }
  };


  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file first");
      return;
    }

    try {
      const form = new FormData();

      const amount = pages * copies * (color ? 5 : 1);

      form.append("file", file);
      form.append("user_id", String(user?.id));
      form.append("shop_id", "1"); // test
      form.append("pages", String(pages));
      form.append("copies", String(copies));
      form.append("color", color ? "true" : "false");
      form.append("amount", String(amount));

      const res = await api.post("/orders/create", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log(res.data);
      alert("Upload success!");

    } catch (err: any) {
      console.log(err);
      alert(err.response?.data?.error || "Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-6">Upload Your Document</h1>
        <div className="mb-4 bg-gray-50 p-3 rounded border">
          <p className="text-sm">Logged in as:</p>
          <p className="font-semibold">{user?.name} ({user?.phone})</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block mb-1 font-medium">Select File</label>
            <input
  type="file"
  accept=".pdf"
  onChange={(e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }}
  className="border w-full p-2 rounded"
/>

          </div>

          {/* Pages */}
          <div>
            <label className="block mb-1 font-medium">Total Pages</label>
            <input
              type="number"
              min={1}
              value={pages}
              onChange={(e) => setPages(Number(e.target.value))}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Copies */}
          <div>
            <label className="block mb-1 font-medium">Number of Copies</label>
            <input
              type="number"
              min={1}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="border w-full p-2 rounded"
            />
          </div>

          {/* Color or B/W */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={color}
              onChange={(e) => setColor(e.target.checked)}
            />
            <span>Print in Color?</span>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
          >
            Upload & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
