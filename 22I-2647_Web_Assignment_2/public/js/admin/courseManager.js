class CourseManager {
    constructor() {
        this.courses = [];
        this.init();
    }

    init() {
        this.loadCourses();
        this.setupEventListeners();
    }

    async loadCourses() {
        try {
            const response = await fetch('/api/courses', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load courses');
            this.courses = await response.json();
            this.renderCourses();
        } catch (error) {
            this.showMessage(`Error loading courses: ${error.message}`, 'error');
        }
    }

    setupEventListeners() {
        const addCourseBtn = document.getElementById('add-course-btn');
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', () => {
                this.showCourseFormModal();
            });
        }

        const courseForm = document.getElementById('course-form');
        if (courseForm) {
            courseForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.saveCourse();
            });
        }

        const cancelCourseBtn = document.getElementById('cancel-course-btn');
        if (cancelCourseBtn) {
            cancelCourseBtn.addEventListener('click', () => {
                this.closeCourseFormModal();
            });
        }

        const cancelSeatsBtn = document.getElementById('cancel-seats-btn');
        if (cancelSeatsBtn) {
            cancelSeatsBtn.addEventListener('click', () => {
                this.closeUpdateSeatsModal();
            });
        }

        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const modal = event.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('edit-course-btn')) {
                const courseId = event.target.dataset.courseId;
                this.editCourse(courseId);
            }

            if (event.target.classList.contains('delete-course-btn')) {
                const courseId = event.target.dataset.courseId;
                if (confirm('Are you sure you want to delete this course?')) {
                    this.deleteCourse(courseId);
                }
            }

            if (event.target.classList.contains('update-seats-btn')) {
                const courseId = event.target.dataset.courseId;
                this.showUpdateSeatsModal(courseId);
            }
        });

        const seatUpdateForm = document.getElementById('seat-update-form');
        if (seatUpdateForm) {
            seatUpdateForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.updateSeats();
            });
        }

        const addPrereqBtn = document.getElementById('add-prerequisite');
        if (addPrereqBtn) {
            addPrereqBtn.addEventListener('click', () => {
                this.addPrerequisiteField();
            });
        }

        const addScheduleBtn = document.getElementById('add-schedule');
        if (addScheduleBtn) {
            addScheduleBtn.addEventListener('click', () => {
                this.addScheduleField();
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
    }

    showCourseFormModal() {
        const modal = document.getElementById('course-form-modal');
        const form = document.getElementById('course-form');
        form.reset();
        form.removeAttribute('data-course-id');
        document.getElementById('form-title').textContent = 'Add New Course';
        const prereqContainer = document.getElementById('prerequisites-container');
        const scheduleContainer = document.getElementById('schedule-container');
        if (prereqContainer) {
            const prereqList = prereqContainer.querySelector('.prerequisites-list');
            if (prereqList) prereqList.innerHTML = '';
        }
        if (scheduleContainer) {
            const scheduleList = scheduleContainer.querySelector('.schedule-list');
            if (scheduleList) scheduleList.innerHTML = '';
        }
        if (modal) modal.style.display = 'block';
    }

    closeCourseFormModal() {
        const modal = document.getElementById('course-form-modal');
        if (modal) modal.style.display = 'none';
    }

    closeUpdateSeatsModal() {
        const modal = document.getElementById('update-seats-modal');
        if (modal) modal.style.display = 'none';
    }

    renderCourses() {
        const container = document.getElementById('courses-container');
        if (!container) return;
        if (this.courses.length === 0) {
            container.innerHTML = '<p>No courses found</p>';
            return;
        }
        const html = `
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Name</th>
                <th>Department</th>
                <th>Instructor</th>
                <th>Credits</th>
                <th>Seats</th>
                <th>Waitlist</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.courses.map(course => `
                <tr>
                  <td>${course.courseCode}</td>
                  <td>${course.name}</td>
                  <td>${course.department}</td>
                  <td>${course.instructor}</td>
                  <td>${course.credits}</td>
                  <td>${course.availableSeats} / ${course.totalSeats}</td>
                  <td>${course.waitlist ? course.waitlist.length : 0}</td>
                  <td>
                    <button class="btn btn-sm btn-primary edit-course-btn" data-course-id="${course._id}">
                      <i class="fa fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-info update-seats-btn" data-course-id="${course._id}">
                      <i class="fa fa-chair"></i> Seats
                    </button>
                    <button class="btn btn-sm btn-danger delete-course-btn" data-course-id="${course._id}">
                      <i class="fa fa-trash"></i> Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
        container.innerHTML = html;
    }

    async saveCourse() {
        try {
            const form = document.getElementById('course-form');
            const formData = new FormData(form);
            const courseData = {};
            formData.forEach((value, key) => {
                if (key !== 'prerequisite' && key !== 'schedule') {
                    courseData[key] = value;
                }
            });
            courseData.prerequisites = [];
            const prereqFields = document.querySelectorAll('.prerequisite-field');
            prereqFields.forEach(field => {
                const value = field.value.trim();
                if (value) courseData.prerequisites.push(value);
            });
            courseData.schedule = [];
            const scheduleRows = document.querySelectorAll('.schedule-row');
            scheduleRows.forEach(row => {
                const day = row.querySelector('.schedule-day').value;
                const startTime = row.querySelector('.schedule-start').value;
                const endTime = row.querySelector('.schedule-end').value;
                const room = row.querySelector('.schedule-room').value;
                if (day && startTime && endTime && room) {
                    courseData.schedule.push({ day, startTime, endTime, room });
                }
            });
            courseData.credits = Number(courseData.credits);
            courseData.totalSeats = Number(courseData.totalSeats);
            courseData.availableSeats = Number(courseData.availableSeats);
            const courseId = form.dataset.courseId;
            let url = '/api/courses';
            let method = 'POST';
            if (courseId) {
                url = `/api/courses/${courseId}`;
                method = 'PUT';
            }
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData),
                credentials: 'include'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save course');
            }
            this.showMessage('Course saved successfully', 'success');
            this.closeCourseFormModal();
            this.loadCourses();
        } catch (error) {
            this.showMessage(`Error saving course: ${error.message}`, 'error');
        }
    }

    async editCourse(courseId) {
        try {
            const response = await fetch(`/api/courses/${courseId}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load course details');
            const course = await response.json();
            const form = document.getElementById('course-form');
            form.dataset.courseId = courseId;
            document.getElementById('form-title').textContent = 'Edit Course';
            form.elements.courseCode.value = course.courseCode;
            form.elements.name.value = course.name;
            form.elements.description.value = course.description;
            form.elements.department.value = course.department;
            form.elements.credits.value = course.credits;
            form.elements.instructor.value = course.instructor;
            form.elements.totalSeats.value = course.totalSeats;
            form.elements.availableSeats.value = course.availableSeats;
            const prereqContainer = document.querySelector('.prerequisites-list');
            const scheduleContainer = document.querySelector('.schedule-list');
            if (prereqContainer) prereqContainer.innerHTML = '';
            if (scheduleContainer) scheduleContainer.innerHTML = '';
            if (course.prerequisites) {
                course.prerequisites.forEach(prereq => {
                    this.addPrerequisiteField(prereq);
                });
            }
            if (course.schedule) {
                course.schedule.forEach(schedule => {
                    this.addScheduleField(schedule);
                });
            }
            const modal = document.getElementById('course-form-modal');
            if (modal) modal.style.display = 'block';
        } catch (error) {
            this.showMessage(`Error editing course: ${error.message}`, 'error');
        }
    }

    async deleteCourse(courseId) {
        try {
            const response = await fetch(`/api/courses/${courseId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to delete course');
            this.showMessage('Course deleted successfully', 'success');
            this.loadCourses();
        } catch (error) {
            this.showMessage(`Error deleting course: ${error.message}`, 'error');
        }
    }

    showUpdateSeatsModal(courseId) {
        const course = this.courses.find(c => c._id === courseId);
        if (!course) return;
        const modal = document.getElementById('update-seats-modal');
        const form = document.getElementById('seat-update-form');
        form.dataset.courseId = courseId;
        document.getElementById('update-course-name').textContent = course.name;
        document.getElementById('update-course-code').textContent = course.courseCode;
        document.getElementById('total-seats').value = course.totalSeats;
        document.getElementById('available-seats').value = course.availableSeats;
        if (modal) modal.style.display = 'block';
    }

    async updateSeats() {
        try {
            const form = document.getElementById('seat-update-form');
            const courseId = form.dataset.courseId;
            const totalSeats = Number(document.getElementById('total-seats').value);
            const availableSeats = Number(document.getElementById('available-seats').value);
            if (availableSeats > totalSeats) {
                throw new Error('Available seats cannot exceed total seats');
            }
            const response = await fetch(`/api/courses/${courseId}/seats`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ totalSeats, availableSeats }),
                credentials: 'include'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update seats');
            }
            this.showMessage('Seats updated successfully', 'success');
            this.closeUpdateSeatsModal();
            this.loadCourses();
        } catch (error) {
            this.showMessage(`Error updating seats: ${error.message}`, 'error');
        }
    }

    addPrerequisiteField(value = '') {
        const container = document.querySelector('.prerequisites-list');
        if (!container) return;
        const prereqField = document.createElement('div');
        prereqField.className = 'input-group mb-2';
        prereqField.innerHTML = `
        <input type="text" class="form-control prerequisite-field" 
               placeholder="Course Code" value="${value}">
        <button type="button" class="btn btn-danger remove-field">
          <i class="fa fa-times"></i>
        </button>
      `;
        container.appendChild(prereqField);
        prereqField.querySelector('.remove-field').addEventListener('click', () => {
            prereqField.remove();
        });
    }

    addScheduleField(data = {}) {
        const container = document.querySelector('.schedule-list');
        if (!container) return;
        const index = container.children.length;
        const scheduleRow = document.createElement('div');
        scheduleRow.className = 'schedule-row border p-2 mb-2';
        scheduleRow.innerHTML = `
        <div class="d-flex align-items-center mb-2">
          <h6 class="mb-0 me-auto">Schedule ${index + 1}</h6>
          <button type="button" class="btn btn-sm btn-danger remove-schedule">
            <i class="fa fa-times"></i>
          </button>
        </div>
        <div class="row">
          <div class="col-md-3 mb-2">
            <select class="form-select schedule-day" required>
              <option value="" disabled ${!data.day ? 'selected' : ''}>Day</option>
              <option value="Monday" ${data.day === 'Monday' ? 'selected' : ''}>Monday</option>
              <option value="Tuesday" ${data.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
              <option value="Wednesday" ${data.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
              <option value="Thursday" ${data.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
              <option value="Friday" ${data.day === 'Friday' ? 'selected' : ''}>Friday</option>
              <option value="Saturday" ${data.day === 'Saturday' ? 'selected' : ''}>Saturday</option>
              <option value="Sunday" ${data.day === 'Sunday' ? 'selected' : ''}>Sunday</option>
            </select>
          </div>
          <div class="col-md-3 mb-2">
            <input type="time" class="form-control schedule-start" 
                   placeholder="Start Time" value="${data.startTime || ''}" required>
          </div>
          <div class="col-md-3 mb-2">
            <input type="time" class="form-control schedule-end" 
                   placeholder="End Time" value="${data.endTime || ''}" required>
          </div>
          <div class="col-md-3 mb-2">
            <input type="text" class="form-control schedule-room" 
                   placeholder="Room" value="${data.room || ''}" required>
          </div>
        </div>
      `;
        container.appendChild(scheduleRow);
        scheduleRow.querySelector('.remove-schedule').addEventListener('click', () => {
            scheduleRow.remove();
        });
    }

    showMessage(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;
        const container = document.getElementById('alert-container');
        if (container) {
            container.appendChild(alertDiv);
            setTimeout(() => {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 300);
            }, 5000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.courseManager = new CourseManager();
});
