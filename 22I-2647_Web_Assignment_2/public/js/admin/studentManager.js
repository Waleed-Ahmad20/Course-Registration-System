class StudentManager {
  constructor(studentsListId) {
    this.studentsList = document.getElementById(studentsListId);
    this.students = [];
    this.init();
  }

  init() {
    this.fetchStudents();
    this.setupEventListeners();
  }

  setupEventListeners() {

    const addStudentBtn = document.getElementById('add-student-btn');
    if (addStudentBtn) {
      addStudentBtn.addEventListener('click', () => {
        this.showAddStudentForm();
      });
    }


    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        modal.style.display = 'none';
      });
    });


    const cancelStudentBtn = document.getElementById('cancel-student-btn');
    if (cancelStudentBtn) {
      cancelStudentBtn.addEventListener('click', () => {
        const modal = document.getElementById('student-form-modal');
        modal.style.display = 'none';
      });
    }


    const addCompletedCourseBtn = document.getElementById('add-completed-course-btn');
    if (addCompletedCourseBtn) {
      addCompletedCourseBtn.addEventListener('click', () => {
        this.addCompletedCourseRow();
      });
    }


    const studentForm = document.getElementById('student-form');
    if (studentForm) {
      studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.saveStudent();
      });
    }


    const addRegistrationBtn = document.getElementById('add-registration-btn');
    if (addRegistrationBtn) {
      addRegistrationBtn.addEventListener('click', () => {
        const studentRollElement = document.getElementById('registration-student-roll');
        if (!studentRollElement) {
          showAlert('No student selected', 'error');
          return;
        }

        const student = this.students.find(s => s.rollNumber === studentRollElement.textContent);
        if (!student) {
          showAlert('Student not found', 'error');
          return;
        }

        const courseSelect = document.getElementById('add-course-select');
        if (!courseSelect.value) {
          showAlert('Please select a course', 'error');
          return;
        }

        this.addRegistration(student._id, courseSelect.value)
          .then(success => {
            if (success) {
              this.viewRegistrations(student._id);
            }
          });
      });
    }


    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  }

  async fetchStudents() {
    try {
      const response = await fetch('/api/admin/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.students = await response.json();
      this.displayStudents();
    } catch (error) {
      console.error('Error fetching students:', error);
      showAlert('Failed to load students', 'error');
    }
  }

  displayStudents() {
    let html = '<div class="table-container">';
    html += '<table class="data-table">';
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

    if (this.students.length === 0) {
      html += '<tr><td colspan="5" class="no-data">No students found</td></tr>';
    } else {
      this.students.forEach(student => {
        html += `
          <tr>
            <td>${student.rollNumber}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.department}</td>
            <td class="actions-cell">
              <button class="btn-action edit-student" data-student-id="${student._id}" title="Edit Student">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-action view-registrations" data-student-id="${student._id}" title="View Registrations">
                <i class="fas fa-list"></i> Registrations
              </button>
              <button class="btn-action delete-student" data-student-id="${student._id}" title="Delete Student">
                <i class="fas fa-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      });
    }

    html += '</tbody></table></div>';
    this.studentsList.innerHTML = html;


    this.studentsList.querySelectorAll('.edit-student').forEach(button => {
      button.addEventListener('click', (e) => {
        const studentId = e.target.closest('.btn-action').getAttribute('data-student-id');
        this.showEditStudentForm(studentId);
      });
    });

    this.studentsList.querySelectorAll('.view-registrations').forEach(button => {
      button.addEventListener('click', (e) => {
        const studentId = e.target.closest('.btn-action').getAttribute('data-student-id');
        this.viewRegistrations(studentId);
      });
    });

    this.studentsList.querySelectorAll('.delete-student').forEach(button => {
      button.addEventListener('click', (e) => {
        const studentId = e.target.closest('.btn-action').getAttribute('data-student-id');
        const student = this.students.find(s => s._id === studentId);
        if (confirm(`Are you sure you want to delete ${student.name} (${student.rollNumber})?`)) {
          this.deleteStudent(studentId);
        }
      });
    });
  }

  async deleteStudent(studentId) {
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showAlert('Student deleted successfully', 'success');
        this.fetchStudents();
      } else {
        const error = await response.json();
        showAlert(error.message || 'Failed to delete student', 'error');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      showAlert('An error occurred while deleting the student', 'error');
    }
  }

  showAddStudentForm() {
    document.getElementById('student-form').reset();
    document.getElementById('student-id').value = '';
    document.getElementById('student-form-title').textContent = 'Add New Student';
    document.querySelector('.completed-courses-list').innerHTML = '';


    this.addCompletedCourseRow();

    const modal = document.getElementById('student-form-modal');
    modal.style.display = 'block';
  }

  showEditStudentForm(studentId) {
    const student = this.students.find(s => s._id === studentId);
    if (!student) return;

    document.getElementById('student-id').value = student._id;
    document.getElementById('student-roll').value = student.rollNumber;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-email').value = student.email;
    document.getElementById('student-department').value = student.department;
    document.getElementById('student-password').value = '';
    document.getElementById('student-form-title').textContent = 'Edit Student';

    const completedCoursesList = document.querySelector('.completed-courses-list');
    completedCoursesList.innerHTML = '';

    if (student.completedCourses && student.completedCourses.length > 0) {
      student.completedCourses.forEach(course => {
        this.addCompletedCourseRow(course);
      });
    } else {

      this.addCompletedCourseRow();
    }

    const modal = document.getElementById('student-form-modal');
    modal.style.display = 'block';
  }

  addCompletedCourseRow(preselectedCourse = null) {
    const completedCoursesList = document.querySelector('.completed-courses-list');
    const courseRow = document.createElement('div');
    courseRow.className = 'completed-course-row';

    courseRow.innerHTML = `
      <select class="completed-course-select">
        <option value="">Select a course</option>
      </select>
      <button type="button" class="remove-course-btn">Remove</button>
    `;
    completedCoursesList.appendChild(courseRow);

    const select = courseRow.querySelector('.completed-course-select');
    this.fetchCoursesForSelect(select, preselectedCourse);

    courseRow.querySelector('.remove-course-btn').addEventListener('click', (e) => {
      completedCoursesList.removeChild(courseRow);
    });
  }

  async fetchCoursesForSelect(selectElement, preselectedCourse = null) {
    try {
      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const courses = await response.json();

      courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id;
        option.textContent = `${course.courseCode}: ${course.name}`;
        if (preselectedCourse && course._id === preselectedCourse) {
          option.selected = true;
        }
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
      showAlert('Failed to load courses', 'error');
    }
  }

  async saveStudent() {
    const studentId = document.getElementById('student-id').value;
    const isEdit = studentId !== '';

    const formData = {
      rollNumber: document.getElementById('student-roll').value,
      name: document.getElementById('student-name').value,
      email: document.getElementById('student-email').value,
      department: document.getElementById('student-department').value,
      completedCourses: []
    };

    const password = document.getElementById('student-password').value;
    if (password || !isEdit) {
      formData.password = password;
    }

    const completedCourseSelects = document.querySelectorAll('.completed-course-select');
    completedCourseSelects.forEach(select => {
      if (select.value) {
        formData.completedCourses.push(select.value);
      }
    });

    try {
      let response;
      if (isEdit) {
        response = await fetch(`/api/admin/students/${studentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });
      } else {
        response = await fetch('/api/admin/students', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        showAlert(isEdit ? 'Student updated successfully' : 'Student added successfully', 'success');
        document.getElementById('student-form-modal').style.display = 'none';
        this.fetchStudents();
      } else {
        const error = await response.json();
        showAlert(error.message || 'Failed to save student', 'error');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      showAlert('An error occurred while saving the student', 'error');
    }
  }

  async viewRegistrations(studentId) {
    try {
      const response = await fetch(`/api/admin/students/${studentId}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const registrations = await response.json();
      const student = this.students.find(s => s._id === studentId);

      if (!student) {
        showAlert('Student not found', 'error');
        return;
      }

      document.getElementById('registration-student-name').textContent = student.name;
      document.getElementById('registration-student-roll').textContent = student.rollNumber;


      const tableBody = document.querySelector('#registered-courses-table tbody');
      tableBody.innerHTML = '';

      if (registrations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No registered courses</td></tr>';
      } else {
        registrations.forEach(reg => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${reg.course.courseCode}</td>
            <td>${reg.course.name}</td>
            <td><span class="status-badge status-${reg.status.toLowerCase()}">${reg.status}</span></td>
            <td>
              <button class="btn-action drop-registration" data-registration-id="${reg._id}">
                <i class="fas fa-trash"></i> Drop
              </button>
            </td>
          `;
          tableBody.appendChild(row);


          row.querySelector('.drop-registration').addEventListener('click', (e) => {
            if (confirm('Are you sure you want to drop this registration?')) {
              this.dropRegistration(reg._id).then(success => {
                if (success) this.viewRegistrations(studentId);
              });
            }
          });
        });
      }


      this.fetchAvailableCoursesForSelect(document.getElementById('add-course-select'));


      document.getElementById('student-registration-modal').style.display = 'block';
    } catch (error) {
      console.error('Error fetching registrations:', error);
      showAlert('Failed to load student registrations', 'error');
    }
  }

  async fetchAvailableCoursesForSelect(selectElement) {
    try {
      selectElement.innerHTML = '<option value="">Select a course</option>';

      const response = await fetch('/api/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const courses = await response.json();

      courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course._id;
        option.textContent = `${course.courseCode}: ${course.name} (${course.availableSeats} seats)`;
        selectElement.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching available courses:', error);
      showAlert('Failed to load available courses', 'error');
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
        showAlert('Registration added successfully', 'success');
        return true;
      } else {
        const error = await response.json();
        showAlert(error.message || 'Failed to add registration', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error adding registration:', error);
      showAlert('An error occurred while adding registration', 'error');
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
        showAlert('Registration dropped successfully', 'success');
        return true;
      } else {
        const error = await response.json();
        showAlert(error.message || 'Failed to drop registration', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error dropping registration:', error);
      showAlert('An error occurred while dropping registration', 'error');
      return false;
    }
  }
}

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alertContainer.removeChild(alert);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  new StudentManager('students-list');
});