// src/pages/api/socket.js
import { Server } from "socket.io";
import { createServer } from "http";
import Cors from "cors";

// Initialize CORS middleware
const cors = Cors({
  origin: "http://localhost:3000", // Replace with your deployed frontend URL
  methods: ["GET", "POST"],
});

// Create an HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("Socket.IO server is running");
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust this when deploying
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("New client connected");

  // Find an available room or create a new one
  let joinedRoom = null;
  for (const [roomId, players] of rooms.entries()) {
    if (players.length === 1) {
      joinedRoom = roomId;
      players.push(socket.id);
      break;
    }
  }
  if (!joinedRoom) {
    joinedRoom = `room-${rooms.size + 1}`;
    rooms.set(joinedRoom, [socket.id]);
  }
  socket.join(joinedRoom);

  // Emit the joinedRoom event to the client
  console.log(`Client ${socket.id} joined room ${joinedRoom}`);
  socket.emit("joinedRoom", { room: joinedRoom, players: rooms.get(joinedRoom) });

  const players = rooms.get(joinedRoom);
  if (players.length === 2) {
    io.to(joinedRoom).emit("start");
  }

  socket.on("move", (data) => {
    socket.to(joinedRoom).emit("move", data);
  });

  socket.on("gameOver", (data) => {
    socket.to(joinedRoom).emit("gameOver", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    const players = rooms.get(joinedRoom);
    players.splice(players.indexOf(socket.id), 1);
    if (players.length === 0) {
      rooms.delete(joinedRoom);
    }
  });
});

// Export the server as a function to be used by Vercel
export default (req, res) => {
  cors(req, res, () => {
    // Check for the WebSocket upgrade request
    if (req.method === "GET" && req.headers.upgrade === "websocket") {
      // Upgrade to WebSocket
      return server(req, res);
    } else {
      // Handle other HTTP requests
      return res.status(200).send("Socket.IO API");
    }
  });
};
