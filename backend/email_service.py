import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional
from datetime import datetime, date
import os
from jinja2 import Template
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "Kita Dienstplan System")
        
    def send_email(
        self, 
        to_emails: List[str], 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None,
        attachments: Optional[List[tuple]] = None
    ) -> bool:
        """
        E-Mail versenden
        
        Args:
            to_emails: Liste der Empfänger-E-Mail-Adressen
            subject: E-Mail-Betreff
            html_content: HTML-Inhalt der E-Mail
            text_content: Text-Inhalt der E-Mail (optional)
            attachments: Liste von (filename, content, mimetype) Tuples
        
        Returns:
            True wenn erfolgreich versendet, False bei Fehler
        """
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP-Konfiguration unvollständig - E-Mail wird nicht versendet")
            return False
            
        try:
            # E-Mail erstellen
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = ", ".join(to_emails)
            
            # Text-Teil hinzufügen
            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                message.attach(text_part)
            
            # HTML-Teil hinzufügen
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            # Anhänge hinzufügen
            if attachments:
                for filename, content, mimetype in attachments:
                    attachment = MIMEBase(*mimetype.split('/'))
                    attachment.set_payload(content)
                    encoders.encode_base64(attachment)
                    attachment.add_header(
                        "Content-Disposition",
                        f"attachment; filename= {filename}"
                    )
                    message.attach(attachment)
            
            # E-Mail versenden
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_emails, message.as_string())
            
            logger.info(f"E-Mail erfolgreich versendet an: {', '.join(to_emails)}")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim E-Mail-Versand: {str(e)}")
            return False

    def send_monthly_lock_notification(
        self, 
        user_email: str, 
        user_name: str, 
        year: int, 
        month: int,
        locked_by_name: str,
        entry_count: int
    ) -> bool:
        """
        Benachrichtigung über Monatsabschluss senden
        """
        month_names = [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember"
        ]
        
        month_name = month_names[month - 1] if 1 <= month <= 12 else str(month)
        
        subject = f"Monatsabschluss {month_name} {year} - Ihre Zeiterfassung wurde gesperrt"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Monatsabschluss</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5282;">Monatsabschluss {{ month_name }} {{ year }}</h2>
                
                <p>Liebe/r {{ user_name }},</p>
                
                <p>Ihr Monat <strong>{{ month_name }} {{ year }}</strong> wurde soeben abgeschlossen und Ihre Zeiterfassung gesperrt.</p>
                
                <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2d3748;">Details zum Abschluss:</h3>
                    <ul style="margin-bottom: 0;">
                        <li><strong>Monat:</strong> {{ month_name }} {{ year }}</li>
                        <li><strong>Anzahl Zeiteinträge:</strong> {{ entry_count }}</li>
                        <li><strong>Abgeschlossen von:</strong> {{ locked_by_name }}</li>
                        <li><strong>Abgeschlossen am:</strong> {{ now.strftime('%d.%m.%Y um %H:%M') }} Uhr</li>
                    </ul>
                </div>
                
                <p><strong>Was bedeutet das?</strong></p>
                <ul>
                    <li>Ihre Zeiteinträge für {{ month_name }} {{ year }} können nicht mehr bearbeitet werden</li>
                    <li>Der Monat ist offiziell abgeschlossen</li>
                    <li>Bei Fragen wenden Sie sich bitte an die Leitung</li>
                </ul>
                
                <p>Sie können Ihre abgeschlossenen Zeiteinträge weiterhin in der Anwendung einsehen.</p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #718096;">
                    Diese E-Mail wurde automatisch vom Kita Dienstplan System versendet.<br>
                    Bei Fragen zur Zeiterfassung wenden Sie sich bitte an die Einrichtungsleitung.
                </p>
            </div>
        </body>
        </html>
        """)
        
        text_template = Template("""
        Monatsabschluss {{ month_name }} {{ year }}

        Liebe/r {{ user_name }},

        Ihr Monat {{ month_name }} {{ year }} wurde soeben abgeschlossen und Ihre Zeiterfassung gesperrt.

        Details zum Abschluss:
        - Monat: {{ month_name }} {{ year }}
        - Anzahl Zeiteinträge: {{ entry_count }}
        - Abgeschlossen von: {{ locked_by_name }}
        - Abgeschlossen am: {{ now.strftime('%d.%m.%Y um %H:%M') }} Uhr

        Was bedeutet das?
        - Ihre Zeiteinträge für {{ month_name }} {{ year }} können nicht mehr bearbeitet werden
        - Der Monat ist offiziell abgeschlossen
        - Bei Fragen wenden Sie sich bitte an die Leitung

        Sie können Ihre abgeschlossenen Zeiteinträge weiterhin in der Anwendung einsehen.

        ---
        Diese E-Mail wurde automatisch vom Kita Dienstplan System versendet.
        Bei Fragen zur Zeiterfassung wenden Sie sich bitte an die Einrichtungsleitung.
        """)
        
        now = datetime.now()
        
        html_content = html_template.render(
            user_name=user_name,
            month_name=month_name,
            year=year,
            entry_count=entry_count,
            locked_by_name=locked_by_name,
            now=now
        )
        
        text_content = text_template.render(
            user_name=user_name,
            month_name=month_name,
            year=year,
            entry_count=entry_count,
            locked_by_name=locked_by_name,
            now=now
        )
        
        return self.send_email([user_email], subject, html_content, text_content)

    def send_monthly_lock_reminder(
        self, 
        user_email: str, 
        user_name: str, 
        year: int, 
        month: int,
        days_until_deadline: int
    ) -> bool:
        """
        Erinnerung vor Monatsabschluss senden
        """
        month_names = [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember"
        ]
        
        month_name = month_names[month - 1] if 1 <= month <= 12 else str(month)
        
        subject = f"Erinnerung: Monatsabschluss {month_name} {year} steht bevor"
        
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Erinnerung Monatsabschluss</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d69e2e;">Erinnerung: Monatsabschluss steht bevor</h2>
                
                <p>Liebe/r {{ user_name }},</p>
                
                <p>der Monatsabschluss für <strong>{{ month_name }} {{ year }}</strong> steht bevor!</p>
                
                <div style="background-color: #fffbf0; border-left: 4px solid #d69e2e; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2d3748;">Noch {{ days_until_deadline }} Tag(e) bis zum Abschluss</h3>
                    <p style="margin-bottom: 0;">Bitte überprüfen Sie Ihre Zeiterfassung und ergänzen Sie fehlende Einträge.</p>
                </div>
                
                <p><strong>Wichtige Hinweise:</strong></p>
                <ul>
                    <li>Überprüfen Sie alle Ihre Zeiteinträge für {{ month_name }} {{ year }}</li>
                    <li>Tragen Sie fehlende Arbeitszeiten, Urlaubs- und Krankheitstage nach</li>
                    <li>Nach dem Abschluss können keine Änderungen mehr vorgenommen werden</li>
                    <li>Bei Fragen wenden Sie sich an die Leitung</li>
                </ul>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{{ app_url }}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Zur Zeiterfassung</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #718096;">
                    Diese E-Mail wurde automatisch vom Kita Dienstplan System versendet.<br>
                    Bei Fragen zur Zeiterfassung wenden Sie sich bitte an die Einrichtungsleitung.
                </p>
            </div>
        </body>
        </html>
        """)
        
        app_url = os.getenv("APP_URL", "http://localhost:3000")
        
        html_content = html_template.render(
            user_name=user_name,
            month_name=month_name,
            year=year,
            days_until_deadline=days_until_deadline,
            app_url=app_url
        )
        
        return self.send_email([user_email], subject, html_content)

# Globale EmailService-Instanz
email_service = EmailService()