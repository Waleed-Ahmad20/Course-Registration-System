const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const Registration = require('../models/Registration');
const bcrypt = require('bcryptjs');
const { isAuthenticated, isAdmin, isStudent } = require('../middleware/auth');

router.get('/courses', isAuthenticated, async (req, res) => {
    try {
        const courses = await Course.find().sort({ department: 1, courseCode: 1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/courses/search', isAuthenticated, async (req, res) => {
    try {
        const { department, day, startTime, endTime, minSeats, hasPrerequisites } = req.query;
        const query = {};
        if (department) {
            query.department = department;
        }
        if (day) {
            query['schedule.day'] = day;
        }
        if (startTime) {
            query['schedule.startTime'] = { $gte: startTime };
        }
        if (endTime) {
            query['schedule.endTime'] = { $lte: endTime };
        }
        if (minSeats) {
            query.availableSeats = { $gte: parseInt(minSeats) };
        }
        if (hasPrerequisites === 'true') {
            query.prerequisites = { $exists: true, $ne: [] };
        } else if (hasPrerequisites === 'false') {
            query.prerequisites = { $exists: true, $eq: [] };
        }
        const courses = await Course.find(query).sort({ department: 1, courseCode: 1 });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/courses/:id', isAuthenticated, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/courses', isAdmin, async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/admin/students', isAdmin, async (req, res) => {
    try {
        const { rollNumber, name, email, department, password, completedCourses } = req.body;

        const existingStudent = await User.findOne({ rollNumber });
        if (existingStudent) {
            return res.status(400).json({ message: 'Roll number already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new User({
            rollNumber,
            name,
            email,
            department,
            password: hashedPassword,
            role: 'student',
            completedCourses: completedCourses || []
        });

        await newStudent.save();
        res.status(201).json({ message: 'Student added successfully', student: newStudent });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/courses/:id', isAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        Object.keys(req.body).forEach(key => {
            course[key] = req.body[key];
        });
        await course.save();
        res.json(course);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/courses/:id/seats', isAdmin, async (req, res) => {
    try {
        const { totalSeats, availableSeats } = req.body;
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        course.totalSeats = totalSeats;
        await course.updateSeats(availableSeats);
        res.json(course);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/courses/:id', isAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const registrations = await Registration.find({ courseId: req.params.id });
        if (registrations.length > 0) {
            return res.status(400).json({ message: 'Cannot delete course with active registrations' });
        }
        await Course.deleteOne({ _id: course._id });
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/student/courses', isStudent, async (req, res) => {
    try {
        const studentId = req.session.userId;
        const registrations = await Registration.find({ studentId });
        const courseIds = registrations.map(reg => reg.courseId);
        const registeredCourses = await Course.find({ _id: { $in: courseIds } });
        const waitlistedCourses = await Course.find({ waitlist: studentId });
        const registeredWithStatus = registeredCourses.map(course => ({
            ...course.toObject(),
            status: 'registered'
        }));
        const waitlistedWithStatus = waitlistedCourses.map(course => ({
            ...course.toObject(),
            status: 'waitlisted'
        }));
        const allCourses = [...registeredWithStatus, ...waitlistedWithStatus];
        res.json(allCourses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/student/register', isStudent, async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.session.userId;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const existingRegistration = await Registration.findOne({ studentId, courseId });
        if (existingRegistration) {
            return res.status(400).json({ message: 'Already registered for this course' });
        }
        if (course.waitlist.includes(studentId)) {
            return res.status(400).json({ message: 'Already on waitlist for this course' });
        }
        if (course.prerequisites.length > 0) {
            const student = await User.findById(studentId);
            const missingPrereqs = course.prerequisites.filter(
                prereq => !student.completedCourses.includes(prereq)
            );
            if (missingPrereqs.length > 0) {
                return res.status(400).json({ message: 'Missing prerequisites: ' + missingPrereqs.join(', ') });
            }
        }
        const studentCourses = await Registration.find({ studentId });
        const studentCourseIds = studentCourses.map(reg => reg.courseId);
        const registeredCourses = await Course.find({ _id: { $in: studentCourseIds } });
        for (const registeredCourse of registeredCourses) {
            for (const regSchedule of registeredCourse.schedule) {
                for (const newSchedule of course.schedule) {
                    if (regSchedule.day === newSchedule.day) {
                        const regStart = timeToMinutes(regSchedule.startTime);
                        const regEnd = timeToMinutes(regSchedule.endTime);
                        const newStart = timeToMinutes(newSchedule.startTime);
                        const newEnd = timeToMinutes(newSchedule.endTime);
                        if ((newStart >= regStart && newStart < regEnd) ||
                            (newEnd > regStart && newEnd <= regEnd) ||
                            (newStart <= regStart && newEnd >= regEnd)) {
                            return res.status(400).json({ message: `Schedule conflict with ${registeredCourse.courseCode}` });
                        }
                    }
                }
            }
        }
        if (course.availableSeats > 0) {
            const registration = new Registration({
                studentId,
                courseId,
                courseCode: course.courseCode,
                courseName: course.name,
                registrationDate: new Date()
            });
            await registration.save();
            course.availableSeats--;
            await course.save();
            res.status(201).json({ message: 'Registration successful', registration });
        } else {
            await course.addToWaitlist(studentId);
            res.status(200).json({ message: 'Added to course waitlist', position: course.waitlist.length });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/student/register/:courseId', isStudent, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.session.userId;
        const registration = await Registration.findOne({ studentId, courseId });
        if (registration) {
            await Registration.deleteOne({ _id: registration._id });
            const course = await Course.findById(courseId);
            if (course) {
                course.availableSeats++;
                await course.save();
            }
            return res.json({ message: 'Course dropped successfully' });
        }
        const course = await Course.findById(courseId);
        if (course && course.waitlist.includes(studentId)) {
            await course.removeFromWaitlist(studentId);
            return res.json({ message: 'Removed from course waitlist successfully' });
        }
        return res.status(404).json({ message: 'Not registered or waitlisted for this course' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/student/waitlist/:courseId', isStudent, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = req.session.userId;
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const position = course.waitlist.indexOf(studentId);
        if (position === -1) {
            return res.status(404).json({ message: 'Not on waitlist for this course' });
        }
        res.json({ position: position + 1, totalWaitlisted: course.waitlist.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/student/check-prerequisites', isAuthenticated, async (req, res) => {
    try {
        const { courseId } = req.body;
        const studentId = req.session.userId;
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        const meetsPrerequisites = course.prerequisites.every(prereq =>
            student.completedCourses.includes(prereq)
        );
        res.json({ meetsPrerequisites });
    } catch (error) {
        console.error('Error checking prerequisites:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

module.exports = router;
