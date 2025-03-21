const User = require('../models/User');
const bcrypt = require('bcryptjs');

const userController = {
    getAllStudents: async (req, res) => {
        try {
            const students = await User.find({ role: 'student' }).select('-password');
            res.json(students);
        } catch (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudentByRollNumber: async (req, res) => {
        try {
            const { rollNumber } = req.params;
            const student = await User.findOne({ rollNumber, role: 'student' }).select('-password');
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            res.json(student);
        } catch (error) {
            console.error('Error fetching student:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    createStudent: async (req, res) => {
        try {
            const {
                rollNumber,
                password,
                name,
                email,
                department,
                completedCourses
            } = req.body;
            const existingStudent = await User.findOne({ rollNumber });
            if (existingStudent) {
                return res.status(400).json({ message: 'Roll number already exists' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const newStudent = new User({
                rollNumber,
                password: hashedPassword,
                role: 'student',
                name,
                email,
                department,
                completedCourses: completedCourses || []
            });
            await newStudent.save();
            const student = newStudent.toObject();
            delete student.password;
            res.status(201).json(student);
        } catch (error) {
            console.error('Error creating student:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateStudent: async (req, res) => {
        try {
            const {
                name,
                email,
                department,
                completedCourses
            } = req.body;
            const student = await User.findOne({ rollNumber: req.params.rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            student.name = name || student.name;
            student.email = email || student.email;
            student.department = department || student.department;
            student.completedCourses = completedCourses || student.completedCourses;
            await student.save();
            const updatedStudent = student.toObject();
            delete updatedStudent.password;
            res.json(updatedStudent);
        } catch (error) {
            console.error('Error updating student:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    updateCompletedCourses: async (req, res) => {
        try {
            const { rollNumber } = req.params;
            const { completedCourses } = req.body;
            const student = await User.findOne({ rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            student.completedCourses = completedCourses;
            await student.save();
            const updatedStudent = student.toObject();
            delete updatedStudent.password;
            res.json(updatedStudent);
        } catch (error) {
            console.error('Error updating completed courses:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    deleteStudent: async (req, res) => {
        try {
            const { rollNumber } = req.params;
            const student = await User.findOneAndDelete({ rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            res.json({ message: 'Student deleted successfully' });
        } catch (error) {
            console.error('Error deleting student:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getAllAdmins: async (req, res) => {
        try {
            const admins = await User.find({ role: 'admin' }).select('-password');
            res.json(admins);
        } catch (error) {
            console.error('Error fetching admins:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    createAdmin: async (req, res) => {
        try {
            const {
                rollNumber,
                password,
                name,
                email
            } = req.body;
            const existingAdmin = await User.findOne({ rollNumber });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Username already exists' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const newAdmin = new User({
                rollNumber,
                password: hashedPassword,
                role: 'admin',
                name,
                email,
                department: 'Administration',
                completedCourses: []
            });
            await newAdmin.save();
            const admin = newAdmin.toObject();
            delete admin.password;
            res.status(201).json(admin);
        } catch (error) {
            console.error('Error creating admin:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    getStudentsMissingPrerequisites: async (req, res) => {
        try {
            const students = await User.find({ role: 'student' }).select('-password');
            const courses = await Course.find({});
            const studentsWithMissingPrereqs = [];
            for (const student of students) {
                const missingPrereqsCourses = [];
                for (const course of courses) {
                    if (course.prerequisites.length > 0) {
                        const hasAllPrereqs = course.prerequisites.every(prerequisite =>
                            student.completedCourses.includes(prerequisite)
                        );
                        if (!hasAllPrereqs) {
                            missingPrereqsCourses.push({
                                courseCode: course.courseCode,
                                name: course.name,
                                missingPrerequisites: course.prerequisites.filter(
                                    prerequisite => !student.completedCourses.includes(prerequisite)
                                )
                            });
                        }
                    }
                }
                if (missingPrereqsCourses.length > 0) {
                    studentsWithMissingPrereqs.push({
                        rollNumber: student.rollNumber,
                        name: student.name,
                        missingPrereqsCourses
                    });
                }
            }
            res.json(studentsWithMissingPrereqs);
        } catch (error) {
            console.error('Error fetching students missing prerequisites:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = userController;
