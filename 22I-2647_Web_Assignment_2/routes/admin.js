const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Registration = require('../models/Registration');

router.get('/dashboard', isAdmin, (req, res) => {
    res.render('admin/dashboard', { user: req.session });
});

router.get('/students', isAdmin, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/students/:studentId/registrations', isAdmin, async (req, res) => {
    try {
        const registrations = await Registration.find({ student: req.params.studentId })
            .populate('course')
            .sort({ registrationDate: -1 });
        res.json(registrations);
    } catch (error) {
        console.error('Error fetching student registrations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/students/:studentId/prerequisites', isAdmin, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const completedRegistrations = await Registration.find({
            student: studentId,
            status: 'Completed'
        }).populate('course');
        const completedCourses = completedRegistrations.map(reg => reg.course);
        const currentRegistrations = await Registration.find({
            student: studentId,
            status: { $ne: 'Completed' }
        }).populate('course');
        const missingPrerequisites = [];
        for (const reg of currentRegistrations) {
            const course = reg.course;
            if (course.prerequisites && course.prerequisites.length > 0) {
                const missing = [];
                for (const prereqCode of course.prerequisites) {
                    const isCompleted = completedCourses.some(c => c.courseCode === prereqCode);
                    if (!isCompleted) {
                        const prereqCourse = await Course.findOne({ courseCode: prereqCode });
                        if (prereqCourse) {
                            missing.push(prereqCourse);
                        }
                    }
                }
                if (missing.length > 0) {
                    missingPrerequisites.push({
                        course: course,
                        missing: missing
                    });
                }
            }
        }
        res.json({
            completedCourses,
            missingPrerequisites
        });
    } catch (error) {
        console.error('Error checking prerequisites:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/courses', isAdmin, async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/registrations', isAdmin, async (req, res) => {
    try {
        const { studentId, courseId } = req.body;
        const existingRegistration = await Registration.findOne({
            student: studentId,
            course: courseId,
            status: { $ne: 'Dropped' }
        });
        if (existingRegistration) {
            return res.status(400).json({ message: 'Student is already registered for this course' });
        }
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (course.availableSeats <= 0) {
            return res.status(400).json({ message: 'No available seats in this course' });
        }
        const registration = new Registration({
            student: studentId,
            course: courseId,
            status: 'Registered',
            registrationDate: new Date()
        });
        await registration.save();
        course.availableSeats--;
        await course.save();
        res.status(201).json({ message: 'Registration successful', registration });
    } catch (error) {
        console.error('Error creating registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/registrations/:registrationId', isAdmin, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.registrationId)
            .populate('course');
        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }
        registration.status = 'Dropped';
        await registration.save();
        const course = registration.course;
        course.availableSeats++;
        await course.save();
        res.json({ message: 'Registration dropped successfully' });
    } catch (error) {
        console.error('Error dropping registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/reports/:reportId', isAdmin, async (req, res) => {
    try {
        const reportId = req.params.reportId;
        let data = [];
        switch (reportId) {
            case 'course-enrollment':
                const courses = await Course.find({});
                data = await Promise.all(courses.map(async (course) => {
                    const enrolledCount = await Registration.countDocuments({
                        course: course._id,
                        status: { $ne: 'Dropped' }
                    });
                    return {
                        _id: course._id,
                        courseCode: course.courseCode,
                        name: course.name,
                        enrolledCount,
                        totalSeats: course.totalSeats
                    };
                }));
                break;
            case 'available-seats':
                data = await Course.find({}).lean();
                for (let course of data) {
                    course.waitlistCount = await Registration.countDocuments({
                        course: course._id,
                        status: 'Waitlisted'
                    });
                }
                break;
            case 'prerequisite-issues':
                const students = await User.find({ role: 'student' });
                for (const student of students) {
                    const completedCourses = await Registration.find({
                        student: student._id,
                        status: 'Completed'
                    }).populate('course');
                    const currentCourses = await Registration.find({
                        student: student._id,
                        status: { $ne: 'Completed', $ne: 'Dropped' }
                    }).populate('course');
                    for (const reg of currentCourses) {
                        const course = reg.course;
                        const missingPrereqs = [];
                        if (course.prerequisites && course.prerequisites.length > 0) {
                            for (const prereqCode of course.prerequisites) {
                                const isCompleted = completedCourses.some(c =>
                                    c.course.courseCode === prereqCode);
                                if (!isCompleted) {
                                    const prereq = await Course.findOne({ courseCode: prereqCode });
                                    if (prereq) missingPrereqs.push(prereq);
                                }
                            }
                            if (missingPrereqs.length > 0) {
                                data.push({
                                    student: {
                                        _id: student._id,
                                        name: student.name,
                                        rollNumber: student.rollNumber,
                                        department: student.department
                                    },
                                    course: {
                                        _id: course._id,
                                        courseCode: course.courseCode,
                                        name: course.name
                                    },
                                    missingPrerequisites: missingPrereqs
                                });
                            }
                        }
                    }
                }
                break;
            case 'registration-trends':
                const registrations = await Registration.find().sort({ registrationDate: 1 });
                const dateMap = new Map();
                registrations.forEach(reg => {
                    const date = reg.registrationDate.toISOString().split('T')[0];
                    dateMap.set(date, (dateMap.get(date) || 0) + 1);
                });
                const timeline = Array.from(dateMap).map(([date, count]) => ({ date, count }));
                const deptMap = new Map();
                for (const reg of registrations) {
                    const student = await User.findById(reg.student);
                    const dept = student.department;
                    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
                }
                const departments = Array.from(deptMap).map(([department, count]) => ({ department, count }));
                data = {
                    timeline,
                    departments
                };
                break;
            default:
                return res.status(404).json({ message: 'Report not found' });
        }
        res.json(data);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/reports/course-enrollment/:courseId', isAdmin, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const registrations = await Registration.find({
            course: courseId,
            status: { $ne: 'Dropped' }
        }).populate('student', '-password');
        const students = registrations.map(reg => ({
            ...reg.student.toObject(),
            registrationDate: reg.registrationDate
        }));
        res.json({
            course,
            students
        });
    } catch (error) {
        console.error('Error fetching enrollment details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
