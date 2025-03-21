const Course = require('../models/Course');
const Registration = require('../models/Registration');
const socketHandler = require('../middleware/socketHandler');

const courseController = {
    getAllCourses: async (req, res) => {
        try {
            const courses = await Course.find({});
            res.json(courses);
        } catch (error) {
            console.error('Error fetching courses:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCourseById: async (req, res) => {
        try {
            const course = await Course.findById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }
            res.json(course);
        } catch (error) {
            console.error('Error fetching course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    createCourse: async (req, res) => {
        try {
            const {
                courseCode,
                name,
                description,
                department,
                credits,
                instructor,
                prerequisites,
                schedule,
                totalSeats,
                availableSeats
            } = req.body;

            const existingCourse = await Course.findOne({ courseCode });
            if (existingCourse) {
                return res.status(400).json({ message: 'Course code already exists' });
            }

            const newCourse = new Course({
                courseCode,
                name,
                description,
                department,
                credits,
                instructor,
                prerequisites: prerequisites || [],
                schedule: schedule || [],
                totalSeats: totalSeats || 0,
                availableSeats: availableSeats || 0,
                waitlist: []
            });

            await newCourse.save();
            res.status(201).json(newCourse);
        } catch (error) {
            console.error('Error creating course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateCourse: async (req, res) => {
        try {
            const {
                courseCode,
                name,
                description,
                department,
                credits,
                instructor,
                prerequisites,
                schedule,
                totalSeats,
                availableSeats
            } = req.body;

            const course = await Course.findById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            if (courseCode !== course.courseCode) {
                const existingCourse = await Course.findOne({ courseCode });
                if (existingCourse && existingCourse._id.toString() !== req.params.id) {
                    return res.status(400).json({ message: 'Course code already exists' });
                }
            }

            course.courseCode = courseCode;
            course.name = name;
            course.description = description;
            course.department = department;
            course.credits = credits;
            course.instructor = instructor;
            course.prerequisites = prerequisites || [];
            course.schedule = schedule || [];
            course.totalSeats = totalSeats || 0;
            course.availableSeats = availableSeats || 0;

            await course.save();

            const io = req.app.get('io');
            if (io) {
                socketHandler.emitCourseUpdate(io, course);
            }

            res.json(course);
        } catch (error) {
            console.error('Error updating course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deleteCourse: async (req, res) => {
        try {
            const course = await Course.findById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            const registrations = await Registration.find({ courseCode: course.courseCode });
            if (registrations.length > 0) {
                return res.status(400).json({
                    message: 'Cannot delete course as students are registered for it'
                });
            }

            await Course.findByIdAndDelete(req.params.id);
            res.json({ message: 'Course deleted successfully' });
        } catch (error) {
            console.error('Error deleting course:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateSeats: async (req, res) => {
        try {
            const { totalSeats, availableSeats } = req.body;

            const course = await Course.findById(req.params.id);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            course.totalSeats = totalSeats;
            course.availableSeats = availableSeats;

            await course.save();

            const io = req.app.get('io');
            if (io) {
                socketHandler.emitCourseUpdate(io, course);
            }

            res.json(course);
        } catch (error) {
            console.error('Error updating seats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCoursesByDepartment: async (req, res) => {
        try {
            const { department } = req.params;
            const courses = await Course.find({ department });
            res.json(courses);
        } catch (error) {
            console.error('Error fetching courses by department:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCoursesWithAvailableSeats: async (req, res) => {
        try {
            const courses = await Course.find({ availableSeats: { $gt: 0 } });
            res.json(courses);
        } catch (error) {
            console.error('Error fetching courses with available seats:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    subscribeToWaitlist: async (req, res) => {
        try {
            const { courseId } = req.params;
            const { rollNumber } = req.body;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            if (course.waitlist.includes(rollNumber)) {
                return res.status(400).json({ message: 'Student already in waitlist' });
            }

            course.waitlist.push(rollNumber);
            await course.save();

            res.json({ message: 'Successfully subscribed to waitlist' });
        } catch (error) {
            console.error('Error subscribing to waitlist:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    removeFromWaitlist: async (req, res) => {
        try {
            const { courseId } = req.params;
            const { rollNumber } = req.body;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            course.waitlist = course.waitlist.filter(studentRoll => studentRoll !== rollNumber);
            await course.save();

            res.json({ message: 'Successfully removed from waitlist' });
        } catch (error) {
            console.error('Error removing from waitlist:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getCoursePrerequisites: async (req, res) => {
        try {
            const { courseId } = req.params;

            const course = await Course.findById(courseId);
            if (!course) {
                return res.status(404).json({ message: 'Course not found' });
            }

            const prerequisites = await Course.find({ courseCode: { $in: course.prerequisites } });

            res.json(prerequisites);
        } catch (error) {
            console.error('Error fetching course prerequisites:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = courseController;
