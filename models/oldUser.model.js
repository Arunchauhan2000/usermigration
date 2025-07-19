const mongoose = require('mongoose');

const oldUserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });

module.exports = mongoose.model('OldUser', oldUserSchema);
