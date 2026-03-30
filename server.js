const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // your frontend port
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    socket.emit("all-users", rooms[roomId]);

    rooms[roomId].push(socket.id);

    socket.to(roomId).emit("user-joined", socket.id);
  });

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
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", socket.id);
    }
  });

});

const client = new OAuth2Client("382324523430-2pe2o55alst71p4oug0b9cgmmvo75mtb.apps.googleusercontent.com");

app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "382324523430-2pe2o55alst71p4oug0b9cgmmvo75mtb.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();

    const user = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };

    // yahan DB me save bhi kar sakte ho
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

server.listen(8000, () => console.log("🚀 Server running on port 8000"));