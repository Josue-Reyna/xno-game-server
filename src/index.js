const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { PORT, HOST, DB_URI } = require('./config.js');

const app = express();
var server = http.createServer(app);
const Room = require('./models/room');

var io = require("socket.io")(server);

app.use(express.json());

io.on("connection", (socket) => {

    socket.on('createRoom', async ({ nickname, color, maxRounds }) => {
        try {
            let room = new Room();
            let player = {
                socketID: socket.id,
                roomID: room._id.toString(),
                nickname,
                playerType: 'X',
                color: color,
            };
            room.maxRounds = maxRounds;
            room.players.push(player);
            room.turn = player;
            room.socketID1 = socket.id.toString();
            room = await room.save();
            const roomId = room._id.toString();
            socket.join(roomId);
            io.to(roomId).emit('createRoomSuccess', room);
        } catch (e) {
            console.log('Create Room Error: ' + e);
        }
    });

    socket.on('joinAuth', async (roomId) => {
        try {
            if (!roomId.match(/^[0-9a-fA-F]{24}$/)) {
                socket.emit(
                    'errorOccurred',
                    'Please enter a valid room id');
                return;
            }
            let room = await Room.findById(roomId);
            if (room.isJoin) {
                let player = {
                    socketID: socket.id,
                    roomID: roomId,
                    playerType: 'O',
                }
                socket.join(roomId);
                room.players.push(player);
                room.socketID2 = socket.id.toString();
                room = await room.save();
                io.to(roomId).emit('joinAuthSuccess', room);
                io.to(roomId).emit('updatePlayers', room.players);
                io.to(roomId).emit('updateRoom', room);
            } else {
                socket.emit('errorOccurred', `Game in progress`);
                return;
            }
        } catch (e) {
            console.log('Join Auth Error: ' + e);
        }
    });

    socket.on('joinRoom', async ({ nickname, roomId, color }) => {
        try {
            let room = await Room.findById(roomId);
            let player = room.players[1];
            let player2 = {
                nickname: nickname,
                socketID: player.socketID,
                roomID: roomId,
                playerType: player.playerType,
                color: color,
            }
            room.players.pop();
            room.players.push(player2);
            room.isJoin = false;
            room = await room.save();
            io.to(roomId).emit('joinRoomSuccess', room);
            io.to(roomId).emit('updatePlayers', room.players);
            io.to(roomId).emit('updateRoom', room);
        } catch (e) {
            console.log('Join Room Error: ' + e);
        }
    });

    socket.on('tap', async ({ index, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            let choice = room.turn.playerType;
            if (room.turnIndex == 0) {
                room.turn = room.players[1];
                room.turnIndex = 1;
            } else {
                room.turn = room.players[0];
                room.turnIndex = 0;
            }
            room = await room.save();
            io.to(roomId).emit("tapped", {
                index,
                choice,
                room,
            });
        } catch (e) {
            console.log('Tap Error: ' + e);
        }
    });

    socket.on('winner', async ({ winnerId, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            let player = room.players.find((_player) =>
                _player.socketID == winnerId);
            player.points += 1;
            room = await room.save();
            if (player.points == room.maxRounds) {
                io.to(roomId).emit('endGame', player);
            } else {
                io.to(roomId).emit('pointIncrease', player);
            }
        } catch (e) {
            console.log('Winner Error: ' + e);
        }
    });

    socket.on('again', async (roomId) => {
        try {
            let room = await Room.findById(roomId);
            var playerTurn;
            if (room.players[0].points == room.maxRounds) {
                playerTurn = 1;
            } else {
                playerTurn = 0;
            }
            room.players[0].points = 0
            room.players[1].points = 0;
            room.turn = room.players[playerTurn];
            room.turnIndex = playerTurn;
            room = await room.save();
            io.to(roomId).emit('againSuccess', room);
            io.to(roomId).emit('updatePlayers', room.players);
            io.to(roomId).emit('updateRoom', room);
        } catch (e) {
            console.log('Again Error: ' + e);
        }
    });

    socket.on('disconnect', async () => {
        try {
            let socketID = socket.id;
            socketID = socketID.toString();
            let room = await Room.findOne({ socketID1: socketID });
            if (room == null) {
                room = await Room.findOne({ socketID2: socketID });
            }
            if (room.socketID1.toString() == room.socketID2.toString()) {
                socket.leave(room._id);
                room.delete();
                return;
            }
            if (room.players.length == 1) {
                room.delete();
                return;
            }
            let otherPlayer = room.players.find((_player) =>
                _player.socketID == socket.id.toString());
            let player = room.players.find((_player) =>
                _player.socketID != socket.id.toString());
            socket.leave(room._id);
            let playerNew = {
                nickname: player.nickname,
                socketID: player.socketID,
                roomID: player.roomID,
                playerType: 'X',
                color: player.color,
            }
            room.players.pop();
            room.players.pop();
            room.players.push(playerNew);
            room.turnIndex = 0;
            room.turn = playerNew;
            room.isJoin = true;
            room = await room.save();
            io.to(room._id).emit('exitSuccess',
                `${otherPlayer.nickname} leave the game`,
            );
            io.to(room._id).emit('updateRoom', room);
        } catch (e) {
            console.log('Disconnect Error: ' + e);
        }
    });
});


mongoose
    .set('strictQuery', false)
    .connect(DB_URI)
    .then(() => {
        console.log("Connection successful");
    }).catch((e) => {
        console.log('Connection Error: ' + e);
    });

server.listen(PORT, HOST, () => {
    console.log(`Server started & running`);
});