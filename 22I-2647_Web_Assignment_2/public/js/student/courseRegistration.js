class CourseRegistrationManager {
    constructor() {
        this.courses = [];
        this.registeredCourses = [];
        this.init();
    }

    init() {
        this.loadCourses();
        this.loadRegisteredCourses();
        this.setupEventListeners();
    }

    loadCourses() {
        fetch('/courses')
            .then(response => response.json())
            .then(courses => {
                this.courses = courses;
                this.populateCoursesTable();
            })
            .catch(error => console.error('Error loading courses:', error));
    }

    loadRegisteredCourses() {
        fetch('/student/registered-courses')
            .then(response => response.json())
            .then(data => {
                this.registeredCourses = data.registeredCourses || [];
                this.updateRegistrationStatus();
            })
            .catch(error => console.error('Error loading registered courses:', error));
    }

    populateCoursesTable() {
        const coursesTableBody = document.getElementById('courses-table-body');
        if (!coursesTableBody) return;

        coursesTableBody.innerHTML = '';

        if (this.courses.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="text-center">No courses available</td>
            `;
            coursesTableBody.appendChild(row);
            return;
        }

        const sortedCourses = [...this.courses].sort((a, b) => {
            if (a.department !== b.department) {
                return a.department.localeCompare(b.department);
            }
            return a.courseCode.localeCompare(b.courseCode);
        });

        sortedCourses.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="course-checkbox" value="${course._id}" 
                        id="course-${course._id}" ${this.isRegistered(course._id) ? 'checked disabled' : ''}>
                </td>
                <td>${course.courseCode}</td>
                <td>${course.name}</td>
                <td>${course.department}</td>
                <td>
                    ${this.isRegistered(course._id) ?
                    '<span class="badge bg-success">Registered</span>' :
                    '<button class="btn btn-sm btn-primary register-single-course" data-id="' + course._id + '">Register</button>'}
                </td>
            `;
            coursesTableBody.appendChild(row);
        });

        document.querySelectorAll('.register-single-course').forEach(button => {
            button.addEventListener('click', (e) => {
                const courseId = e.target.getAttribute('data-id');
                this.registerCourse(courseId);
            });
        });
    }

    isRegistered(courseId) {
        return this.registeredCourses.some(reg => reg.courseId === courseId);
    }

    updateRegistrationStatus() {
        this.populateCoursesTable();
        const registrationCount = document.getElementById('registration-count');
        if (registrationCount) {
            registrationCount.textContent = this.registeredCourses.length;
        }
    }

    setupEventListeners() {
        const registerSelectedBtn = document.getElementById('register-selected-courses');
        if (registerSelectedBtn) {
            registerSelectedBtn.addEventListener('click', () => {
                this.registerSelectedCourses();
            });
        }

        const registerAllBtn = document.getElementById('register-all-courses');
        if (registerAllBtn) {
            registerAllBtn.addEventListener('click', () => {
                this.registerAllCourses();
            });
        }
    }

    registerCourse(courseId) {
        fetch('/student/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseIds: [courseId] })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to register course');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.loadRegisteredCourses();
                    const alertContainer = document.getElementById('registration-alerts');
                    alertContainer.innerHTML = `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        Successfully registered for the course!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
                }
            })
            .catch(error => {
                console.error('Error registering course:', error);
                const alertContainer = document.getElementById('registration-alerts');
                alertContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    Failed to register for the course. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            });
    }

    registerSelectedCourses() {
        const selectedCheckboxes = document.querySelectorAll('.course-checkbox:checked:not([disabled])');
        const courseIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);

        if (courseIds.length === 0) {
            const alertContainer = document.getElementById('registration-alerts');
            alertContainer.innerHTML = `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    Please select at least one course to register.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            return;
        }

        fetch('/student/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseIds })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to register courses');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.loadRegisteredCourses();
                    const alertContainer = document.getElementById('registration-alerts');
                    alertContainer.innerHTML = `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        Successfully registered for the selected courses!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
                }
            })
            .catch(error => {
                console.error('Error registering courses:', error);
                const alertContainer = document.getElementById('registration-alerts');
                alertContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    Failed to register for the selected courses. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            });
    }

    registerAllCourses() {
        const unregisteredCourseIds = this.courses
            .filter(course => !this.isRegistered(course._id))
            .map(course => course._id);

        if (unregisteredCourseIds.length === 0) {
            const alertContainer = document.getElementById('registration-alerts');
            alertContainer.innerHTML = `
                <div class="alert alert-info alert-dismissible fade show" role="alert">
                    You are already registered for all available courses.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            return;
        }

        fetch('/student/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ courseIds: unregisteredCourseIds })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to register all courses');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.loadRegisteredCourses();
                    const alertContainer = document.getElementById('registration-alerts');
                    alertContainer.innerHTML = `
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        Successfully registered for all available courses!
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
                }
            })
            .catch(error => {
                console.error('Error registering all courses:', error);
                const alertContainer = document.getElementById('registration-alerts');
                alertContainer.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    Failed to register for all courses. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.courseRegistrationManager = new CourseRegistrationManager();
});
