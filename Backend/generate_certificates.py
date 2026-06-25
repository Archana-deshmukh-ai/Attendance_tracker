import sqlite3
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.fonts import addMapping
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
import pandas as pd

# Database path
DB_PATH = os.path.join("Backend", "data", "institute.db")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_attendance_percentage(conn, student_id, subject_id=None):
    """Calculate attendance percentage for a student"""
    if subject_id:
        # For specific subject
        query = """
            SELECT 
                COUNT(CASE WHEN status='present' THEN 1 END) as present,
                COUNT(*) as total
            FROM attendance
            WHERE student_id = ? AND subject_id = ?
        """
        result = conn.execute(query, (student_id, subject_id)).fetchone()
    else:
        # For all subjects
        query = """
            SELECT 
                COUNT(CASE WHEN status='present' THEN 1 END) as present,
                COUNT(*) as total
            FROM attendance
            WHERE student_id = ?
        """
        result = conn.execute(query, (student_id,)).fetchone()
    
    present = result['present'] if result['present'] else 0
    total = result['total'] if result['total'] else 0
    
    if total > 0:
        percentage = (present / total) * 100
        return round(percentage, 2), present, total
    return 0, 0, 0

def get_student_data(conn, student_id):
    """Get student details"""
    student = conn.execute(
        "SELECT student_id, name, email, batch, department FROM students WHERE student_id = ?",
        (student_id,)
    ).fetchone()
    
    if student:
        return dict(student)
    return None

def get_subject_data(conn, subject_id):
    """Get subject details"""
    subject = conn.execute(
        "SELECT subject_id, code, name, credits, department FROM subjects WHERE subject_id = ?",
        (subject_id,)
    ).fetchone()
    
    if subject:
        return dict(subject)
    return None

def get_eligible_students(conn, attendance_threshold=75):
    """Get list of students with attendance >= threshold"""
    query = """
        SELECT 
            student_id,
            COUNT(CASE WHEN status='present' THEN 1 END) as present,
            COUNT(*) as total,
            ROUND(CAST(COUNT(CASE WHEN status='present' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as percentage
        FROM attendance
        GROUP BY student_id
        HAVING percentage >= ?
    """
    return conn.execute(query, (attendance_threshold,)).fetchall()

def get_top_performers(conn, limit=10):
    """Get top performing students by attendance"""
    query = """
        SELECT 
            student_id,
            COUNT(CASE WHEN status='present' THEN 1 END) as present,
            COUNT(*) as total,
            ROUND(CAST(COUNT(CASE WHEN status='present' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as percentage
        FROM attendance
        GROUP BY student_id
        ORDER BY percentage DESC
        LIMIT ?
    """
    return conn.execute(query, (limit,)).fetchall()

