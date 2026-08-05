# 📊 Attendance Atlas

## Smart Attendance Management System 🚀

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/flask-2.0%2B-green.svg)](https://flask.palletsprojects.com)
[![SQLite](https://img.shields.io/badge/database-SQLite-orange.svg)](https://sqlite.org)
[![License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)

> ✨ A comprehensive web-based attendance management system with real-time tracking, advanced analytics, and role-based access control.

---

## 📋 Overview

Attendance Atlas eliminates manual attendance tracking challenges by providing automated recording, real-time analytics, and comprehensive reporting. Built with Flask and modern web technologies, it serves students, lecturers, and administrators through dedicated dashboards.

### 🌟 Key Benefits

* ✅ Automated attendance tracking
* 📈 Real-time analytics dashboard
* 🔒 Secure role-based access
* 📄 Multi-format report generation
* 🎯 Department-specific data filtering

---

## ⚡ Features

### 🔐 Security & Authentication

* 🛡️ Brute force protection with account lockout (5 attempts)
* 🌐 IP-based blocking and cooldown periods
* 🔑 bcrypt password hashing
* 📧 OTP-based password recovery
* ⏱️ Session management with automatic timeout

### 👨‍🎓 Student Features

* 📊 Personal attendance dashboard with real-time percentages
* 📚 Subject-wise performance analytics
* 📈 Interactive charts and trend visualization
* 💾 PDF/CSV report downloads
* ⚠️ Low attendance alerts and goal tracking

### 👨‍🏫 Lecturer Features

* ⚡ Quick attendance marking with bulk operations
* 📖 Class and subject management
* 👥 Student performance tracking
* 📑 Multi-format report exports (CSV, Excel, PDF)
* 🏛️ Department-wide analytics
* 📝 Student notes and remarks system

### 📊 Reports & Analytics

* 📈 Interactive charts (Line, Bar, Pie)
* 📅 Daily, weekly, monthly trend analysis
* 🏢 Department and subject comparisons
* 🎛️ Custom date range filtering
* 💾 Export functionality with print support

---

## 💻 Technology Stack

* 🐍 Backend: Python 3.8+, Flask, SQLite, bcrypt, Pandas
* 🎨 Frontend: HTML5, CSS3, JavaScript ES6, Chart.js, Font Awesome
* 🔒 Security: bcrypt hashing, Flask sessions, CSRF protection

---

## 🚀 Installation

### 📋 Prerequisites

* Python 3.8 or higher
* pip package manager

### 📥 Step 1: Clone Repository

```
git clone https://github.com/Archana-deshmukh-ai/Attendance_tracker.git
cd Attendance_tracker
```

### 🔧 Step 2: Create Virtual Environment

#### Windows

```
python -m venv venv
venv\Scripts\activate
```

#### Mac/Linux

```
python3 -m venv venv
source venv/bin/activate
```

### 📦 Step 3: Install Dependencies

```
pip install -r requirements.txt
```

### 🗄️ Step 4: Initialize Database

```
cd backend
python populate_complete_db.py
```

Type 'yes' when prompted

### 🚀 Step 5: Start Application

```
python app.py
```

### 🌐 Step 6: Access Application

Open your browser and go to: http://localhost:5000

---

## 👥 User Roles

👨‍🎓 Student

* Access Level: Personal data only
* Key Features: View attendance, download reports

👨‍🏫 Lecturer

* Access Level: Assigned subjects
* Key Features: Mark attendance, generate class reports, analytics

👑 Admin

* Access Level: Full system access
* Key Features: User management, system configuration

### 🔑 Test Credentials

👨‍🎓 Student: [aarav.sharma@uni.edu](mailto:aarav.sharma@uni.edu) / student@1001
👨‍🏫 Lecturer: [rajesh.iyer@uni.edu](mailto:rajesh.iyer@uni.edu) / prof@201

---

## 🔒 Security Features

* 🔐 Authentication: bcrypt password hashing, session management
* ⏱️ Rate Limiting: 5 attempts before lockout (15 minutes)
* 🌐 IP Protection: 10 attempts triggers IP block (30 minutes)
* 📧 Password Reset: OTP-based recovery with 10-minute expiry
* 🛡️ Data Protection: Parameterized queries, XSS prevention, CSRF tokens

---

## 📡 API Endpoints

* 🔍 GET /api/students - Retrieve all students
* 🔍 GET /api/lecturers - Retrieve all lecturers
* 🔍 GET /api/subjects - Retrieve all subjects
* 🔍 GET /api/attendance - Retrieve attendance records
* ✍️ POST /api/mark_attendance - Record attendance
* 🔑 POST /login - User authentication
* 📧 POST /api/forgot-password - Initiate password reset
* 🔄 POST /api/reset-password - Complete password reset

---

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create feature branch: `git checkout -b feature/AmazingFeature`
3. 💾 Commit changes: `git commit -m 'Add AmazingFeature'`
4. 📤 Push to branch: `git push origin feature/AmazingFeature`
5. 🔄 Open a Pull Request

---

## 📄 License

Distributed under the MIT License. 📜

---

## 👩‍💻 Authors
Made  by Kiranmai Vanapalli and  Archana Deshmukh |  Project 2026

**V.Kiranmai** 👩‍💻 & **Archana Deshmukh** 👩‍💻

---

*"Revolutionizing attendance management, one click at a time."* 🎯✨
