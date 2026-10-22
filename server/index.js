import { getDatabaseReadiness } from "./utils/databaseReadiness.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";
import contentRoutes from "./routes/content.js";
import businessRoutes from "./routes/business.js";
import businessAIRoutes from "./routes/businessAI.js";
import newsRoutes from "./routes/news.js";
import creatorFinanceRoutes from "./routes/creatorFinance.js";
import calendarRoutes from "./routes/calendar.js";
import liveVideoRoutes from "./routes/liveVideos.js";
import educationRoutes from "./routes/education.js";
import educationQuizRoutes from "./routes/educationQuiz.js";
import ayurvedaAIRoutes from "./routes/ayurvedaAI.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import aiAssistantRoutes from "./routes/aiAssistant.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map(origin => origin.trim()) : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const onlineUsers = new Map();
const liveRooms = new Map();

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", socket => {
  const userId = socket.user.id.toString();
  socket.join("user:" + userId);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  socket.emit("realtime:ready", { userId });
  socket.emit("presence:list", { userIds: [...onlineUsers.keys()] });
  socket.broadcast.emit("presence:online", { userId });

  socket.on("live:list", () => {
    socket.emit("live:list", { rooms: [...liveRooms.values()].map(({ hostSocketId, ...room }) => room) });
  });
  socket.on("live:start", (payload = {}) => {
    const id = String(payload.id || "");
    const title = String(payload.title || "SHIVASHA Live").slice(0, 90);
    if (!id.startsWith("live-") || liveRooms.has(id)) return;
    const room = { id, title, hostId: userId, hostName: String(payload.hostName || "SHIVASHA member").slice(0, 80), viewers: 0, startedAt: new Date().toISOString(), hostSocketId: socket.id };
    liveRooms.set(id, room);
    socket.join("live:" + id);
    const { hostSocketId, ...publicRoom } = room;
    io.emit("live:started", publicRoom);
    io.emit("live:list", { rooms: [...liveRooms.values()].map(({ hostSocketId, ...item }) => item) });
  });
  socket.on("live:join", ({ roomId } = {}) => {
    const room = liveRooms.get(String(roomId || ""));
    if (!room || room.hostSocketId === socket.id) return;
    socket.join("live:" + room.id);
    room.viewers = io.sockets.adapter.rooms.get("live:" + room.id)?.size - 1 || 0;
    io.to(room.hostSocketId).emit("live:viewer-join", { roomId: room.id, viewerSocketId: socket.id });
    io.to("live:" + room.id).emit("live:viewers", { roomId: room.id, viewers: room.viewers });
  });
  socket.on("live:leave", ({ roomId } = {}) => {
    const id = String(roomId || "");
    socket.leave("live:" + id);
    const room = liveRooms.get(id);
    if (room) {
      room.viewers = Math.max((io.sockets.adapter.rooms.get("live:" + id)?.size || 1) - 1, 0);
      io.to("live:" + id).emit("live:viewers", { roomId: id, viewers: room.viewers });
    }
  });
  socket.on("live:stop", ({ roomId } = {}) => {
    const id = String(roomId || "");
    const room = liveRooms.get(id);
    if (!room || room.hostSocketId !== socket.id) return;
    liveRooms.delete(id);
    io.to("live:" + id).emit("live:stopped", { roomId: id });
    io.in("live:" + id).socketsLeave("live:" + id);
    io.emit("live:list", { rooms: [...liveRooms.values()].map(({ hostSocketId, ...item }) => item) });
  });
  socket.on("live:signal", ({ roomId, to, signal } = {}) => {
    const id = String(roomId || "");
    if (!liveRooms.has(id) || !socket.rooms.has("live:" + id) || typeof to !== "string" || !signal || !["offer", "answer", "ice"].includes(signal.type)) return;
    if (!io.sockets.adapter.rooms.get("live:" + id)?.has(to)) return;
    io.to(to).emit("live:signal", { roomId: id, from: socket.id, signal });
  });
  socket.on("live:chat", ({ roomId, text } = {}) => {
    const id = String(roomId || "");
    const room = liveRooms.get(id);
    const clean = typeof text === "string" ? text.trim().slice(0, 300) : "";
    if (!room || !clean || !socket.rooms.has("live:" + id)) return;
    io.to("live:" + id).emit("live:chat", { id: Date.now() + Math.random(), roomId: id, name: userId === room.hostId ? room.hostName : "Member " + userId.slice(-5), text: clean, createdAt: new Date().toISOString() });
  });
  socket.on("live:reaction", ({ roomId, emoji } = {}) => {
    const id = String(roomId || "");
    if (!liveRooms.has(id) || !socket.rooms.has("live:" + id) || !["❤️", "👏", "🔥"].includes(emoji)) return;
    io.to("live:" + id).emit("live:reaction", { roomId: id, emoji });
  });

  socket.on("presence:heartbeat", () => socket.emit("presence:pong", { at: Date.now() }));
  socket.on("typing:start", ({ conversationId } = {}) => { if (conversationId) socket.to("conversation:" + conversationId).emit("typing:start", { userId, conversationId }); });
  socket.on("typing:stop", ({ conversationId } = {}) => { if (conversationId) socket.to("conversation:" + conversationId).emit("typing:stop", { userId, conversationId }); });
  socket.on("conversation:join", ({ conversationId } = {}) => { if (conversationId) socket.join("conversation:" + conversationId); });
  socket.on("conversation:leave", ({ conversationId } = {}) => { if (conversationId) socket.leave("conversation:" + conversationId); });

  socket.on("disconnect", () => {
    const count = Math.max((onlineUsers.get(userId) || 1) - 1, 0);
    if (count === 0) { onlineUsers.delete(userId); socket.broadcast.emit("presence:offline", { userId }); }
    else onlineUsers.set(userId, count);
  });
});

app.set("io", io);

// Give the Render API service a useful root response instead of Express's
// default "Cannot GET /". The user-facing frontend is hosted on GitHub Pages.
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "SHIVASHA API",
    status: "running",
    message: "The SHIVASHA backend is online. Open the frontend to use the app.",
    frontend: "https://devops-saurabhpandey.github.io/shivasha/",
    health: "/api/health",
    api: "/api"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "SHIVASHA API",
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not-connected",
    realtime: true
  });
});

// Readiness is stricter than liveness: deployment platforms can use this
// endpoint to avoid routing traffic to an instance without its database.
app.get("/api/ready", (_req, res) => {
  const readiness = getDatabaseReadiness(mongoose.connection.readyState);
  return res.status(readiness.httpStatus).json(readiness.body);
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiAssistantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/business-ai", businessAIRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/creator-finance", creatorFinanceRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/live-videos", liveVideoRoutes);
app.use("/api/education", educationRoutes);
app.use("/api/education/quiz", educationQuizRoutes);
app.use("/api/ayurveda-ai", ayurvedaAIRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.get("/api", (_req, res) => res.json({ message: "SHIVASHA API is running" }));

async function start() {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } else {
      console.log("MONGODB_URI not configured; starting without database");
    }
    httpServer.listen(PORT, () => console.log(`SHIVASHA API listening on port ${PORT}`));
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

start();
