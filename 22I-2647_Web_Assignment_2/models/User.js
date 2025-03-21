const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    rollNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['student', 'admin'],
        default: 'student'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    department: {
        type: String,
        required: function () {
            return this.role === 'student';
        },
        trim: true
    },
    completedCourses: {
        type: [String],
        default: []
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.hasCompletedCourse = function (courseCode) {
    return this.completedCourses.includes(courseCode);
};

userSchema.methods.hasCompletedPrerequisites = function (prerequisites) {
    if (!prerequisites || prerequisites.length === 0) return true;

    return prerequisites.every(prerequisite => this.completedCourses.includes(prerequisite));
};

userSchema.statics.findStudentsByDepartment = function (department) {
    return this.find({ role: 'student', department });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
