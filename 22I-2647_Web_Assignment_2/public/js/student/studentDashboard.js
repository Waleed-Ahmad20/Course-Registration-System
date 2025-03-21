class StudentDashboard {
    constructor() {
        this.studentInfo = null;
        this.init();
    }

    init() {
        this.loadStudentInfo();
        this.setupLogout();
    }

    loadStudentInfo() {
        fetch('/auth/me')
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        window.location.href = '/auth/login';
                        throw new Error('Not authenticated');
                    }
                    throw new Error('Failed to load student info');
                }
                return response.json();
            })
            .then(data => {
                this.studentInfo = data;
                this.updateStudentInfo();
            })
            .catch(error => {
                console.error('Error loading student info:', error);
                if (error.message !== 'Not authenticated') {
                    document.getElementById('student-name').textContent = 'Error loading data';
                    document.getElementById('student-id').textContent = 'Please refresh the page';
                }
            });
    }

    updateStudentInfo() {
        if (!this.studentInfo) return;

        document.getElementById('student-name').textContent = this.studentInfo.name || 'N/A';
        document.getElementById('student-id').textContent = this.studentInfo.rollNumber || 'N/A';

        if (document.getElementById('student-department')) {
            document.getElementById('student-department').textContent = this.studentInfo.department || 'N/A';
        }

        if (document.getElementById('student-email')) {
            document.getElementById('student-email').textContent = this.studentInfo.email || 'N/A';
        }
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                })
                    .then(response => {
                        if (response.ok) {
                            window.location.href = '/auth/login';
                        } else {
                            throw new Error('Failed to logout');
                        }
                    })
                    .catch(error => {
                        console.error('Error during logout:', error);
                        window.location.href = '/auth/login';
                    });
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.studentDashboard = new StudentDashboard();
});
