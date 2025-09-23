import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Infobip WhatsApp API configuration
const BASE_URL = process.env.INFOBIP_BASE_URL 
  ? (process.env.INFOBIP_BASE_URL.startsWith('http') 
      ? process.env.INFOBIP_BASE_URL 
      : `https://${process.env.INFOBIP_BASE_URL}`)
  : 'https://your-subdomain.api.infobip.com';
const API_KEY = `App ${process.env.INFOBIP_API_KEY}`; // Format: "App YOUR_API_KEY"
const INFOBIP_WHATSAPP_SENDER = process.env.INFOBIP_WHATSAPP_SENDER; // Your WhatsApp Business number

// WhatsApp message templates
const templates = {
  monitorAlert: (data) => `🚨 *Monitor Alert: ${data.alertName}*

*Monitor:* ${data.monitorName}
*URL:* ${data.monitorUrl}
*Status:* ${data.status.toUpperCase()}
*Response Time:* ${data.responseTime}ms
*Last Check:* ${new Date(data.lastCheck).toLocaleString()}
${data.errorMessage ? `*Error:* ${data.errorMessage}` : ''}

View details: ${process.env.CLIENT_URL}/dashboard`,

  incidentUpdate: (data) => `📢 *Incident Update: ${data.incidentTitle}*

*Status:* ${data.status.toUpperCase()}

*Latest Update:*
${data.updateMessage}

*Posted:* ${new Date(data.updateTimestamp).toLocaleString()}

View full details: ${process.env.CLIENT_URL}/dashboard/incidents`,

  testMessage: (data) => `🧪 *Test WhatsApp Message*

This is a test message from your Avodal Uptime monitoring system.

*Monitor:* ${data.monitorName}
*URL:* ${data.monitorUrl}
*Status:* UP ✅
*Response Time:* 150ms

If you received this message, WhatsApp notifications are working correctly!`
};

// Send WhatsApp message via Infobip API
export const sendWhatsAppMessage = async ({ to, message, template, data }) => {
  try {
    if (!process.env.INFOBIP_API_KEY || !INFOBIP_WHATSAPP_SENDER) {
      throw new Error('Infobip API key and WhatsApp sender not configured');
    }

    let messageText;

    if (template && templates[template]) {
      messageText = templates[template](data);
    } else if (message) {
      messageText = message;
    } else {
      throw new Error('Either template or message content must be provided');
    }

    // Format phone numbers correctly
    // from: must be in E.164 format (with +)
    const fromNumber = INFOBIP_WHATSAPP_SENDER.startsWith('+') 
      ? INFOBIP_WHATSAPP_SENDER 
      : `+${INFOBIP_WHATSAPP_SENDER}`;
    
    // to: should be digits only, no +
    const toNumber = to.replace(/^\+/, '');

    const payload = {
      from: fromNumber,
      to: toNumber,
      content: {
        text: messageText
      }
    };

    const response = await axios.post(
      `${BASE_URL}/whatsapp/1/message/text`,
      payload,
      {
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

// Send monitor alert via WhatsApp
export const sendMonitorAlertWhatsApp = async (alert, monitor, incident = null) => {
  const recipients = alert.channels.whatsapp.recipients.map((r) => r.phoneNumber);

  const alertData = {
    alertName: alert.name,
    monitorName: monitor.name,
    monitorUrl: monitor.url,
    status: monitor.lastStatus,
    responseTime: monitor.lastResponseTime,
    lastCheck: monitor.lastCheck,
    errorMessage: incident ? incident.description : null,
  };

  const promises = recipients.map(phoneNumber => 
    sendWhatsAppMessage({
      to: phoneNumber,
      template: 'monitorAlert',
      data: alertData
    })
  );

  return Promise.allSettled(promises);
};

// Send incident update via WhatsApp
export const sendIncidentUpdateWhatsApp = async (incident, update, phoneNumbers) => {
  if (!phoneNumbers || phoneNumbers.length === 0) return;

  const updateData = {
    incidentTitle: incident.title,
    status: update.status,
    updateMessage: update.message,
    updateTimestamp: update.timestamp,
  };

  const promises = phoneNumbers.map(phoneNumber => 
    sendWhatsAppMessage({
      to: phoneNumber,
      template: 'incidentUpdate',
      data: updateData
    })
  );

  return Promise.allSettled(promises);
};

// Send test WhatsApp message
export const sendTestWhatsApp = async (phoneNumber, monitor) => {
  try {
    const testData = {
      monitorName: monitor.name,
      monitorUrl: monitor.url
    };

    const result = await sendWhatsAppMessage({
      to: phoneNumber,
      template: 'testMessage',
      data: testData
    });

    console.log('Test WhatsApp message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending test WhatsApp message:', error);
    throw error;
  }
};

// Test WhatsApp provider configuration
export const testWhatsAppProvider = async (phoneNumber) => {
  try {
    const testData = {
      monitorName: 'Test Monitor',
      monitorUrl: 'https://example.com'
    };

    const result = await sendWhatsAppMessage({
      to: phoneNumber,
      template: 'testMessage',
      data: testData
    });

    return {
      success: true,
      provider: 'whatsapp',
      result: result
    };
  } catch (error) {
    console.error('Error testing WhatsApp provider:', error);
    return {
      success: false,
      provider: 'whatsapp',
      error: error.message
    };
  }
};

// Get WhatsApp provider info
export const getWhatsAppProviderInfo = () => {
  return {
    provider: 'whatsapp',
    configured: !!(process.env.INFOBIP_API_KEY && process.env.INFOBIP_WHATSAPP_SENDER),
    baseUrl: process.env.INFOBIP_BASE_URL,
    sender: process.env.INFOBIP_WHATSAPP_SENDER
  };
};

// Validate WhatsApp phone number format
export const validateWhatsAppNumber = (phoneNumber) => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

// Get WhatsApp message status (for webhook handling)
export const getWhatsAppMessageStatus = async (messageId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/whatsapp/1/reports/${messageId}`,
      {
        headers: {
          'Authorization': API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error getting WhatsApp message status:', error);
    throw error;
  }
};
