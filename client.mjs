// socket-client.js
import { io } from "socket.io-client";
import readline from "readline";

// Ask user for access token
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Enter your access token: ", (token) => {
  const socket = io("http://localhost:3000", {
    auth: { token }
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected to server!");
  });

  socket.on("disconnect", () => {
    console.log("[Socket] Disconnected from server");
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  // Listen to device heartbeat events
  socket.on("device-heartbeat", (data) => {
    console.log("[Heartbeat] Device:", data.deviceId, "Status:", data.status, "Time:", data.timestamp);
  });

  rl.close();
});
