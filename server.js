const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// MongoDB Connection
// FIX: Removed deprecated options (useNewUrlParser, useUnifiedTopology)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mindcare')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// ============ MODELS ============

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: 'A' },
    status: { type: String, default: 'Striving for balance and peace.' },
    memberSince: { type: Date, default: Date.now },
    stats: {
        streakDays: { type: Number, default: 0 },
        sessionsDone: { type: Number, default: 0 },
        wellnessScore: { type: Number, default: 0 }
    },
    goals: [{
        text: String,
        completed: Boolean,
        createdAt: { type: Date, default: Date.now }
    }],
    emergencyContact: {
        name: String,
        phone: String
    }
}, { timestamps: true });

// BEST PRACTICE: Add indexes for query performance
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

// Mood Entry Schema
const moodSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mood: { type: String, required: true, enum: ['Great', 'Good', 'Okay', 'Not Good', 'Terrible'] },
    note: String,
    timestamp: { type: Date, default: Date.now }
});

const Mood = mongoose.model('Mood', moodSchema);

// Chat Session Schema
const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [{
        sender: { type: String, enum: ['user', 'ai'], required: true },
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    startTime: { type: Date, default: Date.now },
    endTime: Date
});

const ChatSession = mongoose.model('ChatSession', chatSchema);

// Exercise Log Schema
const exerciseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exerciseName: { type: String, required: true },
    duration: Number, // in minutes
    completed: { type: Boolean, default: true },
    timestamp: { type: Date, default: Date.now }
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Wellness Plan Progress Schema
const planProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completionStatus: {
        monday: [Boolean],
        tuesday: [Boolean],
        wednesday: [Boolean],
        thursday: [Boolean],
        friday: [Boolean],
        saturday: [Boolean],
        sunday: [Boolean]
    },
    lastUpdated: { type: Date, default: Date.now }
});

const PlanProgress = mongoose.model('PlanProgress', planProgressSchema);

// ============ MIDDLEWARE ============

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.userId = user._id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ============ ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            name
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                status: user.status
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                status: user.status,
                stats: user.stats
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// ========== USER PROFILE ROUTES ==========

