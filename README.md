# Production Control System Website

A portfolio project built to simulate a real internal operations platform for a growing multi-branch service business.

## Project Purpose

This system was designed to demonstrate how internal business tools can improve:

- job order tracking
- workflow visibility
- employee accountability
- productivity monitoring
- storage and movement control
- reporting and management insights

It reflects the type of structured systems thinking, dashboard design, workflow control, and operational visibility needed for a **Systems & Automation Specialist** role.

---

## Business Context

This project is based on the operational needs of a premium shoe cleaning and restoration company with:

- multiple mall-based branches
- a centralized production facility
- physical item movement between stores and production
- increasing service volume
- a need for stronger process control and reporting

---

## Core Features

### 1. Admin Login
- secure login page
- session-based access control
- protected internal pages

### 2. Dashboard
- total job orders
- in-production count
- completed today
- delayed jobs
- quick action navigation

### 3. Job Order Management
- create new job orders
- assign branch/store
- define service type
- set due date
- set priority level
- store notes and storage location
- search and filter job orders

### 4. Workflow Step Tracking
- initialize standard workflow steps
- assign employees to steps
- update workflow status
- record start and end times
- calculate time spent
- sync workflow progress to job order status

### 5. Employee Productivity Tracking
- total assigned steps
- completed steps
- total time spent
- average time per completed step

### 6. Storage and Movement Tracking
- current item location visibility
- record movement logs
- track from and to locations
- record transfer status
- update storage location
- maintain movement history

### 7. Reports and Management Insights
- summary report cards
- job status report
- delayed jobs report
- store volume report
- productivity summary report

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** express-session + bcrypt

---

## Project Structure

```bash
production-control-system/
├── database.js
├── server.js
├── package.json
├── production_control.db
├── README.md
└── public/
    ├── index.html
    ├── login.html
    ├── dashboard.html
    ├── job-orders.html
    ├── workflow.html
    ├── productivity.html
    ├── storage-movement.html
    ├── reports.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js

        ## Deployment

This project can be deployed on Render as a Node.js web service.

### Important deployment note
Because the project uses SQLite, the database file must be stored on a persistent disk in production.

### Environment variables used
- `NODE_ENV=production`
- `DATA_DIR=/var/data`
- `DB_PATH=/var/data/production_control.db`

### Deployment files
- `render.yaml`
- `.gitignore`

### Deployment platform
Recommended platform: Render