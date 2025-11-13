// server.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();

// 🔑 MongoDB connection string
const MONGODB_URI =
  'mongodb+srv://javalagipranav80_db_user:kYX6lFTeGpT4hWXs@talyexp.n6moi6k.mongodb.net/?retryWrites=true&w=majority&appName=TALYEXP';

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(bodyParser.json());

// ✅ Serve static frontend files (index.html, JS, CSS, etc.)
app.use(express.static(path.join(__dirname)));

// ===============================
// 📦 Schemas & Models
// ===============================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  passwordHash: String,
});

const expenseSchema = new mongoose.Schema({
  user: String,
  title: String,
  amount: Number,
  date: { type: Date },
  category: String,
  created: { type: Date, default: Date.now },
});

const savingSchema = new mongoose.Schema({
  user: String,
  title: String,
  amount: Number,
  monthKey: String, // "YYYY-MM"
  created: { type: Date, default: Date.now },
});

// --- UPDATE: New Schema for Pending Returns ---
const pendingReturnSchema = new mongoose.Schema({
    user: String,
    personName: String,
    amount: Number,
    date: { type: Date },
    paymentMode: String,
    created: { type: Date, default: Date.now },
});

// --- NEW: Schema for Payables (Amount to be given) ---
const payableSchema = new mongoose.Schema({
    user: String,
    personName: String,
    amount: Number,
    date: { type: Date }, // Due date
    paymentMode: String,
    created: { type: Date, default: Date.now },
});
// --- END NEW ---

const incomeSchema = new mongoose.Schema({
  user: String,
  monthKey: String,
  income: Number,
});

const metaSchema = new mongoose.Schema({
  user: String,
  startTs: Number,
  lastExport: String,
});

const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Saving = mongoose.model('Saving', savingSchema);
const PendingReturn = mongoose.model('PendingReturn', pendingReturnSchema); // --- UPDATE ---
const Payable = mongoose.model('Payable', payableSchema); // --- NEW ---
const Income = mongoose.model('Income', incomeSchema);
const Meta = mongoose.model('Meta', metaSchema);

