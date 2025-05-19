const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordSchema = new Schema({
  date: Date,
  score: Number,
  weight: Number,
  front_image_url: String,
  back_image_url: String,
  left_image_url: String,
  right_image_url: String,
  top_image_url: String,
});

const petSchema = new Schema({
  name: String,
  breed: String,
  age: Number,
  gender: String,
  spay_neuter_status: String,
  species: String,
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  records: [recordSchema]
});

module.exports = mongoose.model('Pet', petSchema);
