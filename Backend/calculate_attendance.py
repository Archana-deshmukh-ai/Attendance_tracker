import pandas as pd

# load attendance data
attendance = pd.read_csv("Backend/Backend/data/attendance.csv")

# total classes per student
total_classes = attendance.groupby("student_id").size()

# present classes
present_classes = attendance[attendance["status"] == "Present"].groupby("student_id").size()

# calculate percentage
percentage = (present_classes / total_classes) * 100

# convert to dataframe
attendance_summary = percentage.reset_index()
attendance_summary.columns = ["student_id", "attendance_percentage"]



# save result
attendance_summary.to_csv("Backend/Backend/data/attendance_summary.csv", index=False)

print("Attendance percentage and eligibilitycalculated successfully!")