const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    nickname: {
        type: String,
        trim: true,
    },
    socketID: {
        type: String,
    },
    roomID: {
        type: String,
    },
    points: {
        type: Number,
        default: -1,
    },
    playerType: {
        required: true,
        type: String,
    },
    color: {
        type: Number,
    },
    uid: {
        type: String,
    }
});

module.exports = playerSchema;