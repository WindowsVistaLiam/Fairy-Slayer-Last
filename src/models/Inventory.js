const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  quantity: { type: Number, default: 1, min: 1 },
  equipped: { type: Boolean, default: false },
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, unique: true, index: true },
  items: { type: [inventoryItemSchema], default: [] },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Inventory', inventorySchema);
