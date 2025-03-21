document.addEventListener('DOMContentLoaded', function () {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForms = document.querySelectorAll('.login-form');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loginForms.forEach(form => form.classList.remove('active'));
            document.getElementById(`${tabName}-login-form`).classList.add('active');
        });
    });

    document.getElementById('student-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const rollNumber = document.getElementById('student-roll').value;
        const password = document.getElementById('student-password').value;
        const errorElement = document.getElementById('student-login-error');

        try {
            const response = await fetch('/auth/student/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rollNumber, password }),
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/student/dashboard';
            } else {
                errorElement.textContent = data.message || 'Login failed';
            }
        } catch (error) {
            console.error('Error during login:', error);
            errorElement.textContent = 'An error occurred. Please try again.';
        }
    });

    document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const errorElement = document.getElementById('admin-login-error');

        try {
            const response = await fetch('/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = '/admin/dashboard';
            } else {
                errorElement.textContent = data.message || 'Login failed';
            }
        } catch (error) {
            console.error('Error during login:', error);
            errorElement.textContent = 'An error occurred. Please try again.';
        }
    });
});
