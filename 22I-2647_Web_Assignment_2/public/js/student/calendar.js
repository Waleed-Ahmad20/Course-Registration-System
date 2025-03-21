class Calendar {
  constructor() {
    this.selectedCourses = [];
    this.init();
  }

  init() {
    this.renderWeeklyCalendar();
    this.setupEventListeners();
    this.loadRegisteredCourses();
  }

  renderWeeklyCalendar() {
    const calendarContainer = document.getElementById('weekly-calendar');
    const days = ['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const hours = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    let calendarHTML = '<table class="calendar-table">';
    calendarHTML += '<thead><tr>';

    days.forEach(day => {
      calendarHTML += `<th>${day}</th>`;
    });

    calendarHTML += '</tr></thead><tbody>';

    hours.forEach(hour => {
      calendarHTML += '<tr>';
      calendarHTML += `<td class="time-slot">${hour}</td>`;

      for (let i = 1; i < days.length; i++) {
        calendarHTML += `<td class="calendar-cell" data-day="${days[i]}" data-time="${hour}"></td>`;
      }

      calendarHTML += '</tr>';
    });

    calendarHTML += '</tbody></table>';
    calendarContainer.innerHTML = calendarHTML;
  }

  setupEventListeners() {
    document.getElementById('register-courses-btn').addEventListener('click', () => {
      this.registerSelectedCourses();
    });
  }

  loadRegisteredCourses() {
    fetch('/student/courses')
      .then(response => response.json())
      .then(registrations => {
        registrations.forEach(reg => {
          const course = reg.courseId;
          this.addCourseToSchedule(course, true);
        });
        this.updateSelectedCoursesList();
      })
      .catch(error => console.error('Error loading registered courses:', error));
  }

  addCourseToSchedule(course, isRegistered = false) {
    if (this.selectedCourses.find(c => c._id === course._id)) {
      return;
    }

    course.isRegistered = isRegistered;
    this.selectedCourses.push(course);

    course.schedule.forEach(scheduleItem => {
      const { day, startTime, endTime } = scheduleItem;
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const cell = document.querySelector(`.calendar-cell[data-day="${day}"][data-time="${hour}:00"]`);
        if (cell) {
          const courseElement = document.createElement('div');
          courseElement.className = `calendar-event ${isRegistered ? 'registered' : 'selected'}`;
          courseElement.textContent = `${course.courseCode}`;
          courseElement.setAttribute('data-course-id', course._id);
          courseElement.title = `${course.name}\n${startTime}-${endTime}`;
          cell.appendChild(courseElement);
        }
      }
    });

    this.updateSelectedCoursesList();
  }

  removeCourseFromSchedule(courseId) {
    this.selectedCourses = this.selectedCourses.filter(course => course._id !== courseId);

    document.querySelectorAll(`.calendar-event[data-course-id="${courseId}"]`).forEach(el => {
      el.remove();
    });

    this.updateSelectedCoursesList();
  }

  updateSelectedCoursesList() {
    const container = document.getElementById('selected-courses-list');
    container.innerHTML = '';

    if (this.selectedCourses.length === 0) {
      container.innerHTML = '<p>No courses selected yet.</p>';
      return;
    }

    const unregisteredCourses = this.selectedCourses.filter(course => !course.isRegistered);
    const registeredCourses = this.selectedCourses.filter(course => course.isRegistered);

    if (unregisteredCourses.length > 0) {
      container.innerHTML += '<h3>Courses to Register</h3>';
      const unregList = document.createElement('ul');
      unregList.className = 'course-list';

      unregisteredCourses.forEach(course => {
        const listItem = document.createElement('li');
        listItem.className = 'course-item';
        listItem.innerHTML = `
                  <div class="course-info">
                      <span class="course-code">${course.courseCode}</span>
                      <span class="course-name">${course.name}</span>
                  </div>
                  <div class="course-actions">
                      <button class="btn-remove" data-course-id="${course._id}">Remove</button>
                      <button class="btn-register" data-course-id="${course._id}">Register</button>
                  </div>
              `;
        unregList.appendChild(listItem);
      });

      container.appendChild(unregList);
    }

    if (registeredCourses.length > 0) {
      container.innerHTML += '<h3>Registered Courses</h3>';
      const regList = document.createElement('ul');
      regList.className = 'course-list registered';

      registeredCourses.forEach(course => {
        const listItem = document.createElement('li');
        listItem.className = 'course-item';
        listItem.innerHTML = `
                  <div class="course-info">
                      <span class="course-code">${course.courseCode}</span>
                      <span class="course-name">${course.name}</span>
                  </div>
                  <div class="course-actions">
                      <button class="btn-drop" data-course-id="${course._id}">Drop</button>
                  </div>
              `;
        regList.appendChild(listItem);
      });

      container.appendChild(regList);
    }

    container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.target.dataset.courseId;
        this.removeCourseFromSchedule(courseId);
      });
    });

    container.querySelectorAll('.btn-register').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.target.dataset.courseId;
        this.registerCourse(courseId);
      });
    });

    container.querySelectorAll('.btn-drop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const courseId = e.target.dataset.courseId;
        this.dropCourse(courseId);
      });
    });
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
          return response.json().then(data => {
            throw new Error(data.message || 'Failed to register course');
          });
        }
        return response.json();
      })
      .then(data => {
        const course = this.selectedCourses.find(c => c._id === courseId);
        if (course) {
          course.isRegistered = true;
          this.updateSelectedCoursesList();

          document.querySelectorAll(`.calendar-event[data-course-id="${courseId}"]`).forEach(el => {
            el.classList.remove('selected');
            el.classList.add('registered');
          });

          alert('Course registered successfully');
        }
      })
      .catch(error => {
        alert(error.message);
        console.error('Error registering course:', error);
      });
  }

  registerSelectedCourses() {
    const unregisteredCourses = this.selectedCourses.filter(course => !course.isRegistered);

    if (unregisteredCourses.length === 0) {
      alert('No courses selected to register.');
      return;
    }

    const courseIds = unregisteredCourses.map(course => course._id);

    fetch('/student/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ courseIds })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || 'Failed to register courses');
          });
        }
        return response.json();
      })
      .then(data => {
        unregisteredCourses.forEach(course => {
          course.isRegistered = true;
          document.querySelectorAll(`.calendar-event[data-course-id="${course._id}"]`).forEach(el => {
            el.classList.remove('selected');
            el.classList.add('registered');
          });
        });

        this.updateSelectedCoursesList();
        alert(`Successfully registered ${unregisteredCourses.length} course(s)`);
      })
      .catch(error => {
        console.error('Error registering courses:', error);
        alert('An error occurred while registering courses: ' + error.message);
      });
  }

  dropCourse(courseId) {
    fetch(`/student/register/${courseId}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || 'Failed to drop course');
          });
        }
        return response.json();
      })
      .then(data => {
        this.removeCourseFromSchedule(courseId);
        alert('Course dropped successfully');
      })
      .catch(error => {
        alert(error.message);
        console.error('Error dropping course:', error);
      });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.calendar = new Calendar();
});
