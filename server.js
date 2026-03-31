const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");

const app = express();
app.use(cors());
app.use(express.json());

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
// In-memory user storage
const users = [];

// ─── Signup Route ─────────────────────
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash password
  // const hashedPassword = await bcrypt.hash(password, 10);

  // Save user in memory
  const newUser = { name, email, password: password };
  users.push(newUser);

  res.status(201).json({
    message: "User created successfully",
    user: { name: newUser.name, email: newUser.email }
  });
});
// ─── Login Route (Optional) ───────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid password" });

  res.status(200).json({ message: `Welcome ${user.name}!` });
});

server.listen(8000, () => console.log("🚀 Server running on port 8000"));