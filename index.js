//* The main server index includes express app, socket hub, and auth config/secret */

//TODO - Admin features/moderation/control/create rooms and manage them
//Dot env at top just to be safe
require("dotenv").config();

const PORT = process.env.PORT;

const app = require("./server/server.js");
//? Add web socket capability to express server
const http = require("http");
const server = http.createServer(app);
//? create socket server HUB
const { Server } = require("socket.io");
const io = new Server(server);
const { db } = require("./server/models/index.js");

const {
  message,
  getRoomOptions,
  deleteRoom,
  updateRoom,
  getRoomUsers,
  deleteUserInRoom,
} = require("./socketHandlers/handlerIndex.js");

// TODO When the server starts create the rooms from the database

// await axios.get(/rooms/room1/last10)
//create a feed of only the most recent messages from the database in real time
let recentMessages = {};

//pass in the socket(that connected/made a request) to each of these functions
io.on("connection", (socket) => {
  socket.onAny((event, payload) => {
    console.log("EVENT:", event, payload);
  });

  socket.on("GET_CONNECTED_USERS", (payload) => {
    // to ALL USERS -> tell me you are here
    socket.broadcast.emit("TELL ME YOU ARE HERE", {});
  });

  socket.on("I AM HERE", (username) => {
    socket.to("admins").emit("IM HERE ADMINS", username);
  });

  socket.on("join", async (payload) => {
    // let roomList = await getRoomOptions();
    // let rooms = roomList.data;
    // // this returns and array, not an object
    // let room = rooms.filter((room) => room.name === payload.room);
    // let currentRoom = room[0];

    // let today = new Date();
    // let age = today.getFullYear() - parseInt(payload.user.DOB.split("/"));
    // console.log("AGE:", age);

    // if (payload.room === "admins") {
       socket.join(payload.room);
    // }
      //  else {
      //   // check if they have permission join

    //   if (
    //     (age > currentRoom.minimumAge && age < currentRoom.maxAge) ||
    //     payload.user.username === "admin"
    //   ) {
    //     console.log("You can enter this room");
    //     socket.emit("UPDATE CURRENT ROOM", payload.room);
    //     socket.join(payload.room);
    //     console.log(`${socket.id} joined the ${payload.room} room.`);
    //   } else {
    //     console.log("you cant enter");
    //     socket.emit("ACCESS DENIED");
    //   }
});


  // when user leaves a room leave it
  socket.on("leave", (payload) => {
    socket.leave(payload);
  });

  // TODO add a user to a room
  socket.on("ADD USER TO ROOM", (payload) => {
    //TODO - update the users in the room
    let getUsersInRoom = getRoomUsers(payload, socket);
    let updatedUsers = getUsersInRoom.push(payload.user);
    let newPayload = { room: payload.room, users: updatedUsers };
    //TODO - update the room options
    let newRoomOptions = updateRoom(newPayload, socket);
    //TODO - send the updated room options to the client
    socket.emit("UPDATED ROOM OPTIONS", newRoomOptions);
  });

  //TODO - handle delete room event
  socket.on("DELETE ROOM", (payload) => {
    //TODO - delete the room from the database
    deleteRoom(payload, socket);
    //TODO - update the room options
    let roomList = getRoomOptions();
    //TODO - send the updated room options to the client
    socket.emit("UPDATED ROOMS", roomList);
  });

  //TODO - handle update room event
  socket.on("UPDATE ROOM", (payload) => {
    //TODO - update the room in the database
    let newRoomOptions = updateRoom(payload, socket);
    //TODO - send the updated room options to the client
    socket.emit("UPDATED ROOM OPTIONS", newRoomOptions);
  });

  socket.on("UPDATE ROOM NAME", (payload) => {
    socket.emit("UPDATE ROOM NAME", payload);
  });

  socket.on("UPDATE USER NAME", (payload) => {
    socket.emit("UPDATE USER NAME", payload);
  });

  /* //?----------------------------- HANDLE MESSAGES ---------------------------- */

  socket.on("MESSAGE", async (payload) => {
    // use the 'middleware'
    await message(payload, socket, recentMessages);
  });

  /* //?------------------------------- USER LOGIN ------------------------------- */

  socket.on("UPDATE USERNAME", (payload) => {
    socket.emit("UPDATE USERNAME", payload);
  });

  socket.on("UPDATE PASSWORD", (payload) => {
    socket.emit("UPDATE PASSWORD", payload);
  });

  socket.on("VERIFY USER", (payload) => {
    socket.emit("GIVE ME YOUR CREDENTIALS", {});
  });

  socket.on("HERES MY CREDENTIALS", (payload) => {
    console.log(payload);
    authenticate(payload, socket);
  });
});

//* Sync the database and start the server */

db.sync().then(() => {
  server.listen(PORT, () => {
    console.log("listening on *:", PORT);
  });
});

module.exports = server;

/* //? TODO
  socket.on("ADMIN VIEW ROOM", (payload) => {
    get the information about payload.room
    let info = await axios.get('/v1/rooms/roomName')
  })
*/
