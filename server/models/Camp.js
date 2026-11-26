import mongoose from 'mongoose';

const campSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  organizer: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  venue: { type: String, trim: true },
  date: { type: Date, required: true },
  description: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Camp', campSchema);
