const { model, Schema } = require('mongoose');

const Guild = new Schema({
    _id: { type: String },
    mode: { type: String, default: 'all' },
    data: { type: Array, default: [] },
    role: { type: String },
    channel: { type: String }
});

module.exports = model('Guild_Anime_Schedule', Guild);