const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = this.createTransporter();
    }

    createTransporter() {
        // Create transporter with SMTP configuration
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, yahoo, etc.
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER, // Your email address
                pass: process.env.EMAIL_PASSWORD // Your email password or app-specific password
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async sendEmail(to, subject, htmlContent, textContent = '') {
        try {
            // Check if email credentials are properly configured
            const emailUser = process.env.EMAIL_USER;
            const emailPassword = process.env.EMAIL_PASSWORD;
            
            if (!emailUser || !emailPassword || 
                emailUser === 'your-email@gmail.com' || 
                emailPassword === 'your-app-password-here') {
                console.log('⚠️  Email not configured - skipping email to:', to);
                console.log('📝 Note: Update EMAIL_USER and EMAIL_PASSWORD in .env to enable emails');
                return { success: false, error: 'Email credentials not configured' };
            }

            const mailOptions = {
                from: {
                    name: process.env.EMAIL_FROM_NAME || 'Service Point Platform',
                    address: process.env.EMAIL_USER
                },
                to,
                subject,
                html: htmlContent,
                text: textContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Email sending failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendBookingNotificationToGarage(bookingData, garageData) {
        try {
            const subject = `🚗 New Service Booking - ${bookingData.service}`;
            
            const htmlContent = this.getBookingNotificationTemplate(bookingData, garageData);
            const textContent = this.getBookingNotificationText(bookingData, garageData);

            return await this.sendEmail(garageData.email, subject, htmlContent, textContent);
        } catch (error) {
            console.error('Error sending booking notification:', error);
            return { success: false, error: error.message };
        }
    }

    async sendBookingStatusUpdateToUser(bookingData, garageData, newStatus) {
        try {
            if (!bookingData.userEmail) {
                return { success: false, error: 'User email not provided' };
            }

            const statusMessages = {
                confirmed: 'Your booking has been accepted! 🎉',
                cancelled: 'Your booking has been cancelled 😞',
                in_progress: 'Your service is now in progress! 🔧',
                completed: 'Your service has been completed! ✅'
            };

            const subject = `📧 Booking Update: ${statusMessages[newStatus] || 'Status Updated'}`;
            
            const htmlContent = this.getStatusUpdateTemplate(bookingData, garageData, newStatus);
            const textContent = this.getStatusUpdateText(bookingData, garageData, newStatus);

            return await this.sendEmail(bookingData.userEmail, subject, htmlContent, textContent);
        } catch (error) {
            console.error('Error sending status update email:', error);
            return { success: false, error: error.message };
        }
    }

    getBookingNotificationTemplate(bookingData, garageData) {
        const scheduledDate = new Date(bookingData.scheduledDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Booking Notification</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .booking-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #667eea; }
                .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                .label { font-weight: bold; color: #555; }
                .value { color: #333; }
                .highlight { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                .urgent { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 New Service Booking!</h1>
                    <p>You have received a new booking request</p>
                </div>
                
                <div class="content">
                    <div class="urgent">
                        <strong>⚡ Action Required:</strong> A customer has booked a service at your garage. Please review and accept/reject this booking as soon as possible.
                    </div>

                    <div class="booking-card">
                        <h2>Booking Details</h2>
                        
                        <div class="detail-row">
                            <span class="label">Booking ID:</span>
                            <span class="value">#${bookingData.bookingId}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Service:</span>
                            <span class="value">${bookingData.service}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Customer:</span>
                            <span class="value">${bookingData.userName}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Phone:</span>
                            <span class="value">${bookingData.userPhone}</span>
                        </div>
                        
                        ${bookingData.userEmail ? `
                        <div class="detail-row">
                            <span class="label">Email:</span>
                            <span class="value">${bookingData.userEmail}</span>
                        </div>
                        ` : ''}
                        
                        <div class="detail-row">
                            <span class="label">Scheduled Date:</span>
                            <span class="value">${scheduledDate}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Scheduled Time:</span>
                            <span class="value">${bookingData.scheduledTime}</span>
                        </div>
                        
                        ${bookingData.notes ? `
                        <div class="highlight">
                            <strong>Customer Notes:</strong><br>
                            ${bookingData.notes}
                        </div>
                        ` : ''}
                        
                        ${bookingData.vehicleInfo ? `
                        <div class="highlight">
                            <strong>Vehicle Information:</strong><br>
                            ${bookingData.vehicleInfo.make} ${bookingData.vehicleInfo.model} ${bookingData.vehicleInfo.year || ''}<br>
                            ${bookingData.vehicleInfo.licensePlate ? `License Plate: ${bookingData.vehicleInfo.licensePlate}` : ''}
                        </div>
                        ` : ''}
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/garage-dashboard.html" class="button">
                            📋 Manage Booking
                        </a>
                    </div>

                    <div class="footer">
                        <p>This booking was created on ${new Date(bookingData.createdAt).toLocaleString()}</p>
                        <p>Please respond to this booking request promptly to provide excellent customer service.</p>
                        <hr>
                        <p><small>Service Point Platform - Connecting customers with trusted garages</small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getBookingNotificationText(bookingData, garageData) {
        const scheduledDate = new Date(bookingData.scheduledDate).toLocaleDateString();
        
        return `
New Service Booking - ${bookingData.service}

Booking Details:
- Booking ID: #${bookingData.bookingId}
- Service: ${bookingData.service}
- Customer: ${bookingData.userName}
- Phone: ${bookingData.userPhone}
${bookingData.userEmail ? `- Email: ${bookingData.userEmail}` : ''}
- Scheduled Date: ${scheduledDate}
- Scheduled Time: ${bookingData.scheduledTime}
${bookingData.notes ? `- Notes: ${bookingData.notes}` : ''}
${bookingData.vehicleInfo ? `- Vehicle: ${bookingData.vehicleInfo.make} ${bookingData.vehicleInfo.model}` : ''}

Please log in to your garage dashboard to manage this booking:
${process.env.FRONTEND_URL || 'http://localhost:3001'}/garage-dashboard.html

Created: ${new Date(bookingData.createdAt).toLocaleString()}

Service Point Platform
        `;
    }

    getStatusUpdateTemplate(bookingData, garageData, newStatus) {
        const statusInfo = {
            confirmed: { title: 'Booking Confirmed! 🎉', color: '#28a745', message: 'Great news! Your booking has been accepted by the garage.' },
            cancelled: { title: 'Booking Cancelled 😞', color: '#dc3545', message: 'Unfortunately, your booking has been cancelled.' },
            in_progress: { title: 'Service In Progress 🔧', color: '#ffc107', message: 'Good news! Your service is now being worked on.' },
            completed: { title: 'Service Completed! ✅', color: '#28a745', message: 'Excellent! Your service has been completed successfully.' }
        };

        const info = statusInfo[newStatus] || { title: 'Status Updated', color: '#6c757d', message: 'Your booking status has been updated.' };

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Status Update</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${info.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .status-card { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; border-left: 5px solid ${info.color}; }
                .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${info.title}</h1>
                    <p>${info.message}</p>
                </div>
                
                <div class="content">
                    <div class="status-card">
                        <h2>Booking Information</h2>
                        
                        <div class="detail-row">
                            <span class="label">Booking ID:</span>
                            <span class="value">#${bookingData.bookingId}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Service:</span>
                            <span class="value">${bookingData.service}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Garage:</span>
                            <span class="value">${garageData.garageName}</span>
                        </div>
                        
                        <div class="detail-row">
                            <span class="label">Status:</span>
                            <span class="value" style="color: ${info.color}; font-weight: bold;">${newStatus.toUpperCase()}</span>
                        </div>
                        
                        ${garageData.contactNumber ? `
                        <div class="detail-row">
                            <span class="label">Contact:</span>
                            <span class="value">${garageData.contactNumber}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="footer">
                        <p>If you have any questions, please contact the garage directly.</p>
                        <hr>
                        <p><small>Service Point Platform</small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getStatusUpdateText(bookingData, garageData, newStatus) {
        const statusMessages = {
            confirmed: 'Your booking has been accepted! 🎉',
            cancelled: 'Your booking has been cancelled 😞',
            in_progress: 'Your service is now in progress! 🔧',
            completed: 'Your service has been completed! ✅'
        };

        return `
${statusMessages[newStatus] || 'Booking Status Updated'}

Booking Information:
- Booking ID: #${bookingData.bookingId}
- Service: ${bookingData.service}
- Garage: ${garageData.garageName}
- New Status: ${newStatus.toUpperCase()}
${garageData.contactNumber ? `- Contact: ${garageData.contactNumber}` : ''}

Service Point Platform
        `;
    }

    async testEmailConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ SMTP server connection is ready');
            return { success: true, message: 'SMTP connection verified' };
        } catch (error) {
            console.error('❌ SMTP connection failed:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();