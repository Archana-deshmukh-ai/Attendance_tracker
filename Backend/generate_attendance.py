import pandas as pd
import random
from datetime import datetime, timedelta

students = pd.read_csv("Backend/Backend/data/students.csv")

subjects = ["CS101","CS102","EC201","ME301","CE401","EE501"]

attendance = []

start_date = datetime(2026,3,1)

for day in range(30):
    date = (start_date + timedelta(days=day)).strftime("%Y-%m-%d")

    for student in students["student_id"]:
        for subject in subjects:

            status = "Present" if random.random() < 0.9 else "Absent"

            attendance.append([student, subject, date, status])

df = pd.DataFrame(attendance, columns=["student_id","subject_id","date","status"])

df.to_csv("Backend/Backend/data/attendance.csv", index=False)

print("Attendance dataset created successfully!")