# Joineazy — Student Group & Assignment Management Portal

A full-stack web application designed to streamline academic collaboration by enabling professors and students to manage courses, form groups, track assignments, and handle group-leader acknowledgments through role-based dashboards.

**Live Demo:** [https://joineazy-task1-1.onrender.com](https://joineazy-task1-1.onrender.com)

---

## Key Features

- **Role-Based Dashboards:** Dedicated interfaces and access controls for students, group leaders, and instructors/administrators.
- **Course & Assignment Management:** Create, view, and track course assignments with clear submission statuses and deadlines.
- **Student Group Formation:** Organize students into project groups with assigned group leaders.
- **Group Leader Acknowledgment Workflow:** Structured verification flow allowing group leaders to review and acknowledge group submissions and member participation.
- **Responsive Modern UI:** Fast, single-page frontend built with React and Vite.

---

## Tech Stack

- **Frontend:** React, Vite, JavaScript (ES6+), CSS
- **Backend:** Node.js, Express.js (RESTful API)
- **Database:** PostgreSQL
- **Deployment:** Render

---

## Project Structure

```text
├── frontend/               # React + Vite client application
│   ├── public/             # Static assets
│   ├── src/                # Components, pages, and API services
│   ├── index.html          # Entry HTML template
│   └── package.json        # Frontend dependencies
└── backend/                # Node.js + Express REST API & PostgreSQL schema
