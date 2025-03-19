import { Server } from "socket.io";
import { sendPushNotification } from "./notificationService.js";

// In-memory user socket mapping
const socketUserMap = {}; // { socketId: userId }
const userTokenMap = {}; // { userId: deviceToken }

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ["*"],
      methods: ["GET", "POST"],
    },
  });

  // Socket.io connection handler
  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    // console log total number of connections
    console.log(`Total connections: ${io.engine.clientsCount}`);

    // Authenticate user
    socket.on("authenticate", ({ userId, groupIds, deviceToken }, callback) => {
      // Store socket mapping
      socketUserMap[socket.id] = userId;

      console.log(
        `User ${userId} authenticated with socket ID: ${socket.id}, groupIds: ${groupIds}, deviceToken: ${deviceToken}`
      );

      if (deviceToken) {
        userTokenMap[userId] = deviceToken;
      }

      // Join personal room for direct messages
      socket.join(userId);

      // Join all group rooms the user is part of
      if (groupIds?.length) {
        groupIds.forEach((groupId) => {
          socket.join(groupId);
        });
      }

      // Return acknowledgment to the user
      callback({ success: true });

      console.log(`authenticated with ID: ${userId}`);
    });

    // Handle private message (one-to-one)
    socket.on("sendMessage", ({ to, message, isGroup = false }, callback) => {
      console.log(`Sending message to ${to}:`, message);
      const senderId = socketUserMap[socket.id];
      if (!senderId) return callback({ error: "User not authenticated" });

      const messageId = `m${Date.now()}`;
      const newMessage = {
        id: messageId,
        ...message,
        createdAt: new Date().toISOString(),
        senderId,
      };

      // also send this message back to the sender
      io.to(senderId).emit("newMessage", {
        to: to,
        from: senderId,
        message: newMessage,
        isGroup: isGroup,
      });

      if (isGroup) {
        // Send to all members in the group
        io.to(to).emit("newMessage", {
          from: senderId,
          message: newMessage,
          isGroup: true,
          groupId: to,
        });
      } else {
        // Send to recipient if online
        io.to(to).emit("newMessage", {
          from: senderId,
          message: newMessage,
          isGroup: false,
        });
      }

      callback({ messageId });
    });

    // Handle call event
    socket.on("sendCall", async ({ to, data }, callback) => {
      console.log(`Sending call to ${to}:`, data);
      const senderId = socketUserMap[socket.id];
      const receiverDeviceToken = userTokenMap[to];
      if (!senderId) return callback({ error: "User not authenticated" });
      if (!to) return callback({ error: "Recipient not specified" });
      if (!receiverDeviceToken)
        return callback({ error: "Device token not found" });

      // also send this message back to the sender
      // io.to(senderId).emit("newCall", {
      //   to: to,
      //   from: senderId,
      //   data,
      // });

      // Send to recipient if online
      // io.to(to).emit("newCall", {
      //   from: senderId,
      //   data,
      // });

      // Send push notification to recipient
      await sendPushNotification({
        token: receiverDeviceToken,
        title: `Incoming call from ${data.caller.name}`,
        body: "Tap to answer the call",
        data: {
          type: "CALL",
          callData: data,
          senderId: senderId.toString(),
        },
      });
      callback({ success: true });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const userId = socketUserMap[socket.id];
      if (userId) {
        delete socketUserMap[socket.id];
        console.log(`User ${userId} disconnected`);
      }
    });

    // Handle typing event
    socket.on("typing", ({ to, name, isGroup }) => {
      console.log(`User ${socket.id} is typing to ${to}, isGroup: ${isGroup}`);

      const senderId = socketUserMap[socket.id];
      if (!senderId) return;
      if (isGroup) {
        // Emit to all members in the group
        // io.to(senderId).emit("typing", {
        //   from: senderId,
        //   isGroup: true,
        //   groupId: to,
        //   name,
        // });
        io.to(to).emit("typing", {
          from: senderId,
          isGroup: true,
          groupId: to,
          name,
        });
      } else {
        // Emit to recipient if online
        // io.to(senderId).emit("typing", {
        //   from: senderId,
        //   isGroup: false,
        //   name,
        // });
        io.to(to).emit("typing", { from: senderId, isGroup: false, name });
      }
    });
  });

  return io;
}
