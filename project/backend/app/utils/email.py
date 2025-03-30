# backend/app/utils.py

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import HTTPException, status


def get_env_variable(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Environment variable {var_name} not set.",
        )
    return value


async def send_contact_email(name: str, email: str, message: str):
    """
    Sends an email with the contact form details.
    """
    smtp_server = get_env_variable("SMTP_SERVER")
    smtp_port = get_env_variable("SMTP_PORT")
    email_user = get_env_variable("EMAIL_USER")
    email_password = get_env_variable("EMAIL_PASSWORD")
    recipient_email = get_env_variable("RECIPIENT_EMAIL")

    subject = f"New Contact Form Submission from {name}"
    body = f"""
    You have received a new message from the contact form on your website.

    Details:
    Name: {name}
    Email: {email}
    Message:
    {message}
    """

    # Create a multipart message
    msg = MIMEMultipart()
    msg["From"] = email_user
    msg["To"] = recipient_email
    msg["Subject"] = subject

    # Attach the body with MIMEText
    msg.attach(MIMEText(body, "plain"))

    try:
        # Connect to the SMTP server
        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()  # Secure the connection
        server.login(email_user, email_password)
        server.send_message(msg)
        server.quit()
    except Exception:
        # Log the exception as needed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email.",
        )
