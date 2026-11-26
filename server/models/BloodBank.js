import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  bloodGroup: { type: String, required: true },
  units: { type: Number, min: 0, default: 0 }
}, { _id: false });

const bloodBankSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  verified: { type: Boolean, default: false },
  inventory: [inventorySchema],
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('BloodBank', bloodBankSchema);
