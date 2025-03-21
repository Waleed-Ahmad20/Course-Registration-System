class StudentManager {
  constructor(studentsListId) {
    this.studentsList = document.getElementById(studentsListId);
    this.students = [];
    this.init();
  }

  init() {
    this.fetchStudents();
  }

  async fetchStudents() {
    try {
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      this.students = await response.json();
      this.displayStudents();
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  displayStudents() {
    let html = '<table class="admin-table">';
    html += `
        <thead>
          <tr>
            <th>Roll Number</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
      `;

    this.students.forEach(student => {
      html += `
          <tr>
            <td>${student.rollNumber}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.department}</td>
            <td>
              <button class="btn view-registrations" data-student-id="${student._id}">
                View Registrations
              </button>
              <button class="btn check-prerequisites" data-student-id="${student._id}">
                Check Prerequisites
              </button>
            </td>
          </tr>
        `;
    });

    html += '</tbody></table>';
    this.studentsList.innerHTML = html;

    this.studentsList.querySelectorAll('.view-registrations').forEach(button => {
      button.addEventListener('click', (e) => {
        const studentId = e.target.getAttribute('data-student-id');
        this.viewRegistrations(studentId);
      });
    });

    this.studentsList.querySelectorAll('.check-prerequisites').forEach(button => {
      button.addEventListener('click', (e) => {
        const studentId = e.target.getAttribute('data-student-id');
        this.checkPrerequisites(studentId);
      });
    });
  }

  async viewRegistrations(studentId) {
    try {
      const response = await fetch(`/api/admin/students/${studentId}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const registrations = await response.json();
      this.showRegistrationsModal(studentId, registrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  }

  showRegistrationsModal(studentId, registrations) {
    const student = this.students.find(s => s._id === studentId);

    const modal = document.createElement('div');
    modal.className = 'modal';

    let html = `
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Registrations for ${student.name} (${student.rollNumber})</h2>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Status</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;

    if (registrations.length === 0) {
      html += `
          <tr>
            <td colspan="5">No registrations found</td>
          </tr>
        `;
    } else {
      registrations.forEach(reg => {
        html += `
            <tr>
              <td>${reg.course.courseCode}</td>
              <td>${reg.course.name}</td>
              <td>${reg.status}</td>
              <td>${new Date(reg.registrationDate).toLocaleDateString()}</td>
              <td>
                <button class="btn drop-registration" data-registration-id="${reg._id}">
                  Drop
                </button>
              </td>
            </tr>
          `;
      });
    }

    html += `
            </tbody>
          </table>
          <h3>Add Course</h3>
          <div class="course-add-form">
            <select id="course-select">
              <option value="">Select a course</option>
            </select>
            <button class="btn add-registration" data-student-id="${studentId}">
              Add Course
            </button>
          </div>
        </div>
      `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    this.fetchAvailableCoursesForSelect(modal.querySelector('#course-select'));

    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    modal.querySelectorAll('.drop-registration').forEach(button => {
      button.addEventListener('click', async (e) => {
        const registrationId = e.target.getAttribute('data-registration-id');
        await this.dropRegistration(registrationId);
        document.body.removeChild(modal);
        this.viewRegistrations(studentId);
      });
    });

    modal.querySelector('.add-registration').addEventListener('click', async () => {
      const courseId = modal.querySelector('#course-select').value;
      if (!courseId) {
        alert('Please select a course');
        return;
      }

      await this.addRegistration(studentId, courseId);
      document.body.removeChild(modal);
      this.viewRegistrations(studentId);
    });
  }

  async fetchAvailableCoursesForSelect(selectElement) {
    try {
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const courses = await response.json();

      courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id;
        option.textContent = `${course.courseCode}: ${course.name} (${course.availableSeats} seats)`;
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  }

  async addRegistration(studentId, courseId) {
    try {
      const response = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ studentId, courseId })
      });

      if (response.ok) {
        alert('Registration added successfully');
        return true;
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to add registration');
        return false;
      }
    } catch (error) {
      console.error('Error adding registration:', error);
      return false;
    }
  }

  async dropRegistration(registrationId) {
    try {
      const response = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Registration dropped successfully');
        return true;
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to drop registration');
        return false;
      }
    } catch (error) {
      console.error('Error dropping registration:', error);
      return false;
    }
  }

  async checkPrerequisites(studentId) {
    try {
      const response = await fetch(`/api/admin/students/${studentId}/prerequisites`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      this.showPrerequisitesModal(studentId, data);
    } catch (error) {
      console.error('Error checking prerequisites:', error);
    }
  }

  showPrerequisitesModal(studentId, data) {
    const student = this.students.find(s => s._id === studentId);

    const modal = document.createElement('div');
    modal.className = 'modal';

    let html = `
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Prerequisites Check for ${student.name} (${student.rollNumber})</h2>
          <h3>Completed Courses</h3>
          <ul>
      `;

    if (data.completedCourses.length === 0) {
      html += '<li>No completed courses found</li>';
    } else {
      data.completedCourses.forEach(course => {
        html += `<li>${course.courseCode}: ${course.name}</li>`;
      });
    }

    html += `
          </ul>
          <h3>Missing Prerequisites</h3>
          <table class="admin-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Missing Prerequisites</th>
              </tr>
            </thead>
            <tbody>
      `;

    if (data.missingPrerequisites.length === 0) {
      html += `
          <tr>
            <td colspan="2">No missing prerequisites found</td>
          </tr>
        `;
    } else {
      data.missingPrerequisites.forEach(item => {
        html += `
            <tr>
              <td>${item.course.courseCode}: ${item.course.name}</td>
              <td>
                <ul>
                  ${item.missing.map(prereq => `<li>${prereq.courseCode}: ${prereq.name}</li>`).join('')}
                </ul>
              </td>
            </tr>
          `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
}