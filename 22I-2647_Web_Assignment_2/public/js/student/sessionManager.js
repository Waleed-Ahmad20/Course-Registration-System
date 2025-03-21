class SessionManager {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        this.loadUserInfo();
        this.setupLogout();
    }

    loadUserInfo() {
        fetch('/auth/me')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Not authenticated');
                }
                return response.json();
            })
            .then(data => {
                this.user = data.user;
                document.getElementById('student-name').textContent = data.user.name;
                document.getElementById('student-roll').textContent = `Roll: ${data.user.rollNumber}`;
            })
            .catch(error => {
                console.error('Error loading user info:', error);
                window.location.href = '/auth/login';
            });
    }

    setupLogout() {
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();

            fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(data => {
                    window.location.href = '/auth/login';
                })
                .catch(error => console.error('Logout error:', error));
        });
    }

    getUser() {
        return this.user;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager = new SessionManager();
});
