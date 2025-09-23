import Mailjet from 'node-mailjet';

// Configuration - Update these with your actual Mailjet credentials
const MAILJET_API_KEY = '77f88844f6df9fce5cb22b9e26e99208';
const MAILJET_SECRET_KEY = '8305269ebd5a9d920e7cc128a7e86b62';
const FROM_EMAIL = 'oloogeorge633@gmail.com';
const FROM_NAME = 'Uptime';
const TEST_EMAIL = 'oloogeorge633@gmail.com'; // Replace with your test email

// Initialize Mailjet
const mailjet = Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_SECRET_KEY);

// Test basic email sending
async function sendTestEmail() {
  try {
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME
          },
          To: [
            {
              Email: TEST_EMAIL,
              Name: 'Test User'
            }
          ],
          Subject: '🧪 Mailjet Test Email',
          HTMLPart: `
            <h2>Mailjet Integration Test</h2>
            <p>This is a test email from your Avodal Uptime monitoring system using Mailjet.</p>
            <p><strong>Provider:</strong> Mailjet</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p>If you received this email, Mailjet integration is working correctly!</p>
          `,
          TextPart: `
            Mailjet Integration Test
            
            This is a test email from your Avodal Uptime monitoring system using Mailjet.
            
            Provider: Mailjet
            Timestamp: ${new Date().toLocaleString()}
            
            If you received this email, Mailjet integration is working correctly!
          `
        }
      ]
    });

    const result = await request;
    console.log('✅ Mailjet test email sent successfully:', result.body);
    return result.body;
  } catch (error) {
    console.error('❌ Error sending Mailjet test email:', error);
    throw error;
  }
}

// Test monitor alert email
async function sendMonitorAlertEmail() {
  try {
    const alertData = {
      alertName: 'Server Down Alert',
      monitorName: 'My Website',
      monitorUrl: 'https://example.com',
      status: 'down',
      responseTime: 5000,
      lastCheck: new Date().toISOString(),
      errorMessage: 'Connection timeout after 30 seconds'
    };

    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME
          },
          To: [
            {
              Email: TEST_EMAIL,
              Name: 'Test User'
            }
          ],
          Subject: `🚨 Monitor Alert: ${alertData.monitorName}`,
          HTMLPart: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Monitor Alert</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background: #f9f9f9; }
                  .status { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background: #ef4444; }
                  .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Monitor Alert</h1>
                  </div>
                  <div class="content">
                    <h2>${alertData.alertName}</h2>
                    <p>Your monitor <strong>${alertData.monitorName}</strong> has triggered an alert.</p>
                    
                    <div class="details">
                      <h3>Monitor Details:</h3>
                      <p><strong>URL:</strong> ${alertData.monitorUrl}</p>
                      <p><strong>Status:</strong> <span class="status">${alertData.status.toUpperCase()}</span></p>
                      <p><strong>Response Time:</strong> ${alertData.responseTime}ms</p>
                      <p><strong>Last Check:</strong> ${new Date(alertData.lastCheck).toLocaleString()}</p>
                      <p><strong>Error:</strong> ${alertData.errorMessage}</p>
                    </div>
                    
                    <p>You can view more details and manage your monitors in your <a href="http://localhost:3000/dashboard">dashboard</a>.</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated alert from Avodal Uptime.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          TextPart: `
            Monitor Alert: ${alertData.alertName}
            
            Your monitor ${alertData.monitorName} has triggered an alert.
            
            Monitor Details:
            URL: ${alertData.monitorUrl}
            Status: ${alertData.status.toUpperCase()}
            Response Time: ${alertData.responseTime}ms
            Last Check: ${new Date(alertData.lastCheck).toLocaleString()}
            Error: ${alertData.errorMessage}
            
            View details: http://localhost:3000/dashboard
            
            This is an automated alert from Avodal Uptime.
          `
        }
      ]
    });

    const result = await request;
    console.log('✅ Monitor alert email sent successfully:', result.body);
    return result.body;
  } catch (error) {
    console.error('❌ Error sending monitor alert email:', error);
    throw error;
  }
}

// Test incident update email
async function sendIncidentUpdateEmail() {
  try {
    const updateData = {
      incidentTitle: 'Database Connection Issues',
      status: 'investigating',
      updateMessage: 'We are currently investigating database connection issues affecting our main services. Our team is working to resolve this as quickly as possible.',
      updateTimestamp: new Date().toISOString()
    };

    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: FROM_EMAIL,
            Name: FROM_NAME
          },
          To: [
            {
              Email: TEST_EMAIL,
              Name: 'Test User'
            }
          ],
          Subject: `📢 Incident Update: ${updateData.incidentTitle}`,
          HTMLPart: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Incident Update</title>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #3175e3; color: white; padding: 20px; text-align: center; }
                  .content { padding: 20px; background: #f9f9f9; }
                  .status { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background: #f59e0b; }
                  .update { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3175e3; }
                  .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Incident Update</h1>
                  </div>
                  <div class="content">
                    <h2>${updateData.incidentTitle}</h2>
                    <p><strong>Status:</strong> <span class="status">${updateData.status.toUpperCase()}</span></p>
                    
                    <div class="update">
                      <h3>Latest Update:</h3>
                      <p>${updateData.updateMessage}</p>
                      <p><em>Posted: ${new Date(updateData.updateTimestamp).toLocaleString()}</em></p>
                    </div>
                    
                    <p>You can view the full incident details on your <a href="http://localhost:3000/dashboard/incidents">status page</a>.</p>
                  </div>
                  <div class="footer">
                    <p>This is an automated update from Avodal Uptime.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          TextPart: `
            Incident Update: ${updateData.incidentTitle}
            
            Status: ${updateData.status.toUpperCase()}
            
            Latest Update:
            ${updateData.updateMessage}
            
            Posted: ${new Date(updateData.updateTimestamp).toLocaleString()}
            
            View full details: http://localhost:3000/dashboard/incidents
            
            This is an automated update from Avodal Uptime.
          `
        }
      ]
    });

    const result = await request;
    console.log('✅ Incident update email sent successfully:', result.body);
    return result.body;
  } catch (error) {
    console.error('❌ Error sending incident update email:', error);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Mailjet integration tests...\n');

  try {
    console.log('1. Testing basic Mailjet email...');
    await sendTestEmail();
    console.log('✅ Basic test passed\n');

    console.log('2. Testing monitor alert email...');
    await sendMonitorAlertEmail();
    console.log('✅ Monitor alert test passed\n');

    console.log('3. Testing incident update email...');
    await sendIncidentUpdateEmail();
    console.log('✅ Incident update test passed\n');

    console.log('🎉 All Mailjet tests completed successfully!');
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n📋 Setup Checklist:');
    console.log('1. ✅ Update MAILJET_API_KEY with your actual Mailjet API key');
    console.log('2. ✅ Update MAILJET_SECRET_KEY with your actual Mailjet secret key');
    console.log('3. ✅ Update FROM_EMAIL with your verified sender email');
    console.log('4. ✅ Update FROM_NAME with your sender name');
    console.log('5. ✅ Update TEST_EMAIL with your test email address');
    console.log('6. ✅ Ensure your Mailjet account is active and configured');
    console.log('7. ✅ Verify your sender email is verified in Mailjet');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { sendTestEmail, sendMonitorAlertEmail, sendIncidentUpdateEmail, runTests };