// Get user profile
app.get('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
app.put('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { name, avatar, status, emergencyContact } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (avatar) updateData.avatar = avatar;
        if (status) updateData.status = status;
        if (emergencyContact) updateData.emergencyContact = emergencyContact;

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ========== GOALS ROUTES ==========

// Get goals
app.get('/api/goals', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json(user.goals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Add goal
app.post('/api/goals', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        
        const user = await User.findById(req.userId);
        user.goals.push({ text, completed: false });
        await user.save();

        res.status(201).json(user.goals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add goal' });
    }
});

// Update goal
app.put('/api/goals/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;
        const { completed } = req.body;

        const user = await User.findById(req.userId);
        // Mongoose automatically handles subdocument lookup with .id()
        const goal = user.goals.id(goalId); 
        
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        goal.completed = completed;
        await user.save();

        res.json(user.goals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// Delete goal
app.delete('/api/goals/:goalId', authMiddleware, async (req, res) => {
    try {
        const { goalId } = req.params;

        const user = await User.findById(req.userId);
        user.goals.pull(goalId);
        await user.save();

        res.json(user.goals);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// ========== MOOD TRACKING ROUTES ==========

// Log mood
app.post('/api/mood', authMiddleware, async (req, res) => {
    try {
        const { mood, note } = req.body;

        const moodEntry = new Mood({
            userId: req.userId,
            mood,
            note
        });

        await moodEntry.save();

        // Update user stats
        await User.findByIdAndUpdate(req.userId, {
            $inc: { 'stats.sessionsDone': 1 }
        });

        res.status(201).json(moodEntry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to log mood' });
    }
});

// Get mood history
app.get('/api/mood', authMiddleware, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const moods = await Mood.find({
            userId: req.userId,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: -1 });

        res.json(moods);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch mood history' });
    }
});

// Get mood statistics
app.get('/api/mood/stats', authMiddleware, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const moodStats = await Mood.aggregate([
            {
                $match: {
                    // FIX: Use 'new' to properly convert to ObjectId in aggregation
                    userId: new mongoose.Types.ObjectId(req.userId), 
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$mood',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(moodStats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch mood statistics' });
    }
});

// ========== CHAT ROUTES ==========

// Start new chat session
app.post('/api/chat/session', authMiddleware, async (req, res) => {
    try {
        const session = new ChatSession({
            userId: req.userId,
            messages: []
        });

        await session.save();
        res.status(201).json(session);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat session' });
    }
});

// Add message to chat
app.post('/api/chat/:sessionId/message', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { text, sender } = req.body;

        const session = await ChatSession.findOne({
            _id: sessionId,
            userId: req.userId
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        session.messages.push({ sender, text });
        await session.save();

        // If user message, generate AI response
        if (sender === 'user') {
            const aiResponses = [
                "Thank you for sharing. Can you tell me more about that?",
                "I understand. It's okay to feel that way.",
                "That sounds challenging. How have you been coping with it?",
                "I'm here to listen. What's on your mind?",
                "It takes courage to express that. I appreciate you trusting me.",
                "Remember to be kind to yourself. You're doing the best you can."
            ];
            
            const aiResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
            
            session.messages.push({ sender: 'ai', text: aiResponse });
            await session.save();
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add message' });
    }
});

// Get chat history
app.get('/api/chat', authMiddleware, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ userId: req.userId })
            .sort({ startTime: -1 })
            .limit(20);

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// ========== EXERCISE ROUTES ==========

// Log exercise
app.post('/api/exercise', authMiddleware, async (req, res) => {
    try {
        const { exerciseName, duration } = req.body;

        const exercise = new Exercise({
            userId: req.userId,
            exerciseName,
            duration
        });

        await exercise.save();

        // Update user stats
        await User.findByIdAndUpdate(req.userId, {
            $inc: { 'stats.sessionsDone': 1 }
        });

        res.status(201).json(exercise);
    } catch (error) {
        res.status(500).json({ error: 'Failed to log exercise' });
    }
});

// Get exercise history
app.get('/api/exercise', authMiddleware, async (req, res) => {
    try {
        const exercises = await Exercise.find({ userId: req.userId })
            .sort({ timestamp: -1 })
            .limit(50);

        res.json(exercises);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exercise history' });
    }
});

// ========== WELLNESS PLAN ROUTES ==========

// Get plan progress
app.get('/api/plan/progress', authMiddleware, async (req, res) => {
    try {
        let progress = await PlanProgress.findOne({ userId: req.userId });

        if (!progress) {
            // Create initial progress (matching the frontend structure of 4 tasks per day)
            progress = new PlanProgress({
                userId: req.userId,
                completionStatus: {
                    monday: [false, false, false, false],
                    tuesday: [false, false, false, false],
                    wednesday: [false, false, false, false],
                    thursday: [false, false, false, false],
                    friday: [false, false, false, false],
                    saturday: [false, false, false, false],
                    sunday: [false, false, false, false]
                }
            });
            await progress.save();
        }

        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch plan progress' });
    }
});

// Update plan progress
app.put('/api/plan/progress', authMiddleware, async (req, res) => {
    try {
        const { completionStatus } = req.body;

        let progress = await PlanProgress.findOne({ userId: req.userId });

        if (!progress) {
            progress = new PlanProgress({
                userId: req.userId,
                completionStatus
            });
        } else {
            progress.completionStatus = completionStatus;
            progress.lastUpdated = new Date();
        }

        await progress.save();

        // Update wellness score based on total weekly progress
        const allTasks = Object.values(completionStatus).flat();
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(Boolean).length;
        // Calculate wellness score as a percentage, or 0 if no tasks exist
        const wellnessScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        await User.findByIdAndUpdate(req.userId, {
            'stats.wellnessScore': wellnessScore
        });

        res.json(progress);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update plan progress' });
    }
});

// ========== DASHBOARD/STATS ROUTES ==========

// Get dashboard stats
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        
        // Get latest mood
        const latestMood = await Mood.findOne({ userId: req.userId })
            .sort({ timestamp: -1 });

        // Get activity count for the week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weeklyMoods = await Mood.countDocuments({
            userId: req.userId,
            timestamp: { $gte: weekAgo }
        });

        const weeklyExercises = await Exercise.countDocuments({
            userId: req.userId,
            timestamp: { $gte: weekAgo }
        });

        res.json({
            stats: user.stats,
            currentMood: latestMood?.mood || 'Not set',
            weeklyActivity: weeklyMoods + weeklyExercises
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get activity history for History page
app.get('/api/history', authMiddleware, async (req, res) => {
    try {
        const { category = 'all', limit = 50 } = req.query;

        const history = [];

        // Fetch and format mood history
        if (category === 'all' || category === 'mood') {
            const moods = await Mood.find({ userId: req.userId })
                .sort({ timestamp: -1 })
                .limit(parseInt(limit));
            
            history.push(...moods.map(m => ({
                type: 'mood',
                data: m,
                timestamp: m.timestamp
            })));
        }

        // Fetch and format exercise history
        if (category === 'all' || category === 'exercise') {
            const exercises = await Exercise.find({ userId: req.userId })
                .sort({ timestamp: -1 })
                .limit(parseInt(limit));
            
            history.push(...exercises.map(e => ({
                type: 'exercise',
                data: e,
                timestamp: e.timestamp
            })));
        }

        // Fetch and format chat session history
        if (category === 'all' || category === 'session') {
            const sessions = await ChatSession.find({ userId: req.userId })
                .sort({ startTime: -1 })
                // Only include sessions with messages to filter out empty ones
                .where('messages.0').exists(true) 
                .limit(parseInt(limit));
            
            history.push(...sessions.map(s => ({
                type: 'session',
                data: s,
                timestamp: s.startTime
            })));
        }

        // Sort all history items by timestamp
        history.sort((a, b) => b.timestamp - a.timestamp);

        res.json(history.slice(0, parseInt(limit)));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// ========== START SERVER ==========

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`MindCare Backend running on port ${PORT}`);
});