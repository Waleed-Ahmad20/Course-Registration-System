class CourseSearch {
    constructor() {
        this.courses = [];
        this.departments = new Set();
        this.init();
    }

    init() {
        this.loadCourses();
        this.setupEventListeners();
    }

    loadCourses() {
        fetch('/api/courses')
            .then(response => response.json())
            .then(courses => {
                this.courses = courses;
                courses.forEach(course => {
                    if (course.department) {
                        this.departments.add(course.department);
                    }
                });
                this.populateDepartmentFilter();
                this.renderCourseList(courses);
            })
            .catch(error => console.error('Error loading courses:', error));
    }

    populateDepartmentFilter() {
        const departmentFilter = document.getElementById('department-filter');
        const sortedDepartments = Array.from(this.departments).sort();
        sortedDepartments.forEach(department => {
            const option = document.createElement('option');
            option.value = department;
            option.textContent = department;
            departmentFilter.appendChild(option);
        });
    }

    setupEventListeners() {
        const searchInput = document.getElementById('course-search');
        const departmentFilter = document.getElementById('department-filter');
        const dayFilter = document.getElementById('day-filter');
        const timeFilter = document.getElementById('time-filter');
        const seatsFilter = document.getElementById('seats-filter');

        const applyFilters = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const department = departmentFilter.value;
            const day = dayFilter.value;
            const timeRange = timeFilter.value;
            const onlyWithSeats = seatsFilter.checked;
            let filteredCourses = this.courses;
            if (searchTerm) {
                filteredCourses = filteredCourses.filter(course =>
                    course.courseCode.toLowerCase().includes(searchTerm) ||
                    course.name.toLowerCase().includes(searchTerm) ||
                    (course.instructor && course.instructor.toLowerCase().includes(searchTerm))
                );
            }
            if (department) {
                filteredCourses = filteredCourses.filter(course => course.department === department);
            }
            if (day) {
                filteredCourses = filteredCourses.filter(course =>
                    course.schedule && course.schedule.some(slot => slot.day === day)
                );
            }
            if (timeRange) {
                const [startHour, endHour] = timeRange.split('-').map(Number);
                filteredCourses = filteredCourses.filter(course => {
                    if (!course.schedule) return false;
                    return course.schedule.some(slot => {
                        const slotStartHour = parseInt(slot.startTime.split(':')[0]);
                        const slotEndHour = parseInt(slot.endTime.split(':')[0]);
                        return slotStartHour >= startHour && slotEndHour <= endHour;
                    });
                });
            }
            if (onlyWithSeats) {
                filteredCourses = filteredCourses.filter(course =>
                    course.availableSeats && course.availableSeats > 0
                );
            }
            this.renderCourseList(filteredCourses);
        };

        searchInput.addEventListener('input', applyFilters);
        departmentFilter.addEventListener('change', applyFilters);
        dayFilter.addEventListener('change', applyFilters);
        timeFilter.addEventListener('change', applyFilters);
        seatsFilter.addEventListener('change', applyFilters);
    }

    renderCourseList(courses) {
        const courseList = document.getElementById('course-list');
        courseList.innerHTML = '';
        if (courses.length === 0) {
            courseList.innerHTML = '<p class="no-results">No courses found matching your criteria.</p>';
            return;
        }
        courses.forEach(course => {
            const courseCard = document.createElement('div');
            courseCard.className = 'course-card';
            let scheduleHtml = '';
            if (course.schedule && course.schedule.length > 0) {
                scheduleHtml = '<div class="course-schedule"><h4>Schedule:</h4><ul>';
                course.schedule.forEach(slot => {
                    scheduleHtml += `<li>${slot.day}: ${slot.startTime} - ${slot.endTime}</li>`;
                });
                scheduleHtml += '</ul></div>';
            }
            let prerequisitesHtml = '';
            if (course.prerequisites && course.prerequisites.length > 0) {
                prerequisitesHtml = '<div class="course-prerequisites"><h4>Prerequisites:</h4>';
                prerequisitesHtml += `<p>${course.prerequisites.join(', ')}</p></div>`;
            }
            let seatsClass = '';
            if (course.availableSeats <= 0) {
                seatsClass = 'no-seats';
            } else if (course.availableSeats < 5) {
                seatsClass = 'low-seats';
            }
            courseCard.innerHTML = `
                <div class="course-header">
                    <h3>${course.courseCode}: ${course.name}</h3>
                    <span class="course-dept">${course.department || 'N/A'}</span>
                </div>
                <div class="course-details">
                    <p><strong>Instructor:</strong> ${course.instructor || 'TBA'}</p>
                    <p><strong>Credits:</strong> ${course.credits || 'N/A'}</p>
                    <p class="seats ${seatsClass}"><strong>Available Seats:</strong> ${course.availableSeats || 0} / ${course.totalSeats || 0}</p>
                    ${scheduleHtml}
                    ${prerequisitesHtml}
                    <div class="course-description">
                        <p>${course.description || 'No description available.'}</p>
                    </div>
                </div>
                <div class="course-actions">
                    <button class="btn-add-course" data-course-id="${course._id}">Add to Schedule</button>
                </div>
            `;
            courseList.appendChild(courseCard);
            const addButton = courseCard.querySelector('.btn-add-course');
            addButton.addEventListener('click', () => {
                if (window.calendar) {
                    window.calendar.addCourseToSchedule(course);
                    alert(`Added ${course.courseCode} to your schedule`);
                } else {
                    alert('Calendar not initialized');
                }
            });
        });
    }
}
