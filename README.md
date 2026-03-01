# Course Registration System

A web-based course registration system built with Node.js, Express, and MongoDB. The application supports two roles — **Student** and **Admin** — and provides real-time seat availability updates via Socket.IO.

## Features

### Student
- Log in with roll number and password
- Browse available courses with schedule, credits, prerequisites, and seat availability
- Register for courses (prerequisite validation enforced)
- Drop registered courses
- View registered courses and their status
- Join a waitlist when a course is full and receive real-time notifications when a seat opens

### Admin
- Log in with admin credentials
- View and manage all courses and student registrations
- Register or drop students from courses
- Generate reports:
  - Course enrollment statistics
  - Available seats per course
  - Prerequisite compliance issues
  - Registration trends over time

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB with Mongoose |
| Templating | EJS |
| Real-time | Socket.IO |
| Auth | express-session + bcryptjs |
| HTTP Logging | Morgan |

## Project Structure

```
22I-2647_Web_Assignment_2/
├── config/                  # Database and app configuration
├── controllers/             # Business logic
│   ├── courseController.js
│   ├── registrationController.js
│   └── userController.js
├── middleware/
│   ├── auth.js              # Session-based authentication guards
│   └── socketHandler.js     # Socket.IO setup and waitlist notifications
├── models/
│   ├── Course.js            # Course schema (seats, schedule, prerequisites, waitlist)
│   ├── Registration.js      # Registration schema (student ↔ course)
│   └── User.js              # User schema (student / admin roles)
├── public/                  # Static assets (CSS, JS)
├── routes/
│   ├── admin.js             # Admin routes
│   ├── api.js               # REST API routes
│   ├── auth.js              # Login / logout routes
│   ├── index.js             # Root routes
│   └── student.js           # Student routes
├── views/                   # EJS templates
│   ├── admin/
│   ├── auth/
│   └── student/
├── .env                     # Environment variables (not committed)
├── package.json
└── server.js                # Application entry point
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas connection string

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Waleed-Ahmad20/Course-Registration-System.git
   cd Course-Registration-System/22I-2647_Web_Assignment_2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the `22I-2647_Web_Assignment_2` directory (or update the existing one):

   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/university_reg
   PORT=5000
   SESSION_SECRET=your_session_secret
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the server**

   ```bash
   npm start
   ```

   The application will be available at `http://localhost:5000`.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login` | Render login page |
| POST | `/auth/student/login` | Student login |
| POST | `/auth/admin/login` | Admin login |
| POST | `/auth/logout` | Log out |
| GET | `/student/dashboard` | Student dashboard (auth required) |
| GET | `/student/registered-courses` | List active registrations |
| POST | `/student/register` | Register for course(s) |
| DELETE | `/student/register/:id` | Drop a course |
| POST | `/student/check-prerequisites` | Validate prerequisites |
| GET | `/admin/dashboard` | Admin dashboard (auth required) |
| GET | `/admin/students` | List all students |
| GET | `/admin/courses` | List all courses |
| POST | `/admin/registrations` | Register a student for a course |
| DELETE | `/admin/registrations/:id` | Drop a student from a course |
| GET | `/admin/reports/:reportId` | Generate a report |

## Data Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `rollNumber` | String | Unique identifier / username |
| `password` | String | Bcrypt-hashed |
| `role` | String | `student` or `admin` |
| `name` | String | Full name |
| `email` | String | Validated format |
| `department` | String | Required for students |
| `completedCourses` | [String] | Course codes of completed courses |

### Course
| Field | Type | Notes |
|-------|------|-------|
| `courseCode` | String | Unique code |
| `name` | String | Course title |
| `description` | String | Course description |
| `department` | String | Offering department |
| `credits` | Number | Credit hours |
| `instructor` | String | Instructor name |
| `prerequisites` | [String] | Required course codes |
| `schedule` | [Object] | Day, start/end time, room |
| `totalSeats` | Number | Maximum capacity |
| `availableSeats` | Number | Remaining seats |
| `waitlist` | [String] | Student IDs on waitlist |

### Registration
| Field | Type | Notes |
|-------|------|-------|
| `studentId` | ObjectId | Reference to User |
| `courseId` | ObjectId | Reference to Course |
| `courseCode` | String | Denormalized course code |
| `courseName` | String | Denormalized course name |
| `registrationDate` | Date | When the registration was created |
| `status` | String | `active`, `dropped`, or `completed` |

## License

This project is for educational purposes.
