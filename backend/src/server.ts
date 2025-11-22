import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/orders.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);

app.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
