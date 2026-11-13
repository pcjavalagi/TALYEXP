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

// --- Schema for Keep Notes ---
const noteSchema = new mongoose.Schema({
    user: String,
    title: String,
    content: String,
    created: { type: Date, default: Date.now },
});

// --- Schema for Pending Returns ---
const pendingReturnSchema = new mongoose.Schema({
    user: String,
    personName: String,
    amount: Number,
    date: { type: Date },
    paymentMode: String,
    created: { type: Date, default: Date.now },
});

// --- Schema for Payables (Amount to be given) ---
const payableSchema = new mongoose.Schema({
    user: String,
    personName: String,
    amount: Number,
    date: { type: Date }, // Due date
    paymentMode: String,
    created: { type: Date, default: Date.now },
});

// --- Schema for Contact Form Submissions ---
const contactSchema = new mongoose.Schema({
    user: String, // The user who is logged in
    name: String,
    phone: String,
    email: String,
    query: String,
    created: { type: Date, default: Date.now },
});

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

const recurringItemSchema = new mongoose.Schema({
    user: String,
    title: String,
    amount: Number,
    category: String,
    type: String, // 'Expense' or 'Saving'
    dayOfMonth: Number, // 1-31
    created: { type: Date, default: Date.now },
});

// --- NEW: Schema for Future Planner Saved Cards ---
const futurePlanSchema = new mongoose.Schema({
    user: String,
    inputs: {
        fv: Number, // Future Value Goal
        t: Number,  // Time (Years)
        r: Number,  // Rate
        n: Number   // Frequency
    },
    results: {
        monthlyContrib: Number,
        totalInterest: Number,
        totalPrincipal: Number,
        incomePercent: Number,
        // We store the full schedule array so we can redraw charts/tables
        schedule: Array 
    },
    graph: Object, // Store graph data structure
    created: { type: Date, default: Date.now }
});

// Define Models
const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Saving = mongoose.model('Saving', savingSchema);
const Note = mongoose.model('Note', noteSchema);
const PendingReturn = mongoose.model('PendingReturn', pendingReturnSchema);
const Payable = mongoose.model('Payable', payableSchema);
const Contact = mongoose.model('Contact', contactSchema);
const RecurringItem = mongoose.model('RecurringItem', recurringItemSchema);
const Income = mongoose.model('Income', incomeSchema);
const Meta = mongoose.model('Meta', metaSchema);
const FuturePlan = mongoose.model('FuturePlan', futurePlanSchema); // NEW Model

