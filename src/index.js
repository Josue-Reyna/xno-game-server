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
                uid: socket.id.slice(0, 18) + '01',
            };
            room.maxRounds = maxRounds;
            room.players.push(player);
            room.turn = player;
            room.socketID1 = socket.id
            room = await room.save();
            const roomId = room._id.toString();
            socket.join(roomId);
            io.to(roomId).emit('createRoomSuccess', room);
        } catch (e) {
            console.log(e);
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
                    uid: socket.id.slice(0, 18) + '02',
                }
                socket.join(roomId);
                room.players.push(player);
                room.socketID2 = socket.id
                room = await room.save();
                io.to(roomId).emit('joinAuthSuccess', room);
                io.to(roomId).emit('updatePlayers', room.players);
                io.to(roomId).emit('updateRoom', room);
            } else {
                socket.emit('errorOccurred', 'Game in progress');
                return;
            }
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('joinRoom', async ({ nickname, roomId, color }) => {
        try {
            let room = await Room.findById(roomId);
            let player = room.players[1];
            let player2 = {
                nickname: nickname,
                socketID: player.socketID,
                roomId: roomId,
                playerType: player.playerType,
                color: color,
                uid: player.uid,
            }
            room.players.pop();
            room.players.push(player2);
            room.isJoin = false;
            room = await room.save();
            io.to(roomId).emit('joinRoomSuccess', room);
            io.to(roomId).emit('updatePlayers', room.players);
            io.to(roomId).emit('updateRoom', room);
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('sameDevice', async ({ color1, color2, maxRounds }) => {
        try {
            let room = new Room();
            let player1 = {
                nickname: 'X',
                socketID: socket.id,
                roomID: room._id.toString(),
                playerType: 'X',
                color: color1,
                uid: socket.id.slice(0, 18) + '01',
            };
            let player2 = {
                nickname: 'O',
                socketID: socket.id,
                roomID: room._id.toString(),
                playerType: 'O',
                color: color2,
                uid: socket.id.slice(0, 18) + '02',
            };
            room.players.push(player1);
            room.players.push(player2);
            room.maxRounds = maxRounds;
            room.turn = player1;
            const roomId = room._id.toString();
            socket.join(roomId);
            room.isJoin = false;
            room.socketID1 = socket.id
            room.socketID2 = socket.id
            room = await room.save();
            io.to(roomId).emit('sameDeviceSuccess', room);
            io.to(roomId).emit('updatePlayers', room.players);
            io.to(roomId).emit('updateRoom', room);
        } catch (e) {
            console.log(e);
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
            console.log(e);
        }
    });

    socket.on('winner', async ({ winnerId, roomId }) => {
        try {
            let room = await Room.findById(roomId);
            let player = room.players.find((_player) =>
                _player.uid == winnerId,);
            player.points += 1;
            console.log('Winner points: ', player.points);
            room = await room.save();
            if (player.points == room.maxRounds) {
                io.to(roomId).emit('endGame', player);
                socket.leave(roomId);
                room.delete();
            } else {
                io.to(roomId).emit('pointIncrease', player);
            }
        } catch (e) {
            console.log(e);
        }
    });

});


mongoose
    .set('strictQuery', false)
    .connect(DB_URI)
    .then(() => {
        console.log("Connection successful");
    }).catch((e) => {
        console.log(e);
    });

server.listen(PORT, HOST, () => {
    console.log(`Server started & running on port ${PORT}`);
});