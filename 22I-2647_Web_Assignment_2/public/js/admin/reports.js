class AdminReports {
    constructor(reportsContainerId) {
        this.reportsContainer = document.getElementById(reportsContainerId);
        this.init();
    }

    init() {
        this.createReportButtons();
    }

    createReportButtons() {
        const reports = [
            {
                id: 'course-enrollment',
                title: 'Course Enrollment Report',
                description: 'List of students registered for each course'
            },
            {
                id: 'available-seats',
                title: 'Available Seats Report',
                description: 'List of courses with available seats'
            },
            {
                id: 'prerequisite-issues',
                title: 'Prerequisite Issues Report',
                description: 'List of students with missing prerequisites'
            },
            {
                id: 'registration-trends',
                title: 'Registration Trends Report',
                description: 'Analysis of registration patterns over time'
            }
        ];

        let html = '<div class="reports-grid">';

        reports.forEach(report => {
            html += `
          <div class="report-card">
            <h3>${report.title}</h3>
            <p>${report.description}</p>
            <button class="btn generate-report" data-report-id="${report.id}">
              Generate Report
            </button>
          </div>
        `;
        });

        html += '</div>';
        html += '<div id="report-results" class="report-results"></div>';

        this.reportsContainer.innerHTML = html;

        this.reportsContainer.querySelectorAll('.generate-report').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportId = e.target.getAttribute('data-report-id');
                this.generateReport(reportId);
            });
        });
    }

    async generateReport(reportId) {
        try {
            const response = await fetch(`/api/admin/reports/${reportId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            switch (reportId) {
                case 'course-enrollment':
                    this.displayCourseEnrollmentReport(data);
                    break;
                case 'available-seats':
                    this.displayAvailableSeatsReport(data);
                    break;
                case 'prerequisite-issues':
                    this.displayPrerequisiteIssuesReport(data);
                    break;
                case 'registration-trends':
                    this.displayRegistrationTrendsReport(data);
                    break;
            }
        } catch (error) {
            console.error('Error generating report:', error);
        }
    }

    displayCourseEnrollmentReport(data) {
        let html = `
        <h2>Course Enrollment Report</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Enrolled Students</th>
              <th>Total Seats</th>
              <th>Fill Rate</th>
              <th>View Details</th>
            </tr>
          </thead>
          <tbody>
      `;

        data.forEach(course => {
            const fillRate = (course.enrolledCount / course.totalSeats * 100).toFixed(2);
            html += `
          <tr>
            <td>${course.courseCode}</td>
            <td>${course.name}</td>
            <td>${course.enrolledCount}</td>
            <td>${course.totalSeats}</td>
            <td>${fillRate}%</td>
            <td>
              <button class="btn view-enrollment-details" data-course-id="${course._id}">
                View Students
              </button>
            </td>
          </tr>
        `;
        });

        html += '</tbody></table>';

        const resultsContainer = this.reportsContainer.querySelector('#report-results');
        resultsContainer.innerHTML = html;

        resultsContainer.querySelectorAll('.view-enrollment-details').forEach(button => {
            button.addEventListener('click', async (e) => {
                const courseId = e.target.getAttribute('data-course-id');
                await this.viewEnrollmentDetails(courseId);
            });
        });
    }

    async viewEnrollmentDetails(courseId) {
        try {
            const response = await fetch(`/api/admin/reports/course-enrollment/${courseId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            const modal = document.createElement('div');
            modal.className = 'modal';

            let html = `
          <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Students Enrolled in ${data.course.courseCode}: ${data.course.name}</h2>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Registration Date</th>
                </tr>
              </thead>
              <tbody>
        `;

            if (data.students.length === 0) {
                html += '<tr><td colspan="5">No students enrolled</td></tr>';
            } else {
                data.students.forEach(student => {
                    html += `
              <tr>
                <td>${student.rollNumber}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.department}</td>
                <td>${new Date(student.registrationDate).toLocaleDateString()}</td>
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
        } catch (error) {
            console.error('Error fetching enrollment details:', error);
        }
    }

    displayAvailableSeatsReport(data) {
        let html = `
        <h2>Available Seats Report</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Department</th>
              <th>Available Seats</th>
              <th>Total Seats</th>
              <th>Fill Rate</th>
              <th>Waitlist</th>
            </tr>
          </thead>
          <tbody>
      `;

        data.forEach(course => {
            const fillRate = ((course.totalSeats - course.availableSeats) / course.totalSeats * 100).toFixed(2);
            html += `
          <tr>
            <td>${course.courseCode}</td>
            <td>${course.name}</td>
            <td>${course.department}</td>
            <td>${course.availableSeats}</td>
            <td>${course.totalSeats}</td>
            <td>${fillRate}%</td>
            <td>${course.waitlistCount}</td>
          </tr>
        `;
        });

        html += '</tbody></table>';

        const resultsContainer = this.reportsContainer.querySelector('#report-results');
        resultsContainer.innerHTML = html;
    }

    displayPrerequisiteIssuesReport(data) {
        let html = `
        <h2>Prerequisite Issues Report</h2>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Roll Number</th>
              <th>Department</th>
              <th>Course</th>
              <th>Missing Prerequisites</th>
            </tr>
          </thead>
          <tbody>
      `;

        if (data.length === 0) {
            html += '<tr><td colspan="5">No prerequisite issues found</td></tr>';
        } else {
            data.forEach(issue => {
                html += `
            <tr>
              <td>${issue.student.name}</td>
              <td>${issue.student.rollNumber}</td>
              <td>${issue.student.department}</td>
              <td>${issue.course.courseCode}: ${issue.course.name}</td>
              <td>
                <ul>
                  ${issue.missingPrerequisites.map(prereq =>
                    `<li>${prereq.courseCode}: ${prereq.name}</li>`
                ).join('')}
                </ul>
              </td>
            </tr>
          `;
            });
        }

        html += '</tbody></table>';

        const resultsContainer = this.reportsContainer.querySelector('#report-results');
        resultsContainer.innerHTML = html;
    }

    displayRegistrationTrendsReport(data) {
        const resultsContainer = this.reportsContainer.querySelector('#report-results');
        resultsContainer.innerHTML = `
        <h2>Registration Trends Report</h2>
        <div class="chart-container">
          <canvas id="registrationChart"></canvas>
        </div>
        <div class="chart-container">
          <canvas id="departmentChart"></canvas>
        </div>
      `;

        const regCtx = document.getElementById('registrationChart').getContext('2d');
        new Chart(regCtx, {
            type: 'line',
            data: {
                labels: data.timeline.map(item => item.date),
                datasets: [{
                    label: 'Registrations',
                    data: data.timeline.map(item => item.count),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Registrations'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });

        const deptCtx = document.getElementById('departmentChart').getContext('2d');
        new Chart(deptCtx, {
            type: 'pie',
            data: {
                labels: data.departments.map(item => item.department),
                datasets: [{
                    data: data.departments.map(item => item.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Registration Distribution by Department'
                    }
                }
            }
        });
    }
}
