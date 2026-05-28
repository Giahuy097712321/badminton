const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  courtCount: { type: Number, required: true },
  level: { type: String, required: true },
  levels: [{ type: String }], // New array for multiple required levels
  price: { type: Number, required: true },
  maxSlots: { type: Number, required: true },
  registeredMembers: [{
    name: String,
    phone: String,
    level: String, // New field for user skill level
    levels: [{ type: String }], // New array for multiple user skill levels
    slots: { type: Number, default: 1 },
    registeredAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
