const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
    res.render('auth/login');
});

router.get('/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            user: {
                id: req.session.userId,
                name: req.session.name,
                rollNumber: req.session.rollNumber,
                role: req.session.role
            }
        });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

router.post('/student/login', async (req, res) => {
    try {
        const { rollNumber, password } = req.body;
        const user = await User.findOne({ rollNumber, role: 'student' });
        if (!user) {
            return res.status(401).json({ message: 'No student in the database' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid roll number or password' });
        }
        req.session.userId = user._id;
        req.session.rollNumber = user.rollNumber;
        req.session.name = user.name;
        req.session.role = 'student';
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                rollNumber: user.rollNumber,
                department: user.department,
                completedCourses: user.completedCourses
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ rollNumber: username, role: 'admin' });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        req.session.userId = user._id;
        req.session.rollNumber = user.rollNumber;
        req.session.name = user.name;
        req.session.role = 'admin';
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                rollNumber: user.rollNumber
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.json({ message: 'Logout successful' });
    });
});

router.get('/user', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            user: {
                id: req.session.userId,
                name: req.session.name,
                rollNumber: req.session.rollNumber,
                role: req.session.role
            }
        });
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

module.exports = router;
