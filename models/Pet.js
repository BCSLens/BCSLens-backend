const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const recordSchema = new Schema({
  date: Date,
  bcs_range: String,
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
  age_years: {
    type: Number,
    default: 0,
  },
  age_months: {
    type: Number,
    default: 0,
    min: 0,
    max: 11,
  },
  gender: String,
  spay_neuter_status: {
    type: Boolean,
    default: false
  },
  species: String,
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  records: [recordSchema],
});

module.exports = mongoose.model("Pet", petSchema);
