const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  group_name: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pet' }]
});

module.exports = mongoose.model('Group', groupSchema);
