# Backend/email_config.py
# Configuration for email sending

EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'sender_email': 'your_email@gmail.com',  # Change this
    'sender_password': 'your_app_password',  # Use app password, not regular password
    'use_tls': True
}

# For testing/demo mode (prints emails to console instead of sending)
DEMO_MODE = True