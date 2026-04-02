# 📊 Attendance Atlas

## 🚀 Smart Attendance Management System

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/flask-2.0%2B-green.svg)](https://flask.palletsprojects.com)
[![SQLite](https://img.shields.io/badge/database-SQLite-orange.svg)](https://sqlite.org)
[![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow.svg)](https://javascript.com)
[![License](https://img.shields.io/badge/license-MIT-red.svg)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/Archana-deshmukh-ai/Attendance_tracker)](https://github.com/Archana-deshmukh-ai/Attendance_tracker)
[![GitHub stars](https://img.shields.io/github/stars/Archana-deshmukh-ai/Attendance_tracker)](https://github.com/Archana-deshmukh-ai/Attendance_tracker)

> A comprehensive, real-time attendance management system designed to revolutionize how educational institutions track and analyze student attendance.

---

## 🌟 Overview

**Attendance Atlas** is a cutting-edge web-based attendance management system that eliminates traditional manual tracking methods. It provides real-time attendance monitoring, advanced analytics, and comprehensive reporting capabilities for educational institutions. Built with modern web technologies, it offers separate dashboards for students, lecturers, and administrators, ensuring a tailored experience for each user role.

### 🎯 Problem Statement
Educational institutions struggle with:
- ❌ Manual attendance tracking errors
- ❌ Time-consuming record keeping
- ❌ Lack of real-time insights
- ❌ Difficulty in generating reports
- ❌ Security concerns with data management

### 💡 Our Solution
**Attendance Atlas** solves these challenges by providing:
- ✅ Automated attendance tracking
- ✅ Real-time analytics and insights
- ✅ Secure role-based access
- ✅ Comprehensive reporting tools
- ✅ User-friendly interfaces for all stakeholders

---

## ✨ Key Features

### 🔐 **Security & Authentication**
- **Brute Force Protection** - 5 failed attempts lockout mechanism
- **Account Lockout** - Temporary lock with countdown timer
- **IP Blocking** - Prevents multiple attempts from same IP
- **CAPTCHA Verification** - After 3 failed attempts
- **Password Hashing** - bcrypt encryption for secure storage
- **Session Management** - Automatic logout after inactivity
- **Two-Factor Authentication** - Optional 2FA support
- **Password Reset** - Secure OTP-based password recovery

### 👨‍🎓 **Student Features**
- **Real-time Dashboard** - Personal attendance overview
- **Subject-wise Performance** - Detailed analytics per subject
- **Attendance History** - Complete record with filters
- **Attendance Trends** - Interactive charts and graphs
- **Download Reports** - PDF/CSV export options
- **Certificate Generation** - Excellence certificates for high attendance
- **Low Attendance Alerts** - Email and in-app notifications
- **Goal Tracking** - Personal attendance targets
- **Streak Counter** - Days since last absence
- **Performance Ranking** - Compare with classmates

### 👨‍🏫 **Lecturer Features**
- **Quick Attendance Marking** - Bulk operations support
- **Class Management** - View and manage assigned subjects
- **Student Analytics** - Track individual student performance
- **Class Reports** - Generate class-wise summaries
- **Export Functionality** - CSV, PDF, Excel formats
- **Student Notes** - Add remarks for attendance records
- **Real-time Statistics** - Live class attendance percentages
- **Department Analysis** - Compare across departments
- **Timetable Management** - Schedule and manage classes
- **Bulk Actions** - Mark all present/absent/late at once

### 📊 **Reports & Analytics**
- **Interactive Charts** - Line, bar, pie charts with Chart.js
- **Trend Analysis** - Daily, weekly, monthly trends
- **Department Comparison** - Cross-department analytics
- **Subject Performance** - Subject-wise attendance rates
- **Date Range Filters** - Custom time period selection
- **Data Export** - CSV, Excel, PDF downloads
- **Print Reports** - Printable report formats
- **Email Reports** - Send reports via email
- **Save Filters** - Preserve filter preferences
- **Real-time Updates** - Live data synchronization

### 🎨 **User Interface**
- **Responsive Design** - Works on all devices
- **Dark Mode Support** - Eye-friendly theme
- **AOS Animations** - Smooth scroll animations
- **Mobile Menu** - Optimized for smartphones
- **Interactive Tabs** - Organized content sections
- **Progress Indicators** - Visual feedback for actions
- **Toast Notifications** - Non-intrusive alerts
- **Loading States** - Spinners and progress bars

---

## 🎯 User Roles

### 👨‍🎓 **Student Dashboard**
- Personal attendance percentage
- Subject-wise breakdown
- Attendance calendar view
- Certificate eligibility status
- Low attendance warnings
- Download personal reports
- View class schedule
- Track attendance goals

### 👨‍🏫 **Lecturer Dashboard**
- Class overview statistics
- Today's attendance percentage
- Subject management
- Student performance tracking
- Bulk attendance marking
- Export class reports
- Student notes management
- Real-time analytics

### 👑 **Administrator Panel**
- User management
- System configuration
- Institutional analytics
- Data backup and restore
- Security settings
- Role management
- System health monitoring

---

## 💻 Technology Stack

### **Backend**
| Technology | Purpose |
|------------|---------|
| **Python 3.8+** | Core programming language |
| **Flask** | Web framework |
| **SQLite** | Database management |
| **bcrypt** | Password hashing |
| **Pandas** | Data processing |
| **smtplib** | Email functionality |
| **hashlib** | Security hashing |

### **Frontend**
| Technology | Purpose |
|------------|---------|
| **HTML5** | Structure |
| **CSS3** | Styling & animations |
| **JavaScript ES6** | Interactivity |
| **Chart.js** | Data visualization |
| **Font Awesome 6** | Icons |
| **AOS** | Scroll animations |

### **Security**
| Feature | Implementation |
|---------|---------------|
| Password Storage | bcrypt hashing |
| Session Management | Flask sessions |
| Brute Force Protection | Attempt tracking |
| XSS Prevention | Input sanitization |
| SQL Injection | Parameterized queries |
| CSRF Protection | Token validation |

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- pip package manager
- Git (optional)

### Step-by-Step Installation

**Step 1: Clone the Repository**
```bash
git clone https://github.com/Archana-deshmukh-ai/Attendance_tracker.git
cd Attendance_tracker

Step 2: Create Virtual Environment
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate

Step 3: Install Dependencies
pip install -r requirements.txt

Step 4: Initialize Database
cd backend
python populate_complete_db.py

When prompted, type yes to populate the database with sample data.

Step 5: Run the Application
python app.py

Step 6: Access the Application
Open your browser and navigate to:
http://localhost:5000

🔒 Security Features
Account Protection
✅ Brute force prevention (5 attempts max)

✅ Account lockout (15 minutes)

✅ IP-based blocking

✅ Cooldown period between attempts

✅ CAPTCHA after 3 failed attempts

Data Security
✅ bcrypt password hashing

✅ SQL injection prevention

✅ XSS protection

✅ CSRF tokens

✅ Session management

✅ Secure cookie handling

Access Control
✅ Role-based access control (RBAC)

✅ Session timeout (1 hour)

✅ IP tracking

✅ Login attempt logging

✅ Account unlock via email

📊 Analytics & Reports

Available Reports
Report Type	Description
Attendance Summary	Overall attendance percentage
Subject-wise	Per-subject attendance analysis
Department-wise	Cross-department comparison
Student Report	Individual student performance
Class Report	Class-wide attendance statistics
Monthly Summary	Monthly attendance trends
Certificate	Attendance excellence certificates
Export Data	CSV, Excel, PDF formats

Chart Types
📈 Line Charts - Trend analysis

📊 Bar Charts - Comparison analysis

🥧 Pie Charts - Distribution analysis

📉 Area Charts - Cumulative trends

⭐ Show Your Support

If you found this project helpful, please give it a ⭐ on GitHub!

Made  by Kiranmai Vanapalli and  Archana Deshmukh |  Project 2026

"Revolutionizing attendance management, one click at a time."
