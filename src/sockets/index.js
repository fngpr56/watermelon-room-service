/**
 * Sets up Socket.IO handlers.
 * @param {import("socket.io").Server} io
 */
export function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("guest:join-room", (roomNumber) => {
      socket.join(`room:${roomNumber}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}