// ===============================
// 👤 Auth & Account Routes
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

    // Auto-ensure dummy data is loaded if logging in as dummytest
    if (lower === 'dummytest') {
      const expCount = await Expense.countDocuments({ user: 'dummytest' });
      if (expCount < 40) {
        await seedDummy(true);
      }
    }

    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        const lower = String(username || '').trim().toLowerCase();
        if (!lower || !newPassword)
            return res.status(400).json({ error: 'Username and new password required' });

        const user = await User.findOne({ username: lower });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        
        const passwordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = passwordHash;
        await user.save();
        
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Delete Account Endpoint ---
app.post('/api/account/delete', async (req, res) => {
  try {
    const { username, password } = req.body;
    const lower = String(username || '').trim().toLowerCase();

    // 1. Verify User Exists
    const user = await User.findOne({ username: lower });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Verify Password
    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // 3. Delete Data from All Collections (Updated to include FuturePlans)
    await Promise.all([
        User.deleteOne({ username: lower }), 
        Meta.deleteOne({ user: lower }),     
        Expense.deleteMany({ user: lower }), 
        Income.deleteMany({ user: lower }),  
        Saving.deleteMany({ user: lower }),  
        PendingReturn.deleteMany({ user: lower }), 
        Payable.deleteMany({ user: lower }), 
        Note.deleteMany({ user: lower }),    
        Contact.deleteMany({ user: lower }),  
        RecurringItem.deleteMany({ user: lower }),
        FuturePlan.deleteMany({ user: lower }) // NEW: Delete saved plans
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error("Delete Account Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ===============================
// 🚀 Future Planner Routes (NEW)
// ===============================
app.get('/api/futureplans/:user', async (req, res) => {
    try {
        const plans = await FuturePlan.find({ user: req.params.user }).sort({ created: -1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/futureplans', async (req, res) => {
    try {
        const { user, inputs, results, graph } = req.body;
        const newPlan = new FuturePlan({
            user,
            inputs,
            results,
            graph
        });
        await newPlan.save();
        res.json({ message: 'Plan saved successfully', id: newPlan._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/futureplans/:id', async (req, res) => {
    try {
        await FuturePlan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plan deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// 🔁 Recurring Item Routes
// ===============================
app.get('/api/recurring/:user', async (req, res) => {
    try {
        const items = await RecurringItem.find({ user: req.params.user }).sort({
            created: -1,
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/recurring', async (req, res) => {
    try {
        const { user, title, amount, category, type, dayOfMonth } = req.body;
        const newItem = new RecurringItem({
            user,
            title,
            amount,
            category,
            type,
            dayOfMonth,
        });
        await newItem.save();
        res.json({ message: 'Recurring item added successfully', id: newItem._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/recurring/:id', async (req, res) => {
    try {
        await RecurringItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Recurring item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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
        const result = await Expense.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid transaction ID format sent to server.' });
        }
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

app.put('/api/savings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = req.body || {};
        await Saving.findByIdAndUpdate(id, update, { new: true });
        res.json({ message: 'Saving updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/savings/:id', async (req, res) => {
    try {
        await Saving.findByIdAndDelete(req.params.id);
        res.json({ message: 'Saving deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/savings/user/:user', async (req, res) => {
  try {
    await Saving.deleteMany({ user: req.params.user });
    res.json({ message: 'All savings deleted for user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// ↩️ Pending Returns Routes
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
// 📝 Notes Routes
// ===============================
app.post('/api/notes', async (req, res) => {
    try {
        const { user, title, content } = req.body;
        if (!user || !title || !content) {
            return res.status(400).json({ error: 'Missing required fields for note.' });
        }
        const newNote = new Note({ user, title, content });
        await newNote.save();
        res.status(201).json(newNote);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notes/user/:user', async (req, res) => {
    try {
        const notes = await Note.find({ user: req.params.user }).sort({ created: -1 });
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const result = await Note.deleteOne({ _id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notes/user/:user', async (req, res) => {
    try {
        await Note.deleteMany({ user: req.params.user });
        res.json({ message: 'All notes cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===============================
// 💳 Payables Routes
// ===============================
app.get('/api/payables/:user', async (req, res) => {
    try {
        const payables = await Payable.find({ user: req.params.user }).sort({
            date: -1,
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
// ✉️ Contact Form Route
// ===============================
app.post('/api/contact', async (req, res) => {
    try {
        const { user, name, phone, email, query } = req.body;
        if (!user || !name || !phone) {
            return res.status(400).json({ error: 'User, Name, and Phone are required.' });
        }
        const newSubmission = new Contact({
            user,
            name,
            phone,
            email,
            query,
        });
        await newSubmission.save();
        res.json({ message: 'Contact submission received successfully!' });
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
    
    // Reset all transaction data, but keep account existence
    await Expense.deleteMany({ user: user });
    await Income.deleteMany({ user: user });
    await Saving.deleteMany({ user: user });
    await PendingReturn.deleteMany({ user: user });
    await Payable.deleteMany({ user: user });
    await Note.deleteMany({ user: user });
    await RecurringItem.deleteMany({ user: user });
    await FuturePlan.deleteMany({ user: user }); // Reset Future Plans too
    
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
// 🌱 Seed Dummy Data Endpoint
// ===============================
app.post('/api/seed-dummy', async (req, res) => {
  try {
    await seedDummy(true);
    res.json({ message: 'Dummy data seeded successfully' });
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
// 🌱 Helper to calculate Future Plan Data (Matching fut_amount_calc.html)
// ===============================
function generateFuturePlanData(fv, p, income, t, r, n) {
  const r_dec = r / 100;
  const periodRate = r_dec / n;
  const totalPeriods = t * n;

  const fv_p = p * Math.pow(1 + periodRate, totalPeriods);
  const remaining_fv = fv - fv_p;

  let pmt = 0;
  if (remaining_fv > 0) {
    if (periodRate === 0) pmt = remaining_fv / totalPeriods;
    else pmt = remaining_fv / ((Math.pow(1 + periodRate, totalPeriods) - 1) / periodRate);
  }

  const monthlyContrib = (pmt * n) / 12;
  const annualContrib = monthlyContrib * 12;
  const incomePercent = (annualContrib / income) * 100;

  let schedule = [];
  let balance = p;
  let totalInvested = p;
  let totalInterest = 0;

  let annualLabels = ['Year 0'];
  let annualInvested = [p];
  let annualInterestOnly = [0];
  let annualBalance = [p];

  let monthlyLabels = ['Start'];
  let monthlyInvested = [p];
  let monthlyBalance = [p];

  let globalPeriodCounter = 0;

  for (let year = 1; year <= t; year++) {
    let yStart = balance;
    let yInterest = 0;
    let yContrib = 0;
    let periods = [];

    for (let pd = 1; pd <= n; pd++) {
      globalPeriodCounter++;
      const interest = balance * periodRate;
      let contrib = pmt;

      if (balance + interest + contrib > fv) {
        contrib = Math.max(0, fv - (balance + interest));
      }

      balance += interest + contrib;
      yInterest += interest;
      yContrib += contrib;
      totalInterest += interest;
      totalInvested += contrib;

      periods.push({
        label: n === 12 ? `Month ${(year - 1) * 12 + pd}` : `Period ${globalPeriodCounter}`,
        start: balance - contrib - interest,
        contrib: contrib,
        interest: interest,
        end: balance,
      });

      monthlyLabels.push(n === 12 ? `M${(year - 1) * 12 + pd}` : `P${globalPeriodCounter}`);
      monthlyInvested.push(totalInvested);
      monthlyBalance.push(balance);

      if (balance >= fv) break;
    }

    annualLabels.push(`Year ${year}`);
    annualInvested.push(totalInvested);
    annualInterestOnly.push(balance - totalInvested);
    annualBalance.push(balance);

    schedule.push({
      year: year,
      periods: periods,
      summary: { start: yStart, contrib: yContrib, interest: yInterest, end: balance },
    });

    if (balance >= fv) break;
  }

  return {
    inputs: { fv, t, r, n },
    results: { monthlyContrib, totalInterest, totalPrincipal: totalInvested, incomePercent, schedule },
    graph: {
      annual: {
        labels: annualLabels,
        invested: annualInvested,
        interest: annualInterestOnly,
        balance: annualBalance,
      },
      monthly: {
        labels: monthlyLabels,
        invested: monthlyInvested,
        balance: monthlyBalance,
      },
    },
  };
}

// ===============================
// 🌱 Auto-Seed Dummy Test Account
// ===============================
async function seedDummy(force = false) {
  try {
    const username = 'dummytest';
    const password = 'Dummy@12345';

    let user = await User.findOne({ username });
    const passwordHash = await bcrypt.hash(password, 10);
    if (!user) {
      await new User({ username, passwordHash }).save();
      await new Meta({ user: username, startTs: Date.now(), lastExport: '' }).save();
    } else {
      user.passwordHash = passwordHash;
      await user.save();
    }

    // Check if full dummy data already exists (unless force is requested)
    if (!force) {
      const expCount = await Expense.countDocuments({ user: username });
      const savCount = await Saving.countDocuments({ user: username });
      const planCount = await FuturePlan.countDocuments({ user: username });
      const recurCount = await RecurringItem.countDocuments({ user: username });
      const noteCount = await Note.countDocuments({ user: username });
      const retCount = await PendingReturn.countDocuments({ user: username });
      const payCount = await Payable.countDocuments({ user: username });

      if (
        expCount >= 48 &&
        savCount >= 48 &&
        planCount >= 6 &&
        recurCount >= 6 &&
        noteCount >= 6 &&
        retCount >= 6 &&
        payCount >= 6
      ) {
        console.log('✔ Complete dummy data already exists for ' + username);
        return;
      }
    }

    console.log('🌱 Seeding 8 months of comprehensive dummy data for ' + username + '...');

    // Clear previous dummytest data for a clean, consistent experience
    await Promise.all([
      Expense.deleteMany({ user: username }),
      Saving.deleteMany({ user: username }),
      Income.deleteMany({ user: username }),
      PendingReturn.deleteMany({ user: username }),
      Payable.deleteMany({ user: username }),
      Note.deleteMany({ user: username }),
      RecurringItem.deleteMany({ user: username }),
      FuturePlan.deleteMany({ user: username }),
    ]);

    // Build the 8-month timeline ending at the current month
    const now = new Date();
    const months = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      months.push({ year, month, monthKey });
    }

    let expenses = [];
    let savings = [];
    let incomes = [];

    // 1. Expenses & 2. Savings & 3. Incomes across all 8 months (6 items per section per month)
    months.forEach((m, idx) => {
      // 6 Expenses per month with varied amounts and realistic categories
      expenses.push(
        {
          user: username,
          title: 'Supermarket Grocery Shopping',
          amount: 3200 + ((idx * 85) % 400),
          category: 'Groceries',
          date: new Date(m.year, m.month, 4),
          created: new Date(m.year, m.month, 4),
        },
        {
          user: username,
          title: 'Dinner at Barbeque Nation',
          amount: 1850 + ((idx * 95) % 350),
          category: 'Food',
          date: new Date(m.year, m.month, 8),
          created: new Date(m.year, m.month, 8),
        },
        {
          user: username,
          title: 'Electricity & Water Utility Bill',
          amount: 1650 + ((idx * 60) % 250),
          category: 'Bills',
          date: new Date(m.year, m.month, 14),
          created: new Date(m.year, m.month, 14),
        },
        {
          user: username,
          title: 'Petrol & Fuel Refill',
          amount: 2200 + ((idx * 75) % 300),
          category: 'Transport',
          date: new Date(m.year, m.month, 19),
          created: new Date(m.year, m.month, 19),
        },
        {
          user: username,
          title: 'Amazon Essentials & Electronics',
          amount: 3100 + ((idx * 110) % 500),
          category: 'Shopping',
          date: new Date(m.year, m.month, 23),
          created: new Date(m.year, m.month, 23),
        },
        {
          user: username,
          title: 'Weekend Movie & IMAX Experience',
          amount: 950 + ((idx * 45) % 200),
          category: 'Entertainment',
          date: new Date(m.year, m.month, 27),
          created: new Date(m.year, m.month, 27),
        }
      );

      // 6 Savings per month
      savings.push(
        { user: username, title: 'Nifty 50 Index Mutual Fund SIP', amount: 5000, monthKey: m.monthKey, created: new Date(m.year, m.month, 5) },
        { user: username, title: 'HDFC Flexi Cap Equity Fund', amount: 3000, monthKey: m.monthKey, created: new Date(m.year, m.month, 5) },
        { user: username, title: 'Emergency Liquid Reserve Fund', amount: 4000, monthKey: m.monthKey, created: new Date(m.year, m.month, 7) },
        { user: username, title: 'Public Provident Fund (PPF)', amount: 2500, monthKey: m.monthKey, created: new Date(m.year, m.month, 10) },
        { user: username, title: 'Sovereign Gold Bond / ETF', amount: 2000, monthKey: m.monthKey, created: new Date(m.year, m.month, 12) },
        { user: username, title: 'High-Interest Recurring Deposit', amount: 3500, monthKey: m.monthKey, created: new Date(m.year, m.month, 15) }
      );

      // Monthly Income
      incomes.push({
        user: username,
        monthKey: m.monthKey,
        income: 80000 + (idx * 1000),
      });
    });

    // 4. 6 Pending Returns (Lent / To be taken)
    const returns = [
      { user: username, personName: 'Rahul Sharma', amount: 4500, date: new Date(Date.now() - 5 * 86400000), paymentMode: 'UPI (Google Pay)', created: new Date() },
      { user: username, personName: 'Priya Patel', amount: 2200, date: new Date(Date.now() - 9 * 86400000), paymentMode: 'PhonePe', created: new Date() },
      { user: username, personName: 'Amit Kumar', amount: 6000, date: new Date(Date.now() - 14 * 86400000), paymentMode: 'Cash', created: new Date() },
      { user: username, personName: 'Sneha Rao', amount: 1800, date: new Date(Date.now() - 20 * 86400000), paymentMode: 'UPI (Paytm)', created: new Date() },
      { user: username, personName: 'Vikram Singh', amount: 3500, date: new Date(Date.now() - 26 * 86400000), paymentMode: 'Net Banking', created: new Date() },
      { user: username, personName: 'Rajesh Verma', amount: 2500, date: new Date(Date.now() - 32 * 86400000), paymentMode: 'UPI', created: new Date() },
    ];

    // 5. 6 Payables (To be returned / To pay)
    const payables = [
      { user: username, personName: 'Apartment Society Maintenance', amount: 3500, date: new Date(Date.now() + 3 * 86400000), paymentMode: 'Bank Transfer', created: new Date() },
      { user: username, personName: 'Karan Verma (Weekend Trip Split)', amount: 2000, date: new Date(Date.now() + 6 * 86400000), paymentMode: 'UPI', created: new Date() },
      { user: username, personName: 'Car Service Center', amount: 5200, date: new Date(Date.now() + 10 * 86400000), paymentMode: 'Credit Card', created: new Date() },
      { user: username, personName: 'Office Team Lunch Pool', amount: 1250, date: new Date(Date.now() + 14 * 86400000), paymentMode: 'UPI (GPay)', created: new Date() },
      { user: username, personName: 'Neha Gupta (Shared Equipment)', amount: 1800, date: new Date(Date.now() + 18 * 86400000), paymentMode: 'Cash', created: new Date() },
      { user: username, personName: 'Broadband Quarterly Bill', amount: 2399, date: new Date(Date.now() + 22 * 86400000), paymentMode: 'Net Banking', created: new Date() },
    ];

    // 6. 6 Notes
    const notes = [
      {
        user: username,
        title: '2026 Wealth & Investment Strategy',
        content: 'Target allocating 50% in broad-market index funds, 25% in liquid/debt reserves, 15% in sovereign gold, and 10% in high-conviction growth stocks. Review semi-annually.',
        created: new Date(),
      },
      {
        user: username,
        title: 'Tax Planning & Section 80C Review',
        content: 'Maximize ₹1,50,000 deduction under 80C through ELSS tax-saver mutual funds and PPF contributions. Submit medical insurance health checkup receipts for Section 80D.',
        created: new Date(),
      },
      {
        user: username,
        title: 'Emergency Fund Milestone Achieved',
        content: 'Successfully built 6 months of mandatory living expenses reserve (₹2,50,000) maintained in instant-access high-yield liquid funds.',
        created: new Date(),
      },
      {
        user: username,
        title: 'Annual Vacation Planning Budget',
        content: 'Budget allocated: ₹55,000 for family year-end trip. ₹18,000 advance paid for flights, ₹15,000 for boutique resort. Balance reserved for local dining and tours.',
        created: new Date(),
      },
      {
        user: username,
        title: 'Subscription & Recurring Audit',
        content: 'Conducted bi-annual subscription check: Cancelled redundant gym streaming app. Switched music and OTT to annual family bundles saving ₹850 monthly.',
        created: new Date(),
      },
      {
        user: username,
        title: 'Dream Home Down Payment Plan',
        content: 'Goal: Accumulate ₹25,00,000 down payment in 5 years. Contributing ₹30,000 every month into balanced hybrid mutual funds targeting 10-12% annual return.',
        created: new Date(),
      },
    ];

    // 7. 6 Recurring Items
    const recurringItems = [
      { user: username, title: 'Netflix Premium 4K', amount: 649, category: 'Entertainment', type: 'Expense', dayOfMonth: 5, created: new Date() },
      { user: username, title: 'Society Maintenance Fee', amount: 2500, category: 'Bills', type: 'Expense', dayOfMonth: 1, created: new Date() },
      { user: username, title: 'Fitness & Gym Membership', amount: 1500, category: 'Fitness', type: 'Expense', dayOfMonth: 3, created: new Date() },
      { user: username, title: 'High-Speed Fiber Broadband', amount: 999, category: 'Bills', type: 'Expense', dayOfMonth: 10, created: new Date() },
      { user: username, title: 'Nifty 50 Index Fund SIP', amount: 5000, category: 'Investment', type: 'Saving', dayOfMonth: 5, created: new Date() },
      { user: username, title: 'Emergency Reserve SIP', amount: 3000, category: 'Savings', type: 'Saving', dayOfMonth: 15, created: new Date() },
    ];

    // 8. 6 Future Plans (with complete schedules and Chart.js graph objects)
    const planConfigs = [
      { fv: 5000000, p: 100000, income: 960000, t: 15, r: 12.0, n: 12 },
      { fv: 2500000, p: 200000, income: 960000, t: 5, r: 10.5, n: 12 },
      { fv: 1500000, p: 50000, income: 960000, t: 4, r: 9.5, n: 12 },
      { fv: 3000000, p: 150000, income: 960000, t: 10, r: 11.0, n: 12 },
      { fv: 800000, p: 30000, income: 960000, t: 2, r: 8.5, n: 12 },
      { fv: 500000, p: 25000, income: 960000, t: 2, r: 7.5, n: 12 },
    ];

    const futurePlans = planConfigs.map(cfg => {
      const calc = generateFuturePlanData(cfg.fv, cfg.p, cfg.income, cfg.t, cfg.r, cfg.n);
      return {
        user: username,
        inputs: calc.inputs,
        results: calc.results,
        graph: calc.graph,
        created: new Date(),
      };
    });

    await Promise.all([
      Expense.insertMany(expenses),
      Saving.insertMany(savings),
      Income.insertMany(incomes),
      PendingReturn.insertMany(returns),
      Payable.insertMany(payables),
      Note.insertMany(notes),
      RecurringItem.insertMany(recurringItems),
      FuturePlan.insertMany(futurePlans),
    ]);

    console.log('✅ Dummy data successfully seeded for ' + username + ' across all sections!');
  } catch (err) {
    console.error('❌ Error seeding dummy data:', err);
  }
}
seedDummy();

// ===============================
// 🚀 Start Server
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

