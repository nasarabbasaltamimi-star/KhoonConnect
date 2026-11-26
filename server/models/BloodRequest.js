import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
  patientName: { type: String, required: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
  units: { type: Number, min: 1, max: 20, default: 1 },
  area: { type: String, required: true, trim: true },
  hospital: { type: String, trim: true },
  neededBy: { type: Date },
  details: { type: String, maxlength: 700 },
  isEmergency: { type: Boolean, default: true },
  status: { type: String, enum: ['Pending', 'Under Verification', 'Verified', 'Donor Contacted', 'Fulfilled', 'Rejected'], default: 'Pending' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BloodRequest', bloodRequestSchema);
