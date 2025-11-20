const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ["expert", "pet-owner"],
    default: 'user',
  },
  privacyConsent: {
    accepted: { type: Boolean, default: false },
    acceptedAt: { type: Date },
    policyVersion: { type: String, default: "v1.0" }
  },
  pets_group: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], 
    default: [],
  },
  refreshToken: { type: String, default: null }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare input password with stored password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
