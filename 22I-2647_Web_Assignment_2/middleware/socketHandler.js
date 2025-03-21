const socketIO = require('socket.io');
const User = require('../models/User');
const Course = require('../models/Course');

function setupSocketIO(server) {
    const io = socketIO(server);

    io.use(async (socket, next) => {
        const studentId = socket.handshake.auth.studentId;
        if (!studentId) {
            return next(new Error("Authentication error"));
        }

        try {
            const user = await User.findOne({ rollNumber: studentId });
            if (!user) {
                return next(new Error("User not found"));
            }

            socket.studentId = studentId;
            socket.role = user.role;
            next();
        } catch (error) {
            next(new Error("Authentication error"));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.studentId}`);

        socket.on('join course', (courseId) => {
            socket.join(`course:${courseId}`);
            console.log(`${socket.studentId} joined course room: ${courseId}`);
        });

        socket.on('leave course', (courseId) => {
            socket.leave(`course:${courseId}`);
            console.log(`${socket.studentId} left course room: ${courseId}`);
        });

        socket.on('subscribe course', async (data) => {
            try {
                const { courseId, studentId } = data;
                const course = await Course.findById(courseId);
                if (!course) {
                    return socket.emit('subscription error', { message: 'Course not found' });
                }
                if (!course.waitlist.includes(studentId)) {
                    course.waitlist.push(studentId);
                    await course.save();
                }
                socket.emit('subscription success', { courseName: course.name });
                console.log(`${studentId} subscribed to ${course.name}`);
            } catch (error) {
                socket.emit('subscription error', { message: error.message });
            }
        });

        socket.on('unsubscribe course', async (data) => {
            try {
                const { courseId, studentId } = data;
                const course = await Course.findById(courseId);
                if (!course) return;
                course.waitlist = course.waitlist.filter(id => id !== studentId);
                await course.save();
                console.log(`${studentId} unsubscribed from ${course.name}`);
            } catch (error) {
                console.error('Unsubscribe error:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.studentId}`);
        });
    });

    return io;
}

async function notifyWaitlistedStudents(courseId) {
    try {
        const course = await Course.findById(courseId);
        if (!course || course.availableSeats <= 0 || course.waitlist.length === 0) {
            return;
        }
        const io = global.io;
        io.to(`course:${courseId}`).emit('seat available', {
            courseId: courseId,
            courseName: course.name,
            availableSeats: course.availableSeats
        });
        console.log(`Notification sent for course ${course.name}`);
    } catch (error) {
        console.error('Error notifying waitlisted students:', error);
    }
}

module.exports = { setupSocketIO, notifyWaitlistedStudents };