def create_professional_certificate(student_name, attendance_percentage, present_count, total_count, 
                                   subject_name=None, issue_date=None, certificate_type="achievement"):
    """
    Create a professional certificate PDF
    """
    # Create certificates directory if it doesn't exist
    os.makedirs("certificates", exist_ok=True)
    
    # Set issue date
    if not issue_date:
        issue_date = datetime.now().strftime("%B %d, %Y")
    
    # Generate filename
    if subject_name:
        filename = f"certificates/{student_name}_{subject_name}_certificate.pdf"
    else:
        filename = f"certificates/{student_name}_attendance_certificate.pdf"
    
    # Remove spaces and special characters from filename
    filename = "".join(c for c in filename if c.isalnum() or c in (' ', '_', '-', '/')).replace(' ', '_')
    
    # Create PDF with landscape orientation for more professional look
    doc = SimpleDocTemplate(filename, pagesize=landscape(letter),
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=72)
    
    # Story container for content
    story = []
    
    # Custom styles
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=32,
        textColor=colors.HexColor('#2c3e50'),
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Subtitle style
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontName='Helvetica',
        fontSize=18,
        textColor=colors.HexColor('#7f8c8d'),
        spaceAfter=20,
        alignment=1
    )
    
    # Body text style
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=24,
        alignment=1
    )
    
    # Name style
    name_style = ParagraphStyle(
        'NameStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=28,
        textColor=colors.HexColor('#3498db'),
        spaceAfter=20,
        alignment=1
    )
    
    # Stats style
    stats_style = ParagraphStyle(
        'StatsStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#27ae60'),
        alignment=1
    )
    
    # Add decorative border (as a table)
    border_data = [['']]
    border_table = Table(border_data, colWidths=[7.5*inch], rowHeights=[10*inch])
    border_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#3498db')),
        ('ROUNDEDCORNERS', (0, 0), (-1, -1), 20),
    ]))
    story.append(border_table)
    story.append(Spacer(1, 20))
    
    # Add certificate title
    if certificate_type == "merit":
        story.append(Paragraph("CERTIFICATE OF MERIT", title_style))
    elif certificate_type == "completion":
        story.append(Paragraph("CERTIFICATE OF COMPLETION", title_style))
    else:
        story.append(Paragraph("CERTIFICATE OF ACHIEVEMENT", title_style))
    
    story.append(Spacer(1, 10))
    
    # Add subtitle
    story.append(Paragraph("This is to certify that", subtitle_style))
    story.append(Spacer(1, 20))
    
    # Add student name
    story.append(Paragraph(student_name.upper(), name_style))
    story.append(Spacer(1, 20))
    
    # Add description
    if subject_name:
        desc_text = f"has successfully completed the course <b>{subject_name}</b> with outstanding performance"
    else:
        desc_text = "has demonstrated exceptional commitment to academic excellence"
    
    story.append(Paragraph(desc_text, body_style))
    story.append(Spacer(1, 10))
    
    # Add attendance statistics
    if attendance_percentage >= 90:
        grade = "Distinction"
        grade_color = "#f39c12"
    elif attendance_percentage >= 75:
        grade = "First Class"
        grade_color = "#27ae60"
    elif attendance_percentage >= 60:
        grade = "Second Class"
        grade_color = "#3498db"
    else:
        grade = "Pass"
        grade_color = "#95a5a6"
    
    stats_text = f"""
        <font color='{grade_color}'><b>Grade: {grade}</b></font><br/>
        Attendance: {attendance_percentage}% ({present_count} out of {total_count} classes)<br/>
        Date of Issue: {issue_date}
    """
    story.append(Paragraph(stats_text, stats_style))
    story.append(Spacer(1, 30))
    
    # Add signatures
    signature_data = [
        ['', '', ''],
        ['_________________________', '_________________________', '_________________________'],
        ['Academic Coordinator', 'Department Head', 'Director']
    ]
    
    sig_table = Table(signature_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, 1), 10),
        ('TEXTCOLOR', (0, 1), (-1, 1), colors.grey),
    ]))
    story.append(sig_table)
    
    # Add footer
    story.append(Spacer(1, 20))
    footer_text = f"Certificate ID: {datetime.now().strftime('%Y%m%d')}_{student_name.replace(' ', '')[:10]}"
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=1
    )
    story.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    doc.build(story)
    return filename

def generate_attendance_certificates(attendance_threshold=75):
    """
    Generate certificates for all students meeting attendance threshold
    """
    print("=" * 60)
    print("ATTENDANCE CERTIFICATE GENERATOR")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Get all students with attendance data
        students = conn.execute("SELECT DISTINCT student_id FROM attendance").fetchall()
        
        if not students:
            print("No attendance records found in database!")
            return
        
        certificates_generated = 0
        eligible_count = 0
        
        for student_record in students:
            student_id = student_record['student_id']
            student = get_student_data(conn, student_id)
            
            if student:
                # Calculate overall attendance
                percentage, present, total = calculate_attendance_percentage(conn, student_id)
                
                if percentage >= attendance_threshold:
                    eligible_count += 1
                    print(f"\nGenerating certificate for {student['name']}...")
                    print(f"  - Attendance: {percentage}% ({present}/{total} classes)")
                    
                    # Generate certificate
                    filename = create_professional_certificate(
                        student_name=student['name'],
                        attendance_percentage=percentage,
                        present_count=present,
                        total_count=total,
                        issue_date=datetime.now().strftime("%B %d, %Y"),
                        certificate_type="completion"
                    )
                    
                    certificates_generated += 1
                    print(f"  ✓ Certificate saved: {filename}")
        
        print("\n" + "=" * 60)
        print(f"CERTIFICATE GENERATION COMPLETE!")
        print(f"  - Total students processed: {len(students)}")
        print(f"  - Eligible students (>= {attendance_threshold}%): {eligible_count}")
        print(f"  - Certificates generated: {certificates_generated}")
        print(f"  - Location: certificates/ folder")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
    finally:
        conn.close()

