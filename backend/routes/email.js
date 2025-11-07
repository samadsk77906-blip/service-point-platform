const express = require('express');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/email/test
// @desc    Test email functionality
// @access  Public (for testing only)
router.post('/test', async (req, res) => {
    try {
        const { to, subject, message } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email is required'
            });
        }

        // Test email connection first
        const connectionTest = await emailService.testEmailConnection();
        if (!connectionTest.success) {
            return res.status(500).json({
                success: false,
                message: 'SMTP connection failed',
                error: connectionTest.error
            });
        }

        // Send test email
        const testSubject = subject || 'Service Point Platform - Test Email';
        const testMessage = message || 'This is a test email from Service Point Platform. Your email configuration is working correctly!';
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px; }
                .content { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧪 Email Test Successful!</h1>
                </div>
                <div class="content">
                    <h2>Service Point Platform</h2>
                    <p>${testMessage}</p>
                    <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
                    <p>If you received this email, your SMTP configuration is working correctly.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const result = await emailService.sendEmail(to, testSubject, htmlContent, testMessage);

        if (result.success) {
            res.json({
                success: true,
                message: 'Test email sent successfully!',
                messageId: result.messageId,
                recipient: to
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test email',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing email functionality',
            error: error.message
        });
    }
});

// @route   POST /api/email/test-booking-notification
// @desc    Test booking notification email
// @access  Public (for testing only)
router.post('/test-booking-notification', async (req, res) => {
    try {
        const { garageEmail } = req.body;

        if (!garageEmail) {
            return res.status(400).json({
                success: false,
                message: 'Garage email is required'
            });
        }

        // Sample booking data for testing
        const testBookingData = {
            bookingId: 'BK_TEST_' + Date.now(),
            service: 'Oil Change',
            userName: 'Test Customer',
            userPhone: '1234567890',
            userEmail: 'test.customer@example.com',
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            scheduledTime: '10:00',
            notes: 'This is a test booking notification email.',
            vehicleInfo: {
                make: 'Toyota',
                model: 'Camry',
                year: 2020,
                licensePlate: 'TEST123',
                color: 'Blue'
            },
            location: {
                address: '123 Test Street, Test City'
            },
            createdAt: new Date()
        };

        const testGarageData = {
            email: garageEmail,
            garageName: 'Test Garage',
            ownerName: 'Test Garage Owner',
            contactNumber: '0987654321'
        };

        const result = await emailService.sendBookingNotificationToGarage(testBookingData, testGarageData);

        if (result.success) {
            res.json({
                success: true,
                message: 'Test booking notification sent successfully!',
                messageId: result.messageId,
                recipient: garageEmail
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send test booking notification',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Booking notification test error:', error);
        res.status(500).json({
            success: false,
            message: 'Error testing booking notification',
            error: error.message
        });
    }
});

// @route   GET /api/email/connection-status
// @desc    Check email connection status
// @access  Public
router.get('/connection-status', async (req, res) => {
    try {
        const connectionTest = await emailService.testEmailConnection();
        
        res.json({
            success: connectionTest.success,
            message: connectionTest.success ? 'SMTP connection is working' : 'SMTP connection failed',
            smtp_configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
            email_user: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/@.*/, '@***') : 'Not configured',
            error: connectionTest.error || null
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking email connection',
            error: error.message
        });
    }
});

module.exports = router;