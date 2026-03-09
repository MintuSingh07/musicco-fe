import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL;

export const socket: Socket = io(SOCKET_URL, {
    autoConnect: true,
});

socket.on("connect", () => {
    console.log("Connected to socket server:", socket.id);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
});
