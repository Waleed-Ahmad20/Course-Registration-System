const mongoose = require('mongoose');
const { notifyWaitlistedStudents } = require('../middleware/socketHandler');

const scheduleSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    startTime: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    endTime: {
        type: String,
        required: true,
        match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },
    room: {
        type: String,
        required: true,
        trim: true
    }
});

const courseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    credits: {
        type: Number,
        required: true,
        min: 0
    },
    instructor: {
        type: String,
        required: true,
        trim: true
    },
    prerequisites: {
        type: [String],
        default: []
    },
    schedule: {
        type: [scheduleSchema],
        required: true
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 0
    },
    availableSeats: {
        type: Number,
        required: true,
        min: 0
    },
    waitlist: {
        type: [String],
        default: []
    }
}, { timestamps: true });

courseSchema.virtual('fullName').get(function () {
    return `${this.courseCode}: ${this.name}`;
});

courseSchema.methods.hasAvailableSeats = function () {
    return this.availableSeats > 0;
};

courseSchema.statics.findByDepartment = function (department) {
    return this.find({ department });
};

courseSchema.statics.findWithAvailableSeats = function () {
    return this.find({ availableSeats: { $gt: 0 } });
};

courseSchema.methods.updateSeats = async function (newAvailableSeats) {
    const oldAvailableSeats = this.availableSeats;
    this.availableSeats = newAvailableSeats;

    if (oldAvailableSeats === 0 && newAvailableSeats > 0) {
        await this.save();
        notifyWaitlistedStudents(this._id);
        return true;
    }

    return await this.save();
};

courseSchema.methods.addToWaitlist = async function (studentId) {
    if (!this.waitlist.includes(studentId)) {
        this.waitlist.push(studentId);
        return await this.save();
    }
    return this;
};

courseSchema.methods.removeFromWaitlist = async function (studentId) {
    this.waitlist = this.waitlist.filter(id => id !== studentId);
    return await this.save();
};

courseSchema.pre('save', function (next) {
    if (this.availableSeats > this.totalSeats) {
        this.availableSeats = this.totalSeats;
    }
    next();
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
