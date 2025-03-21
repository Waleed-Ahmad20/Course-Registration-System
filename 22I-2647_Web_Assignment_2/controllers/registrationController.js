const Registration = require('../models/Registration');
const Course = require('../models/Course');
const User = require('../models/User');
const socketHandler = require('../middleware/socketHandler');

const registrationController = {
    getStudentRegistrations: async (req, res) => {
        try {
            const { rollNumber } = req.params;
            const registrations = await Registration.find({ student: rollNumber });
            res.json(registrations);
        } catch (error) {
            console.error('Error fetching student registrations:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    registerCourse: async (req, res) => {
        try {
            const { rollNumber, courseId } = req.body;
            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            const student = await User.findOne({ rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            const existingRegistration = await Registration.findOne({
                student: rollNumber,
                courseCode: course.courseCode
            });
            if (existingRegistration) {
                return res.status(400).json({ message: 'Student already registered for this course' });
            }
            if (course.availableSeats <= 0) {
                return res.status(400).json({ message: 'No available seats for this course' });
            }
            const prerequisitesMet = course.prerequisites.every(prerequisite =>
                student.completedCourses.includes(prerequisite)
            );
            if (!prerequisitesMet) {
                return res.status(400).json({ message: 'Student has not completed all prerequisites' });
            }
            const currentRegistrations = await Registration.find({ student: rollNumber });
            const hasTimeConflict = currentRegistrations.some(registration => {
                return registration.schedule.some(regSlot => {
                    return course.schedule.some(courseSlot => {
                        if (regSlot.day !== courseSlot.day) return false;
                        const regStart = convertTimeToMinutes(regSlot.startTime);
                        const regEnd = convertTimeToMinutes(regSlot.endTime);
                        const courseStart = convertTimeToMinutes(courseSlot.startTime);
                        const courseEnd = convertTimeToMinutes(courseSlot.endTime);
                        return (courseStart < regEnd && courseEnd > regStart);
                    });
                });
            });
            if (hasTimeConflict) {
                return res.status(400).json({ message: 'Time conflict with existing registered courses' });
            }
            const newRegistration = new Registration({
                student: rollNumber,
                courseCode: course.courseCode,
                name: course.name,
                description: course.description,
                department: course.department,
                credits: course.credits,
                instructor: course.instructor,
                prerequisites: course.prerequisites,
                schedule: course.schedule
            });
            await newRegistration.save();
            course.availableSeats -= 1;
            await course.save();
            const io = req.app.get('io');
            if (io) {
                socketHandler.emitCourseUpdate(io, course);
            }
            res.status(201).json(newRegistration);
        } catch (error) {
            console.error('Error registering for course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    dropCourse: async (req, res) => {
        try {
            const { registrationId } = req.params;
            const registration = await Registration.findById(registrationId);
            if (!registration) {
                return res.status(404).json({ message: 'Registration not found' });
            }
            const course = await Course.findOne({ courseCode: registration.courseCode });
            if (course) {
                course.availableSeats += 1;
                await course.save();
                const io = req.app.get('io');
                if (io) {
                    socketHandler.emitCourseUpdate(io, course);
                    if (course.waitlist.length > 0) {
                        socketHandler.emitWaitlistNotification(io, course);
                    }
                }
            }
            await Registration.findByIdAndDelete(registrationId);
            res.json({ message: 'Course dropped successfully' });
        } catch (error) {
            console.error('Error dropping course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    adminRegisterStudent: async (req, res) => {
        try {
            const { rollNumber, courseId } = req.body;
            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            const student = await User.findOne({ rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            const existingRegistration = await Registration.findOne({
                student: rollNumber,
                courseCode: course.courseCode
            });
            if (existingRegistration) {
                return res.status(400).json({ message: 'Student already registered for this course' });
            }
            const newRegistration = new Registration({
                student: rollNumber,
                courseCode: course.courseCode,
                name: course.name,
                description: course.description,
                department: course.department,
                credits: course.credits,
                instructor: course.instructor,
                prerequisites: course.prerequisites,
                schedule: course.schedule
            });
            await newRegistration.save();
            if (course.availableSeats > 0) {
                course.availableSeats -= 1;
                await course.save();
                const io = req.app.get('io');
                if (io) {
                    socketHandler.emitCourseUpdate(io, course);
                }
            }
            res.status(201).json(newRegistration);
        } catch (error) {
            console.error('Error in admin registration:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCourseRegistrations: async (req, res) => {
        try {
            const { courseCode } = req.params;
            const registrations = await Registration.find({ courseCode });
            res.json(registrations);
        } catch (error) {
            console.error('Error fetching course registrations:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

function convertTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

module.exports = registrationController;
