import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import BloodRequest from './models/BloodRequest.js';
import BloodBank from './models/BloodBank.js';
import Camp from './models/Camp.js';
import { auth, allow } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const areas = ['Gulshan-e-Iqbal', 'North Nazimabad', 'DHA', 'Malir', 'Saddar', 'Korangi', 'PECHS', 'Clifton', 'Federal B Area', 'Nazimabad', 'Gulistan-e-Jauhar', 'Orangi Town'];

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, bloodGroup: user.bloodGroup, area: user.area, available: user.available, verified: user.verified, phone: user.phone };
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'KhoonConnect API' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient', bloodGroup, area, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!['donor', 'patient', 'bloodbank'].includes(role)) return res.status(400).json({ message: 'Invalid account type.' });
    if (role === 'donor' && (!groups.includes(bloodGroup) || !area)) return res.status(400).json({ message: 'Donor accounts need a blood group and Karachi area.' });
    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role, bloodGroup, area, phone, available: role === 'donor', verified: false });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: safeUser(user), message: 'Account created. Your details may require verification.' });
  } catch (error) { res.status(500).json({ message: 'Could not create account.', detail: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser(user), message: 'Welcome back.' });
  } catch (error) { res.status(500).json({ message: 'Could not sign in.', detail: error.message }); }
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));

app.patch('/api/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'area', 'available', 'lastDonationDate'];
    if (req.user.role === 'donor') allowed.push('bloodGroup');
    for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ user: safeUser(req.user), message: 'Profile updated.' });
  } catch (error) { res.status(400).json({ message: 'Could not update profile.', detail: error.message }); }
});

app.get('/api/donors', async (req, res) => {
  try {
    const filter = { role: 'donor', available: true };
    if (req.query.bloodGroup && groups.includes(req.query.bloodGroup)) filter.bloodGroup = req.query.bloodGroup;
    if (req.query.area) filter.area = new RegExp(String(req.query.area).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const donors = await User.find(filter).select('name bloodGroup area available verified createdAt').limit(100).sort({ verified: -1, createdAt: -1 });
    res.json({ donors, count: donors.length });
  } catch (error) { res.status(500).json({ message: 'Could not search donors.' }); }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { patientName, contactPhone, bloodGroup, units, area } = req.body;
    if (!patientName || !contactPhone || !groups.includes(bloodGroup) || !area) return res.status(400).json({ message: 'Please complete all required fields.' });
    const request = await BloodRequest.create({ ...req.body, createdBy: req.user?._id });
    res.status(201).json({ request, message: 'Request submitted for verification.' });
  } catch (error) { res.status(400).json({ message: 'Could not submit request.', detail: error.message }); }
});

app.get('/api/requests/mine', auth, async (req, res) => {
  const requests = await BloodRequest.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ requests });
});

app.get('/api/requests', auth, allow('admin', 'bloodbank'), async (req, res) => {
  const requests = await BloodRequest.find().sort({ createdAt: -1 }).limit(200);
  res.json({ requests });
});

app.patch('/api/requests/:id/status', auth, allow('admin'), async (req, res) => {
  const statuses = ['Pending', 'Under Verification', 'Verified', 'Donor Contacted', 'Fulfilled', 'Rejected'];
  if (!statuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });
  const request = await BloodRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!request) return res.status(404).json({ message: 'Request not found.' });
  res.json({ request, message: 'Request status updated.' });
});

app.get('/api/banks', async (req, res) => {
  const banks = await BloodBank.find().sort({ verified: -1, name: 1 }).limit(100);
  res.json({ banks });
});

app.post('/api/banks', auth, allow('admin', 'bloodbank'), async (req, res) => {
  try {
    const bank = await BloodBank.create({ ...req.body, verified: req.user.role === 'admin' });
    res.status(201).json({ bank, message: 'Blood bank saved.' });
  } catch (error) { res.status(400).json({ message: 'Could not save blood bank.', detail: error.message }); }
});

app.patch('/api/banks/:id/inventory', auth, allow('admin', 'bloodbank'), async (req, res) => {
  const bank = await BloodBank.findById(req.params.id);
  if (!bank) return res.status(404).json({ message: 'Blood bank not found.' });
  if (req.user.role === 'bloodbank' && req.user.area && bank.area !== req.user.area) return res.status(403).json({ message: 'You can only update your own area bank.' });
  if (!Array.isArray(req.body.inventory)) return res.status(400).json({ message: 'Inventory must be a list.' });
  bank.inventory = req.body.inventory.map(item => ({ bloodGroup: item.bloodGroup, units: Math.max(0, Number(item.units) || 0) }));
  bank.updatedAt = new Date();
  await bank.save();
  res.json({ bank, message: 'Inventory updated.' });
});

app.get('/api/camps', async (req, res) => {
  const camps = await Camp.find({ date: { $gte: new Date(Date.now() - 86400000) } }).sort({ date: 1 }).limit(100);
  res.json({ camps });
});

app.post('/api/camps', auth, allow('admin', 'bloodbank'), async (req, res) => {
  try {
    const camp = await Camp.create(req.body);
    res.status(201).json({ camp, message: 'Camp published.' });
  } catch (error) { res.status(400).json({ message: 'Could not create camp.', detail: error.message }); }
});

app.post('/api/camps/:id/register', auth, async (req, res) => {
  const camp = await Camp.findById(req.params.id);
  if (!camp) return res.status(404).json({ message: 'Camp not found.' });
  res.json({ message: 'Your interest has been recorded for this demo. Please contact the organizer to confirm attendance.' });
});

app.get('/api/stats', async (req, res) => {
  try {
    const [donors, requests, fulfilled, banks, camps] = await Promise.all([
      User.countDocuments({ role: 'donor' }), BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'Fulfilled' }), BloodBank.countDocuments(), Camp.countDocuments()
    ]);
    res.json({ donors, requests, fulfilled, banks, camps });
  } catch { res.json({ donors: 0, requests: 0, fulfilled: 0, banks: 0, camps: 0 }); }
});

app.get('/api/admin/users', auth, allow('admin'), async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(300);
  res.json({ users });
});

app.patch('/api/admin/users/:id/verify', auth, allow('admin'), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { verified: Boolean(req.body.verified) }, { new: true }).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user, message: 'Verification updated.' });
});

app.get('/api/admin/summary', auth, allow('admin'), async (req, res) => {
  const [users, requests, banks, camps] = await Promise.all([User.countDocuments(), BloodRequest.countDocuments(), BloodBank.countDocuments(), Camp.countDocuments()]);
  res.json({ users, requests, banks, camps });
});

async function bootstrap() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB connection string.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const exists = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() });
    if (!exists) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await User.create({ name: 'KhoonConnect Administrator', email: process.env.ADMIN_EMAIL, passwordHash, role: 'admin', verified: true });
      console.log('Initial admin account created from environment settings.');
    }
  }
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
  app.listen(PORT, '0.0.0.0', () => console.log(`KhoonConnect server running on port ${PORT}`));
}
bootstrap().catch(error => { console.error('Startup failed:', error); process.exit(1); });
