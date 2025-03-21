const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isStudent } = require('../middleware/auth');
const Registration = require('../models/Registration');
const Course = require('../models/Course');

router.get('/dashboard', isStudent, (req, res) => {
    res.render('student/dashboard', { user: req.session });
});

router.get('/courses', isStudent, async (req, res) => {
    try {
        console.log('Fetching courses for user ID:', req.session.userId);

        const registrations = await Registration.find({
            studentId: req.session.userId
        }).populate('courseId');

        console.log('Found registrations with courses:', registrations.length);

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching registered courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', isStudent, async (req, res) => {
    try {
        const student = await Student.findById(req.session.userId).select('-password');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ user: student });
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/profile', isStudent, async (req, res) => {
    try {
        const student = await Student.findById(req.session.userId).select('-password');
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json(student);
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/registered-courses', isStudent, async (req, res) => {
    try {
        const registrations = await Registration.find({
            studentId: req.session.userId,
            status: 'active'
        }).populate('courseId');

        console.log('Found registrations:', registrations.length);
        console.log('User ID:', req.session.userId);

        res.json({
            success: true,
            registeredCourses: registrations,
            count: registrations.length
        });
    } catch (error) {
        console.error('Error fetching registered courses:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/register', isStudent, async (req, res) => {
    try {
        let courseIdsArray = [];

        if (req.body.courseId) {
            courseIdsArray = [req.body.courseId];
        } else if (req.body.courseIds && Array.isArray(req.body.courseIds)) {
            courseIdsArray = req.body.courseIds;
        } else {
            return res.status(400).json({ success: false, message: 'No courses selected' });
        }

        if (courseIdsArray.length === 0) {
            return res.status(400).json({ success: false, message: 'No courses selected' });
        }

        const courseIdObjects = courseIdsArray.map(id =>
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );

        const courses = await Course.find({ _id: { $in: courseIdObjects } });
        if (courses.length !== courseIdsArray.length) {
            return res.status(400).json({ success: false, message: 'Some courses do not exist' });
        }

        const existingRegistrations = await Registration.find({
            studentId: req.session.userId,
            courseId: { $in: courseIdObjects }
        });

        const newCourseIds = courseIdsArray.filter(id =>
            !existingRegistrations.some(reg => reg.courseId.toString() === id.toString())
        );

        if (newCourseIds.length === 0) {
            return res.json({ success: true, message: 'Already registered for these courses' });
        }

        const registrations = newCourseIds.map(courseId => {
            const course = courses.find(c => c._id.toString() === courseId.toString());

            return {
                studentId: req.session.userId,
                courseId: courseId,
                courseCode: course.courseCode,
                courseName: course.name,
                registrationDate: new Date()
            };
        });

        await Registration.insertMany(registrations);

        for (const courseId of newCourseIds) {
            const course = courses.find(c => c._id.toString() === courseId.toString());
            if (course.availableSeats > 0) {
                await Course.updateOne(
                    { _id: courseId },
                    { $inc: { availableSeats: -1 } }
                );
            } else {
                return res.status(400).json({ success: false, message: `No available seats for course: ${course.name}` });
            }
        }

        res.json({ success: true, message: 'Courses registered successfully' });
    } catch (error) {
        console.error('Error registering courses:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/register/:id', isStudent, async (req, res) => {
    try {
        let registration;

        registration = await Registration.findOne({
            _id: req.params.id,
            studentId: req.session.userId
        });

        if (!registration) {
            registration = await Registration.findOne({
                courseId: req.params.id,
                studentId: req.session.userId
            });
        }

        if (!registration) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }

        await Course.updateOne(
            { _id: registration.courseId },
            { $inc: { availableSeats: 1 } }
        );

        await Registration.findByIdAndDelete(registration._id);

        res.json({ success: true, message: 'Course registration canceled successfully' });
    } catch (error) {
        console.error('Error canceling registration:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/check-prerequisites', isStudent, async (req, res) => {
    try {
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({ success: false, message: 'No course selected' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        if (!course.prerequisites || course.prerequisites.length === 0) {
            return res.json({ success: true, meetsPrerequisites: true, completedPrerequisites: [] });
        }

        const registrations = await Registration.find({ studentId: req.session.userId });
        const completedCourses = await Course.find({ _id: { $in: registrations.map(reg => reg.courseId) } });
        const completedCourseCodes = completedCourses.map(course => course.courseCode);

        const completedPrerequisites = course.prerequisites.filter(prerequisite =>
            completedCourseCodes.includes(prerequisite)
        );

        const meetsPrerequisites = completedPrerequisites.length === course.prerequisites.length;

        res.json({
            success: true,
            meetsPrerequisites,
            completedPrerequisites
        });
    } catch (error) {
        console.error('Error checking prerequisites:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;