def generate_subject_certificates(subject_id, attendance_threshold=75):
    """
    Generate certificates for students in a specific subject
    """
    print("=" * 60)
    print(f"SUBJECT CERTIFICATE GENERATOR")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Get subject details
        subject = get_subject_data(conn, subject_id)
        if not subject:
            print(f"Subject with ID {subject_id} not found!")
            return
        
        print(f"Subject: {subject['name']} ({subject['code']})")
        print("-" * 60)
        
        # Get students with attendance for this subject
        students = conn.execute("""
            SELECT DISTINCT student_id 
            FROM attendance 
            WHERE subject_id = ?
        """, (subject_id,)).fetchall()
        
        if not students:
            print("No students found for this subject!")
            return
        
        certificates_generated = 0
        eligible_count = 0
        
        for student_record in students:
            student_id = student_record['student_id']
            student = get_student_data(conn, student_id)
            
            if student:
                # Calculate subject-specific attendance
                percentage, present, total = calculate_attendance_percentage(conn, student_id, subject_id)
                
                if percentage >= attendance_threshold:
                    eligible_count += 1
                    print(f"\nGenerating certificate for {student['name']}...")
                    print(f"  - Attendance in {subject['name']}: {percentage}% ({present}/{total} classes)")
                    
                    # Generate certificate
                    filename = create_professional_certificate(
                        student_name=student['name'],
                        attendance_percentage=percentage,
                        present_count=present,
                        total_count=total,
                        subject_name=subject['name'],
                        issue_date=datetime.now().strftime("%B %d, %Y"),
                        certificate_type="completion"
                    )
                    
                    certificates_generated += 1
                    print(f"  ✓ Certificate saved: {filename}")
        
        print("\n" + "=" * 60)
        print(f"CERTIFICATE GENERATION COMPLETE!")
        print(f"  - Subject: {subject['name']}")
        print(f"  - Total students: {len(students)}")
        print(f"  - Eligible students (>= {attendance_threshold}%): {eligible_count}")
        print(f"  - Certificates generated: {certificates_generated}")
        print(f"  - Location: certificates/ folder")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
    finally:
        conn.close()

def generate_top_performers_certificates(limit=10):
    """
    Generate merit certificates for top performers
    """
    print("=" * 60)
    print("TOP PERFORMERS CERTIFICATE GENERATOR")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Get top performers
        top_performers = get_top_performers(conn, limit)
        
        if not top_performers:
            print("No attendance records found!")
            return
        
        print(f"Generating merit certificates for top {len(top_performers)} students:")
        print("-" * 60)
        
        certificates_generated = 0
        
        for idx, performer in enumerate(top_performers, 1):
            student_id = performer['student_id']
            student = get_student_data(conn, student_id)
            
            if student:
                percentage = performer['percentage']
                present = performer['present']
                total = performer['total']
                
                print(f"\n{idx}. {student['name']} - {percentage}% attendance")
                
                # Generate merit certificate
                filename = create_professional_certificate(
                    student_name=student['name'],
                    attendance_percentage=percentage,
                    present_count=present,
                    total_count=total,
                    issue_date=datetime.now().strftime("%B %d, %Y"),
                    certificate_type="merit"
                )
                
                certificates_generated += 1
                print(f"  ✓ Merit certificate saved: {filename}")
        
        print("\n" + "=" * 60)
        print(f"CERTIFICATE GENERATION COMPLETE!")
        print(f"  - Merit certificates generated: {certificates_generated}")
        print(f"  - Location: certificates/ folder")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error generating certificates: {str(e)}")
    finally:
        conn.close()

