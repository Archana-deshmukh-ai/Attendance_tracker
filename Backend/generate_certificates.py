import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

# load data
students = pd.read_csv("Backend/Backend/data/students.csv")
attendance = pd.read_csv("Backend/Backend/data/attendance_summary.csv")

# merge student names with attendance
data = pd.merge(students, attendance, on="student_id")

# create certificates folder
os.makedirs("certificates", exist_ok=True)

for index, row in data.iterrows():
    
    if row["eligible"] == True:
        
        student_name = row["name"]
        percentage = round(row["attendance_percentage"],2)

        file_name = f"certificates/{student_name}_certificate.pdf"

        c = canvas.Canvas(file_name, pagesize=letter)

        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(300, 700, "Certificate of Achievement")

        c.setFont("Helvetica", 16)
        c.drawCentredString(300, 650, "This is to certify that")

        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(300, 620, student_name)

        c.setFont("Helvetica", 14)
        c.drawCentredString(300, 580, f"has successfully completed the course")

        c.drawCentredString(300, 550, f"with {percentage}% attendance.")

        c.save()

print("Certificates generated successfully!")