// ===============================
// 👤 Auth Routes
// ===============================
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const lower = String(username || '').trim().toLowerCase();
    if (!lower || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const existing = await User.findOne({ username: lower });
    if (existing)
      return res.status(400).json({ error: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    await new User({ username: lower, passwordHash }).save();
    await new Meta({ user: lower, startTs: Date.now(), lastExport: '' }).save();
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const lower = String(username || '').trim().toLowerCase();
    const user = await User.findOne({ username: lower });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE: Added Reset Password Endpoint ---
app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const lower = String(username || '').trim().toLowerCase();
        if (!lower || !newPassword)
            return res.status(400).json({ error: 'Username and new password required' });

        const user = await User.findOne({ username: lower });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        
        // In a real app, we'd validate a token, but here we just reset
        const passwordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = passwordHash;
        await user.save();
        
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- END UPDATE ---

// ===============================
// 💰 Expense Routes
// ===============================
app.get('/api/expenses/:user', async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.params.user }).sort({
      created: -1,
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { user, title, amount, date, category } = req.body;
    const parsedDate = new Date(date);

    const expense = new Expense({
      user,
      title,
      amount,
      date: isNaN(parsedDate) ? new Date() : parsedDate,
      category,
    });

    await expense.save();
    res.json({ message: 'Expense added successfully', id: expense._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    if (update.date) update.date = new Date(update.date);
    await Expense.findByIdAndUpdate(id, update, { new: true });
    res.json({ message: 'Expense updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/user/:user', async (req, res) => {
  try {
    await Expense.deleteMany({ user: req.params.user });
    res.json({ message: 'All expenses deleted for user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 💾 Saving Routes
// ===============================
app.get('/api/savings/:user', async (req, res) => {
  try {
    const savings = await Saving.find({ user: req.params.user }).sort({
      created: -1,
    });
    res.json(savings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/savings', async (req, res) => {
  try {
    const { user, title, amount, monthKey } = req.body;
    const saving = new Saving({
      user,
      title,
      amount,
      monthKey,
    });
    await saving.save();
    res.json({ message: 'Saving added successfully', id: saving._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- UPDATE: Added Delete Saving by ID ---
app.delete('/api/savings/:id', async (req, res) => {
    try {
        await Saving.findByIdAndDelete(req.params.id);
        res.json({ message: 'Saving deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- END UPDATE ---

app.delete('/api/savings/user/:user', async (req, res) => {
  try {
    await Saving.deleteMany({ user: req.params.user });
    res.json({ message: 'All savings deleted for user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ↩️ Pending Returns Routes (NEW)
// ===============================
app.get('/api/returns/:user', async (req, res) => {
    try {
        const returns = await PendingReturn.find({ user: req.params.user }).sort({
            date: -1,
        });
        res.json(returns);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/returns', async (req, res) => {
    try {
        const { user, personName, amount, date, paymentMode } = req.body;
        const parsedDate = new Date(date);
        const newReturn = new PendingReturn({
            user,
            personName,
            amount,
            date: isNaN(parsedDate) ? new Date() : parsedDate,
            paymentMode,
        });
        await newReturn.save();
        res.json({ message: 'Return added successfully', id: newReturn._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/returns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body || {};
        if (update.date) update.date = new Date(update.date);
        await PendingReturn.findByIdAndUpdate(id, update, { new: true });
        res.json({ message: 'Return updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/returns/:id', async (req, res) => {
    try {
        await PendingReturn.findByIdAndDelete(req.params.id);
        res.json({ message: 'Return marked as received (deleted)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/returns/user/:user', async (req, res) => {
    try {
        await PendingReturn.deleteMany({ user: req.params.user });
        res.json({ message: 'All returns deleted for user' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// 💳 Payables Routes (NEW)
// ===============================
app.get('/api/payables/:user', async (req, res) => {
    try {
        const payables = await Payable.find({ user: req.params.user }).sort({
            date: -1, // Sort by due date
        });
        res.json(payables);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/payables', async (req, res) => {
    try {
        const { user, personName, amount, date, paymentMode } = req.body;
        const parsedDate = new Date(date);
        const newPayable = new Payable({
            user,
            personName,
            amount,
            date: isNaN(parsedDate) ? new Date() : parsedDate,
            paymentMode,
        });
        await newPayable.save();
        res.json({ message: 'Payable added successfully', id: newPayable._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/payables/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body || {};
        if (update.date) update.date = new Date(update.date);
        await Payable.findByIdAndUpdate(id, update, { new: true });
        res.json({ message: 'Payable updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/payables/:id', async (req, res) => {
    try {
        await Payable.findByIdAndDelete(req.params.id);
        res.json({ message: 'Payable marked as paid (deleted)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/payables/user/:user', async (req, res) => {
    try {
        await Payable.deleteMany({ user: req.params.user });
        res.json({ message: 'All payables deleted for user' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ===============================
// 📆 Income Routes
// ===============================
app.post('/api/income', async (req, res) => {
  try {
    const { user, monthKey, income } = req.body;
    let rec = await Income.findOne({ user, monthKey });
    if (rec) {
      rec.income = income;
      await rec.save();
    } else {
      await new Income({ user, monthKey, income }).save();
    }
    res.json({ message: 'Income saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/income/:user', async (req, res) => {
  try {
    const data = await Income.find({ user: req.params.user });
    res.json(data);
  } catch (err)
 {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/income/user/:user', async (req, res) => {
  try {
    await Income.deleteMany({ user: req.params.user });
    res.json({ message: 'All income deleted for user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🧾 Meta Routes
// ===============================
app.get('/api/meta/:user', async (req, res) => {
  try {
    const meta = await Meta.findOne({ user: req.params.user });
    if (!meta)
      return res.json({
        user: req.params.user,
        startTs: Date.now(),
        lastExport: '',
      });
    res.json(meta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meta', async (req, res) => {
  try {
    const { user, startTs, lastExport } = req.body;
    let meta = await Meta.findOne({ user });
    if (meta) {
      if (typeof startTs === 'number') meta.startTs = startTs;
      if (typeof lastExport === 'string') meta.lastExport = lastExport;
      await meta.save();
    } else {
      await new Meta({ user, startTs, lastExport }).save();
    }
    res.json({ message: 'Meta updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/meta/reset', async (req, res) => {
  try {
    const { user } = req.body;
    // --- UPDATE: Also delete PendingReturns and Payables on reset ---
    await PendingReturn.deleteMany({ user: user });
    await Payable.deleteMany({ user: user }); // --- NEW ---
    // --- END UPDATE ---
    
    let meta = await Meta.findOne({ user });
    if (!meta) {
      meta = new Meta({ user, startTs: Date.now(), lastExport: '' });
    } else {
      meta.startTs = Date.now();
      meta.lastExport = '';
    }
    await meta.save();
    res.json({ message: 'Meta reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🌐 Serve Frontend (React/HTML)
// ===============================
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname,'index.html'));
});

// ===============================
// 🚀 Start Server
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