def generate_attendance_summary_report():
    """
    Generate a summary report of all students' attendance
    """
    print("=" * 60)
    print("ATTENDANCE SUMMARY REPORT")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Get attendance summary for all students
        summary = conn.execute("""
            SELECT 
                s.student_id,
                s.name,
                s.batch,
                s.department,
                COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
                COUNT(*) as total,
                ROUND(CAST(COUNT(CASE WHEN a.status='present' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) as percentage
            FROM students s
            LEFT JOIN attendance a ON s.student_id = a.student_id
            GROUP BY s.student_id
            ORDER BY percentage DESC
        """).fetchall()
        
        if not summary:
            print("No attendance records found!")
            return
        
        # Create DataFrame for better display
        data = []
        for row in summary:
            data.append({
                'Student ID': row['student_id'],
                'Name': row['name'],
                'Batch': row['batch'],
                'Department': row['department'],
                'Present': row['present'],
                'Total': row['total'],
                'Percentage': f"{row['percentage']}%"
            })
        
        df = pd.DataFrame(data)
        
        # Display summary
        print("\nAttendance Summary:")
        print("-" * 80)
        print(df.to_string(index=False))
        
        # Save to CSV
        csv_filename = f"attendance_summary_{datetime.now().strftime('%Y%m%d')}.csv"
        df.to_csv(csv_filename, index=False)
        print(f"\n✓ Summary saved to: {csv_filename}")
        
        # Statistics
        total_students = len(df)
        eligible_students = len([s for s in summary if s['percentage'] >= 75])
        avg_attendance = df['Percentage'].str.rstrip('%').astype(float).mean()
        
        print("\n" + "=" * 60)
        print("STATISTICS:")
        print(f"  - Total students: {total_students}")
        print(f"  - Eligible students (>=75%): {eligible_students}")
        print(f"  - Average attendance: {avg_attendance:.2f}%")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
    finally:
        conn.close()

def main():
    """
    Main function to run certificate generation
    """
    print("\n" + "=" * 60)
    print("📜 ATTENDANCE CERTIFICATE GENERATION SYSTEM")
    print("=" * 60)
    print("\nSelect an option:")
    print("1. Generate certificates for all eligible students (>=75% attendance)")
    print("2. Generate certificates for a specific subject")
    print("3. Generate merit certificates for top performers")
    print("4. Generate attendance summary report")
    print("5. Generate all (certificates + summary)")
    print("6. Exit")
    
    choice = input("\nEnter your choice (1-6): ").strip()
    
    if choice == '1':
        threshold = input("Enter attendance threshold (default 75%): ").strip()
        threshold = int(threshold) if threshold else 75
        generate_attendance_certificates(threshold)
        
    elif choice == '2':
        subject_id = input("Enter subject ID: ").strip()
        threshold = input("Enter attendance threshold (default 75%): ").strip()
        threshold = int(threshold) if threshold else 75
        generate_subject_certificates(int(subject_id), threshold)
        
    elif choice == '3':
        limit = input("Enter number of top performers (default 10): ").strip()
        limit = int(limit) if limit else 10
        generate_top_performers_certificates(limit)
        
    elif choice == '4':
        generate_attendance_summary_report()
        
    elif choice == '5':
        print("\nGenerating all certificates and reports...")
        generate_attendance_certificates(75)
        print("\n" + "-" * 60)
        generate_top_performers_certificates(10)
        print("\n" + "-" * 60)
        generate_attendance_summary_report()
        
    elif choice == '6':
        print("Exiting...")
        return
    
    else:
        print("Invalid choice! Please try again.")

if __name__ == "__main__":
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("Please run the main application first to initialize the database.")
    else:
        main()