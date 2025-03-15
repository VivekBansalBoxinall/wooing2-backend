import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import http from "http";
import { initializeSocket } from "./socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(
  cors({
    origin: ["*"],
  })
);
app.use(express.json());
app.use(helmet());
app.use(morgan("combined"));

// Routes
app.get("/", (req, res) => {
  res.send("Wooing Chat Server is running");
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found" });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "An internal error occurred" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
