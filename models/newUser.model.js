const mongoose = require('mongoose');

const newUserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });

module.exports = mongoose.model('NewUser', newUserSchema);
