class PrerequisiteVisualizer {
    constructor() {
        this.courses = [];
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
                this.populateCourseSelect();
            })
            .catch(error => console.error('Error loading courses:', error));
    }

    populateCourseSelect() {
        const courseSelect = document.getElementById('prerequisite-course-select');
        courseSelect.innerHTML = '<option value="">Select a course to view prerequisites</option>';

        const sortedCourses = [...this.courses].sort((a, b) => {
            if (a.department !== b.department) {
                return a.department.localeCompare(b.department);
            }
            return a.courseCode.localeCompare(b.courseCode);
        });

        sortedCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course._id;
            option.textContent = `${course.courseCode}: ${course.name}`;
            courseSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        const courseSelect = document.getElementById('prerequisite-course-select');
        courseSelect.addEventListener('change', () => {
            const courseId = courseSelect.value;
            if (courseId) {
                this.visualizePrerequisites(courseId);
            } else {
                document.getElementById('prerequisites-visualizer').innerHTML = '';
            }
        });
    }

    visualizePrerequisites(courseId) {
        const course = this.courses.find(c => c._id === courseId);
        if (!course) return;

        const visualizer = document.getElementById('prerequisites-visualizer');
        visualizer.innerHTML = '';

        const courseNode = document.createElement('div');
        courseNode.className = 'course-node main-course';
        courseNode.innerHTML = `
            <div class="course-details">
                <h3>${course.courseCode}</h3>
                <p>${course.name}</p>
            </div>
        `;

        const prereqContainer = document.createElement('div');
        prereqContainer.className = 'prerequisite-container';

        if (!course.prerequisites || course.prerequisites.length === 0) {
            prereqContainer.innerHTML = '<p class="no-prereqs">This course has no prerequisites.</p>';
        } else {
            const prereqList = document.createElement('div');
            prereqList.className = 'prerequisite-list';

            fetch('/api/student/check-prerequisites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Credentials': 'include'
                },
                body: JSON.stringify({ courseId: course._id })
            })
                .then(response => response.json())
                .then(data => {
                    const userCompletedCourses = data.meetsPrerequisites ? course.prerequisites : [];

                    course.prerequisites.forEach(prereqCode => {
                        const prereqCourse = this.courses.find(c => c.courseCode === prereqCode);

                        const prereqNode = document.createElement('div');
                        const completed = userCompletedCourses.includes(prereqCode);
                        prereqNode.className = `prerequisite-node ${completed ? 'completed' : 'missing'}`;

                        if (prereqCourse) {
                            prereqNode.innerHTML = `
                            <div class="course-details">
                                <h4>${prereqCourse.courseCode}</h4>
                                <p>${prereqCourse.name}</p>
                                <span class="prereq-status">${completed ? 'Completed' : 'Required'}</span>
                            </div>
                        `;
                        } else {
                            prereqNode.innerHTML = `
                            <div class="course-details">
                                <h4>${prereqCode}</h4>
                                <p>Course details not available</p>
                                <span class="prereq-status">${completed ? 'Completed' : 'Required'}</span>
                            </div>
                        `;
                        }

                        prereqList.appendChild(prereqNode);
                    });
                })
                .catch(error => {
                    console.error('Error checking prerequisites:', error);

                    course.prerequisites.forEach(prereqCode => {
                        const prereqCourse = this.courses.find(c => c.courseCode === prereqCode);

                        const prereqNode = document.createElement('div');
                        prereqNode.className = 'prerequisite-node';

                        if (prereqCourse) {
                            prereqNode.innerHTML = `
                            <div class="course-details">
                                <h4>${prereqCourse.courseCode}</h4>
                                <p>${prereqCourse.name}</p>
                            </div>
                        `;
                        } else {
                            prereqNode.innerHTML = `
                            <div class="course-details">
                                <h4>${prereqCode}</h4>
                                <p>Course details not available</p>
                            </div>
                        `;
                        }

                        prereqList.appendChild(prereqNode);
                    });
                });

            prereqContainer.appendChild(prereqList);
        }

        visualizer.appendChild(courseNode);
        visualizer.appendChild(prereqContainer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.prerequisiteVisualizer = new PrerequisiteVisualizer();
});
