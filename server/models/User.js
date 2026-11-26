import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['donor', 'patient', 'bloodbank', 'admin'], default: 'patient' },
  phone: { type: String, trim: true, maxlength: 30 },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  area: { type: String, trim: true },
  available: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  lastDonationDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
