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

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
      }

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
        default:
          console.error('Unknown report type:', reportId);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      const resultsContainer = this.reportsContainer.querySelector('#report-results');
      resultsContainer.innerHTML = `
              <div class="error-message">
                  <h2>Error Generating Report</h2>
                  <p>${error.message}</p>
              </div>
          `;
    }
  }

  displayCourseEnrollmentReport(data) {
    let html = `
      <h2>Course Enrollment Report</h2>
      <div class="report-actions">
          <button id="export-enrollment-csv" class="btn">Export to CSV</button>
          <button id="print-enrollment-report" class="btn">Print Report</button>
      </div>
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

    if (data.length === 0) {
      html += '<tr><td colspan="6">No courses found</td></tr>';
    } else {
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
    }

    html += '</tbody></table>';

    const resultsContainer = this.reportsContainer.querySelector('#report-results');
    resultsContainer.innerHTML = html;


    document.getElementById('export-enrollment-csv')?.addEventListener('click', () => {
      this.exportToCSV(data, 'course_enrollment_report');
    });

    document.getElementById('print-enrollment-report')?.addEventListener('click', () => {
      window.print();
    });

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

      if (!response.ok) {
        throw new Error(`Failed to fetch enrollment details: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';

      let html = `
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Students Enrolled in ${data.course.courseCode}: ${data.course.name}</h2>
          <div class="report-actions">
              <button id="export-students-csv" class="btn">Export to CSV</button>
              <button id="print-students" class="btn">Print List</button>
          </div>
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

      if (!data.students || data.students.length === 0) {
        html += '<tr><td colspan="5">No students enrolled</td></tr>';
      } else {
        data.students.forEach(student => {
          const registrationDate = student.registrationDate
            ? new Date(student.registrationDate).toLocaleDateString()
            : 'N/A';
          html += `
            <tr>
              <td>${student.rollNumber}</td>
              <td>${student.name}</td>
              <td>${student.email}</td>
              <td>${student.department}</td>
              <td>${registrationDate}</td>
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


      document.getElementById('export-students-csv')?.addEventListener('click', () => {
        this.exportToCSV(data.students, `students_${data.course.courseCode}`);
      });

      document.getElementById('print-students')?.addEventListener('click', () => {
        window.print();
      });

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
      alert(`Error fetching enrollment details: ${error.message}`);
    }
  }

  displayAvailableSeatsReport(data) {
    let html = `
      <h2>Available Seats Report</h2>
      <div class="report-actions">
          <button id="export-seats-csv" class="btn">Export to CSV</button>
          <button id="print-seats-report" class="btn">Print Report</button>
      </div>
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

    if (data.length === 0) {
      html += '<tr><td colspan="7">No courses found</td></tr>';
    } else {
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
              <td>${course.waitlistCount || 0}</td>
            </tr>
          `;
      });
    }

    html += '</tbody></table>';

    const resultsContainer = this.reportsContainer.querySelector('#report-results');
    resultsContainer.innerHTML = html;


    document.getElementById('export-seats-csv')?.addEventListener('click', () => {
      this.exportToCSV(data, 'available_seats_report');
    });

    document.getElementById('print-seats-report')?.addEventListener('click', () => {
      window.print();
    });
  }

  displayPrerequisiteIssuesReport(data) {
    let html = `
      <h2>Prerequisite Issues Report</h2>
      <div class="report-actions">
          <button id="export-prereq-csv" class="btn">Export to CSV</button>
          <button id="print-prereq-report" class="btn">Print Report</button>
      </div>
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

    if (!data || data.length === 0) {
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


    document.getElementById('export-prereq-csv')?.addEventListener('click', () => {

      const csvData = data.map(issue => ({
        'Student Name': issue.student.name,
        'Roll Number': issue.student.rollNumber,
        'Department': issue.student.department,
        'Course': `${issue.course.courseCode}: ${issue.course.name}`,
        'Missing Prerequisites': issue.missingPrerequisites.map(p => p.courseCode).join(', ')
      }));
      this.exportToCSV(csvData, 'prerequisite_issues_report');
    });

    document.getElementById('print-prereq-report')?.addEventListener('click', () => {
      window.print();
    });
  }

  displayRegistrationTrendsReport(data) {
    const resultsContainer = this.reportsContainer.querySelector('#report-results');


    if (typeof Chart === 'undefined') {
      resultsContainer.innerHTML = `
              <div class="error-message">
                  <h2>Error Loading Charts</h2>
                  <p>Chart.js library is not available. Please include Chart.js in your project.</p>
              </div>
          `;
      return;
    }

    resultsContainer.innerHTML = `
      <h2>Registration Trends Report</h2>
      <div class="report-actions">
          <button id="export-trends-csv" class="btn">Export Data</button>
          <button id="print-trends-report" class="btn">Print Report</button>
      </div>
      <div class="charts-grid">
          <div class="chart-container">
              <h3>Registration Timeline</h3>
              <canvas id="registrationChart"></canvas>
          </div>
          <div class="chart-container">
              <h3>Registration by Department</h3>
              <canvas id="departmentChart"></canvas>
          </div>
      </div>
    `;

    try {

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


      document.getElementById('export-trends-csv')?.addEventListener('click', () => {

        const timelineData = data.timeline.map(item => ({
          'Type': 'Timeline',
          'Date': item.date,
          'Count': item.count
        }));

        const departmentData = data.departments.map(item => ({
          'Type': 'Department',
          'Department': item.department,
          'Count': item.count
        }));

        this.exportToCSV([...timelineData, ...departmentData], 'registration_trends');
      });

      document.getElementById('print-trends-report')?.addEventListener('click', () => {
        window.print();
      });
    } catch (error) {
      console.error('Error displaying charts:', error);
      resultsContainer.innerHTML += `
              <div class="error-message">
                  <h3>Error Displaying Charts</h3>
                  <p>${error.message}</p>
              </div>
          `;
    }
  }

  exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      alert('No data available to export');
      return;
    }

    try {

      const headers = Object.keys(data[0]);


      let csvContent = headers.join(',') + '\n';


      data.forEach(item => {
        const row = headers.map(header => {

          let value = item[header];


          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value);
          }


          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = '"' + value.replace(/"/g, '""') + '"';
          }

          return value;
        }).join(',');

        csvContent += row + '\n';
      });


      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert(`Error exporting to CSV: ${error.message}`);
    }
  }
}


document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('reports-container')) {
    new AdminReports('reports-container');
  }
});