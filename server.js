const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
import { io } from "socket.io-client";

const socket = io("https://meeting-project-m008q0sj5-zakaullahs-projects-ea8fa81a.vercel.app/"); // backend URL
const app = express();
app.use(cors());

const server = http.createServer(app);

const cors = require("cors");
app.use(cors({
  origin: "*", // or your frontend URL
  methods: ["GET", "POST"]
}));

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    const rooms = {}
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // Send existing users to new user
    const otherUsers = rooms[roomId];
    socket.emit("all-users", otherUsers);

    // Add current user to room
    rooms[roomId].push(socket.id);

    console.log(`📌 ${socket.id} joined room: ${roomId}`);
    console.log("👥 Users in room:", rooms[roomId]);

    // Notify others
    socket.to(roomId).emit("user-joined", socket.id);

    // 🔁 signaling
    socket.on("sending-signal", (data) => {
      io.to(data.userId).emit("receiving-signal", {
        signal: data.signal,
        from: socket.id,
      });
    });

    socket.on("returning-signal", (data) => {
      io.to(data.to).emit("answer-signal", {
        signal: data.signal,
        from: socket.id,
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ ${socket.id} left room: ${roomId}`);

      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);

      socket.to(roomId).emit("user-left", socket.id);
    });
  });
});

server.listen(8000, () => console.log("🚀 Server running on port 8000"));