const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }

    res.status(401).json({ message: 'Authentication required' });
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    }

    res.status(403).json({ message: 'Admin access required' });
};

const isStudent = (req, res, next) => {
    if (req.session && req.session.userId && req.session.role === 'student') {
        return next();
    }

    res.status(403).json({ message: 'Student access required' });
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isStudent
};
