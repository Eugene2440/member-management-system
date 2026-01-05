const nodemailer = require('nodemailer');

// Base URL for links
const BASE_URL = process.env.BASE_URL || 'https://aecas.co.ke';

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Check if email is configured
const isEmailConfigured = () => {
    return process.env.SMTP_USER && process.env.SMTP_PASS;
};

// Send single email
const sendEmail = async (to, subject, html) => {
    if (!isEmailConfigured()) {
        console.log('Email not configured, skipping email to:', to);
        return { success: false, reason: 'Email not configured' };
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

// Send bulk emails (for notifications to all members)
const sendBulkEmail = async (recipients, subject, html) => {
    if (!isEmailConfigured()) {
        console.log('Email not configured, skipping bulk email');
        return { success: false, reason: 'Email not configured' };
    }

    const results = { sent: 0, failed: 0, errors: [] };
    
    for (const recipient of recipients) {
        try {
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const personalizedHtml = html.replace(/{{email}}/g, recipient.email)
                                         .replace(/{{name}}/g, recipient.name || 'Member');
            
            await sendEmail(recipient.email, subject, personalizedHtml);
            results.sent++;
        } catch (error) {
            results.failed++;
            results.errors.push({ email: recipient.email, error: error.message });
        }
    }
    
    console.log(`Bulk email complete: ${results.sent} sent, ${results.failed} failed`);
    return { success: true, ...results };
};

// Common email footer with unsubscribe link (GDPR/DPA compliant)
const getEmailFooter = (email = '') => {
    return `
        <!-- Footer -->
        <div style="background-color: #1e3a8a; padding: 30px; text-align: center;">
            <p style="color: #e0e7ff; margin: 0 0 10px 0; font-size: 14px;">Building Tomorrow's Professionals Today</p>
            <p style="color: #93c5fd; margin: 0; font-size: 12px;">Technical University of Kenya, Haile Selassie Avenue, Nairobi</p>
            <div style="margin-top: 20px;">
                <a href="${BASE_URL}" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-size: 12px;">Website</a>
                <a href="${BASE_URL}/privacy" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-size: 12px;">Privacy Policy</a>
                <a href="mailto:support@aecas.co.ke" style="color: #ffffff; text-decoration: none; margin: 0 10px; font-size: 12px;">Contact Us</a>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #3b5998;">
                <p style="color: #93c5fd; margin: 0; font-size: 11px;">
                    You received this email because you are a registered member of AECAS.
                </p>
                <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 11px;">
                    <a href="${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #93c5fd; text-decoration: underline;">Unsubscribe</a> | 
                    <a href="${BASE_URL}/email-preferences?email=${encodeURIComponent(email)}" style="color: #93c5fd; text-decoration: underline;">Email Preferences</a>
                </p>
            </div>
            <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 11px;">© 2025 AECAS. All rights reserved.</p>
        </div>
    `;
};

// ============ EMAIL TEMPLATES ============

// Welcome Email
const getWelcomeEmailHTML = (memberData) => {
    const memberType = memberData.memberType === 'non-student' ? 'Associate Member' : 'Student Member';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to AECAS!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Association of Engineering Construction and Architecture Students</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">Hello ${memberData.name}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for registering with AECAS as a <strong>${memberType}</strong>. We're excited to have you join our community of future engineering and architecture professionals!
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e3a8a; margin: 0 0 15px 0; font-size: 16px;">Registration Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Name:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.email}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Phone:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.phone}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">${memberData.memberType === 'non-student' ? 'Area of Interest' : 'Course'}:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.course || memberData.areaOfInterest || 'Not specified'}</td></tr>
                </table>
            </div>
            
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⏳ Payment Pending:</strong> Your registration is being processed. Once your payment is verified, you will receive your official AECAS membership number via email.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/events" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600;">View Upcoming Events</a>
            </div>
        </div>
        
        ${getEmailFooter(memberData.email)}
    </div>
</body>
</html>`;
};

// Payment Confirmed Email
const getPaymentConfirmedEmailHTML = (memberData) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">✓</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Confirmed!</h1>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #059669; margin: 0 0 20px 0;">Congratulations, ${memberData.name}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                Your payment has been verified and your AECAS membership is now <strong>active</strong>. Welcome to the family!
            </p>
            
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center;">
                <p style="color: #e0e7ff; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Member Number</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px;">${memberData.memberNumber || 'Pending Assignment'}</p>
            </div>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 16px;">Membership Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280; width: 40%;">Name:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.email}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Membership Type:</td><td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${memberData.membershipType || 'Ordinary'}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Status:</td><td style="padding: 8px 0; color: #059669; font-weight: 600;">✓ Active</td></tr>
                </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/events" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600; margin: 5px;">View Events</a>
            </div>
        </div>
        
        ${getEmailFooter(memberData.email)}
    </div>
</body>
</html>`;
};

// Payment Rejected Email
const getPaymentRejectedEmailHTML = (memberData) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">⚠</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Issue</h1>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #dc2626; margin: 0 0 20px 0;">Hello ${memberData.name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                We were unable to verify your payment for AECAS membership registration.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
                <p style="color: #7f1d1d; margin: 0;">Possible reasons:</p>
                <ul style="color: #7f1d1d; margin: 10px 0 0 0; padding-left: 20px; line-height: 1.8;">
                    <li>Incorrect payment reference/transaction code</li>
                    <li>Insufficient payment amount</li>
                    <li>Payment made to wrong account</li>
                </ul>
            </div>
            
            <h3 style="color: #1e3a8a; margin: 30px 0 15px 0;">How to Resolve</h3>
            <ol style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
                <li>Check your M-Pesa message for the correct transaction code</li>
                <li>Ensure you paid to <strong>Paybill: 542542</strong>, <strong>Account: 515405</strong></li>
                <li>Contact us with your correct payment details</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/contact" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600;">Contact Support</a>
            </div>
        </div>
        
        ${getEmailFooter(memberData.email)}
    </div>
</body>
</html>`;
};

// New Event Notification Email
const getNewEventEmailHTML = (eventData, memberEmail) => {
    const eventDate = new Date(eventData.date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">📅</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">New Event Announced!</h1>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">Hello {{name}}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                We're excited to announce a new AECAS event. Mark your calendar!
            </p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e3a8a; margin: 0 0 15px 0; font-size: 22px;">${eventData.title}</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #6b7280; width: 30%;"><i>📆</i> Date:</td>
                        <td style="padding: 10px 0; color: #1f2937; font-weight: 600;">${eventDate}</td>
                    </tr>
                    ${eventData.time ? `<tr>
                        <td style="padding: 10px 0; color: #6b7280;"><i>🕐</i> Time:</td>
                        <td style="padding: 10px 0; color: #1f2937; font-weight: 600;">${eventData.time}</td>
                    </tr>` : ''}
                    ${eventData.location ? `<tr>
                        <td style="padding: 10px 0; color: #6b7280;"><i>📍</i> Location:</td>
                        <td style="padding: 10px 0; color: #1f2937; font-weight: 600;">${eventData.location}</td>
                    </tr>` : ''}
                </table>
                ${eventData.description ? `<p style="color: #4b5563; margin: 15px 0 0 0; line-height: 1.6;">${eventData.description}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/events" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600;">View All Events</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Don't miss out on this opportunity to connect with fellow members!
            </p>
        </div>
        
        ${getEmailFooter(memberEmail)}
    </div>
</body>
</html>`;
};

// Event Reminder Email
const getEventReminderEmailHTML = (eventData, memberEmail, daysUntil) => {
    const eventDate = new Date(eventData.date).toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const urgencyText = daysUntil === 1 ? "Tomorrow!" : `In ${daysUntil} days`;
    const urgencyColor = daysUntil === 1 ? '#dc2626' : '#eab308';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, #f59e0b 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">⏰</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Event Reminder</h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">${urgencyText}</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">Hello {{name}}!</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                This is a friendly reminder about an upcoming AECAS event. We hope to see you there!
            </p>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 4px solid #eab308;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 22px;">${eventData.title}</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #78350f; width: 30%;"><strong>📆 Date:</strong></td>
                        <td style="padding: 10px 0; color: #78350f; font-weight: 600;">${eventDate}</td>
                    </tr>
                    ${eventData.time ? `<tr>
                        <td style="padding: 10px 0; color: #78350f;"><strong>🕐 Time:</strong></td>
                        <td style="padding: 10px 0; color: #78350f; font-weight: 600;">${eventData.time}</td>
                    </tr>` : ''}
                    ${eventData.location ? `<tr>
                        <td style="padding: 10px 0; color: #78350f;"><strong>📍 Location:</strong></td>
                        <td style="padding: 10px 0; color: #78350f; font-weight: 600;">${eventData.location}</td>
                    </tr>` : ''}
                </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/events" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600;">View Event Details</a>
            </div>
        </div>
        
        ${getEmailFooter(memberEmail)}
    </div>
</body>
</html>`;
};

// New Announcement Email
const getAnnouncementEmailHTML = (announcementData, memberEmail) => {
    const priorityColors = {
        high: { bg: '#fef2f2', border: '#dc2626', text: '#7f1d1d', badge: '#dc2626' },
        normal: { bg: '#f0f9ff', border: '#3b82f6', text: '#1e3a8a', badge: '#3b82f6' },
        low: { bg: '#f0fdf4', border: '#10b981', text: '#065f46', badge: '#10b981' }
    };
    
    const colors = priorityColors[announcementData.priority] || priorityColors.normal;
    const priorityLabel = announcementData.priority === 'high' ? '🔴 Important' : 
                          announcementData.priority === 'low' ? '🟢 Info' : '🔵 Announcement';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 10px;">📢</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">New Announcement</h1>
        </div>
        
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e3a8a; margin: 0 0 20px 0;">Hello {{name}}!</h2>
            
            <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <span style="background-color: ${colors.badge}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">${priorityLabel}</span>
                </div>
                <h3 style="color: ${colors.text}; margin: 0 0 15px 0; font-size: 20px;">${announcementData.title}</h3>
                <p style="color: #4b5563; margin: 0; line-height: 1.7; white-space: pre-wrap;">${announcementData.content}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/announcements" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 25px; font-weight: 600;">View All Announcements</a>
            </div>
        </div>
        
        ${getEmailFooter(memberEmail)}
    </div>
</body>
</html>`;
};


// ============ EXPORT FUNCTIONS ============

module.exports = {
    sendEmail,
    sendBulkEmail,
    isEmailConfigured,
    
    // Registration emails
    sendWelcomeEmail: async (memberData) => {
        const subject = 'Welcome to AECAS - Registration Received';
        const html = getWelcomeEmailHTML(memberData);
        return sendEmail(memberData.email, subject, html);
    },
    
    sendPaymentConfirmedEmail: async (memberData) => {
        const subject = '✓ AECAS Membership Confirmed - Welcome!';
        const html = getPaymentConfirmedEmailHTML(memberData);
        return sendEmail(memberData.email, subject, html);
    },
    
    sendPaymentRejectedEmail: async (memberData) => {
        const subject = 'AECAS Registration - Payment Issue';
        const html = getPaymentRejectedEmailHTML(memberData);
        return sendEmail(memberData.email, subject, html);
    },
    
    // Event emails
    sendNewEventEmail: async (eventData, members) => {
        const subject = `📅 New AECAS Event: ${eventData.title}`;
        const html = getNewEventEmailHTML(eventData, '{{email}}');
        return sendBulkEmail(members, subject, html);
    },
    
    sendEventReminderEmail: async (eventData, members, daysUntil = 1) => {
        const urgency = daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} Days`;
        const subject = `⏰ Reminder: ${eventData.title} - ${urgency}!`;
        const html = getEventReminderEmailHTML(eventData, '{{email}}', daysUntil);
        return sendBulkEmail(members, subject, html);
    },
    
    // Announcement emails
    sendAnnouncementEmail: async (announcementData, members) => {
        const priorityPrefix = announcementData.priority === 'high' ? '🔴 Important: ' : '';
        const subject = `${priorityPrefix}AECAS Announcement: ${announcementData.title}`;
        const html = getAnnouncementEmailHTML(announcementData, '{{email}}');
        return sendBulkEmail(members, subject, html);
    }
};
