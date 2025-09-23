import axios from "axios";

// Configuration - Updated with your actual values
const BASE_URL = "https://v3qnwp.api.infobip.com"; 
const API_KEY = "App 1de220135f81235745156c8241579c48-0b8ce0fd-0250-48e0-8346-bcb2b4890e48";
const WHATSAPP_SENDER = "447860088970"; // Your Infobip WhatsApp Business number

// Test WhatsApp message function
async function sendTestWhatsApp() {
  try {
    const response = await axios.post(
      `${BASE_URL}/whatsapp/1/message/text`,
      {
        from: `+${WHATSAPP_SENDER}`, // from: must be in E.164 format (with +)
        to: "254799590711", // to: should be digits only, no +
        content: {
          text: "🧪 *Test WhatsApp Message*\n\nThis is a test message from your Avodal Uptime monitoring system.\n\n*Monitor:* Test Monitor\n*URL:* https://example.com\n*Status:* UP ✅\n*Response Time:* 150ms\n\nIf you received this message, WhatsApp notifications are working correctly!"
        }
      },
      {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    console.log("✅ WhatsApp message sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending WhatsApp message:", error.response?.data || error.message);
    throw error;
  }
}

// Test monitor alert WhatsApp message
async function sendMonitorAlertWhatsApp() {
  try {
    const alertData = {
      alertName: "Server Down Alert",
      monitorName: "My Website",
      monitorUrl: "https://example.com",
      status: "down",
      responseTime: 5000,
      lastCheck: new Date().toISOString(),
      errorMessage: "Connection timeout"
    };

    const messageText = `🚨 *Monitor Alert: ${alertData.alertName}*

*Monitor:* ${alertData.monitorName}
*URL:* ${alertData.monitorUrl}
*Status:* ${alertData.status.toUpperCase()}
*Response Time:* ${alertData.responseTime}ms
*Last Check:* ${new Date(alertData.lastCheck).toLocaleString()}
*Error:* ${alertData.errorMessage}

View details: http://localhost:3000/dashboard`;

    const response = await axios.post(
      `${BASE_URL}/whatsapp/1/message/text`,
      {
        from: `+${WHATSAPP_SENDER}`, // from: must be in E.164 format (with +)
        to: "254799590711", // to: should be digits only, no +
        content: {
          text: messageText
        }
      },
      {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    console.log("✅ Monitor alert WhatsApp message sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending monitor alert WhatsApp message:", error.response?.data || error.message);
    throw error;
  }
}

// Test incident update WhatsApp message
async function sendIncidentUpdateWhatsApp() {
  try {
    const updateData = {
      incidentTitle: "Database Connection Issues",
      status: "investigating",
      updateMessage: "We are currently investigating database connection issues affecting our main services. Our team is working to resolve this as quickly as possible.",
      updateTimestamp: new Date().toISOString()
    };

    const messageText = `📢 *Incident Update: ${updateData.incidentTitle}*

*Status:* ${updateData.status.toUpperCase()}

*Latest Update:*
${updateData.updateMessage}

*Posted:* ${new Date(updateData.updateTimestamp).toLocaleString()}

View full details: http://localhost:3000/dashboard/incidents`;

    const response = await axios.post(
      `${BASE_URL}/whatsapp/1/message/text`,
      {
        from: `+${WHATSAPP_SENDER}`, // from: must be in E.164 format (with +)
        to: "254799590711", // to: should be digits only, no +
        content: {
          text: messageText
        }
      },
      {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      }
    );

    console.log("✅ Incident update WhatsApp message sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending incident update WhatsApp message:", error.response?.data || error.message);
    throw error;
  }
}

// Main test function
async function runTests() {
  console.log("🚀 Starting WhatsApp integration tests...\n");

  try {
    console.log("1. Testing basic WhatsApp message...");
    await sendTestWhatsApp();
    console.log("✅ Basic test passed\n");

    console.log("2. Testing monitor alert message...");
    await sendMonitorAlertWhatsApp();
    console.log("✅ Monitor alert test passed\n");

    console.log("3. Testing incident update message...");
    await sendIncidentUpdateWhatsApp();
    console.log("✅ Incident update test passed\n");

    console.log("🎉 All WhatsApp tests completed successfully!");
  } catch (error) {
    console.error("💥 Test failed:", error.message);
    console.log("\n📋 Setup Checklist:");
    console.log("1. ✅ Update BASE_URL with your Infobip subdomain");
    console.log("2. ✅ Update API_KEY with your actual Infobip API key");
    console.log("3. ✅ Update WHATSAPP_SENDER with your WhatsApp Business number");
    console.log("4. ✅ Update test phone number (2547XXXXXXXX) with your actual number");
    console.log("5. ✅ Ensure your Infobip account is active and configured");
    console.log("6. ✅ Verify your WhatsApp Business account is approved");
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { sendTestWhatsApp, sendMonitorAlertWhatsApp, sendIncidentUpdateWhatsApp };
