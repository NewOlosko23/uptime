# WhatsApp Integration Usage Examples

This document shows how to use the WhatsApp integration in your Avodal Uptime monitoring system.

## Basic Usage

### 1. Send a Simple WhatsApp Message

```javascript
import { sendWhatsAppMessage } from './src/services/whatsappService.js';

// Send a simple text message
await sendWhatsAppMessage({
  to: '+1234567890',
  message: 'Hello! This is a test message from your monitoring system.'
});
```

### 2. Send Monitor Alert via WhatsApp

```javascript
import { sendMonitorAlertWhatsApp } from './src/services/whatsappService.js';

// Example alert and monitor data
const alert = {
  name: 'Server Down Alert',
  channels: {
    whatsapp: {
      enabled: true,
      recipients: [
        { phoneNumber: '+1234567890', name: 'John Doe' },
        { phoneNumber: '+0987654321', name: 'Jane Smith' }
      ]
    }
  }
};

const monitor = {
  name: 'My Website',
  url: 'https://example.com',
  lastStatus: 'down',
  lastResponseTime: 5000,
  lastCheck: new Date().toISOString()
};

const incident = {
  description: 'Connection timeout after 30 seconds'
};

// Send the alert
await sendMonitorAlertWhatsApp(alert, monitor, incident);
```

### 3. Send Test WhatsApp Message

```javascript
import { sendTestWhatsApp } from './src/services/whatsappService.js';

const monitor = {
  name: 'Test Monitor',
  url: 'https://example.com'
};

// Send test message
await sendTestWhatsApp('+1234567890', monitor);
```

## Integration with Your Existing Code

### 1. In Alert Controller

The alert controller already includes WhatsApp support. When you test an alert:

```javascript
// This is already implemented in alertController.js
if (alertResult.channels.includes('whatsapp')) {
  const { sendTestWhatsApp } = await import('../services/whatsappService.js');
  if (alert.channels.whatsapp.recipients.length > 0) {
    promises.push(sendTestWhatsApp(
      alert.channels.whatsapp.recipients[0].phoneNumber, 
      alert.monitor
    ));
  }
}
```

### 2. In Monitoring Service

The monitoring service automatically sends WhatsApp notifications when alerts are triggered:

```javascript
// This is already implemented in monitoringService.js
if (alertResult.channels.includes('whatsapp')) {
  const { sendMonitorAlertWhatsApp } = await import('./whatsappService.js');
  promises.push(sendMonitorAlertWhatsApp(alert, monitor, incident));
}
```

## Frontend Integration

### 1. Using WhatsApp Configuration Component

```jsx
import WhatsAppConfig from '../components/WhatsAppConfig';

const [whatsappConfig, setWhatsappConfig] = useState({
  enabled: false,
  recipients: []
});

<WhatsAppConfig 
  whatsappConfig={whatsappConfig}
  onChange={setWhatsappConfig}
  disabled={isSubmitting}
/>
```

### 2. In Alert Form

```jsx
import AlertForm from '../components/AlertForm';

const handleSubmit = async (formData) => {
  // formData.channels.whatsapp contains the WhatsApp configuration
  const response = await fetch('/api/alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });
};

<AlertForm 
  onSubmit={handleSubmit}
  onCancel={() => navigate('/dashboard')}
  monitors={monitors}
/>
```

## API Endpoints

### Create Alert with WhatsApp

```javascript
POST /api/alerts
{
  "name": "Server Down Alert",
  "type": "downtime",
  "monitor": "monitor_id_here",
  "channels": {
    "email": {
      "enabled": true,
      "recipients": [
        { "email": "admin@example.com", "name": "Admin" }
      ]
    },
    "whatsapp": {
      "enabled": true,
      "recipients": [
        { "phoneNumber": "+1234567890", "name": "John Doe" }
      ]
    }
  }
}
```

### Test Alert

```javascript
POST /api/alerts/:id/test
// This will send test messages to all enabled channels (email + WhatsApp)
```

## Message Templates

The system includes these built-in templates:

### 1. Monitor Alert Template
```
🚨 *Monitor Alert: {alertName}*

*Monitor:* {monitorName}
*URL:* {monitorUrl}
*Status:* {status}
*Response Time:* {responseTime}ms
*Last Check:* {lastCheck}
*Error:* {errorMessage}

View details: {dashboardUrl}
```

### 2. Incident Update Template
```
📢 *Incident Update: {incidentTitle}*

*Status:* {status}

*Latest Update:*
{updateMessage}

*Posted:* {updateTimestamp}

View full details: {dashboardUrl}
```

### 3. Test Message Template
```
🧪 *Test WhatsApp Message*

This is a test message from your Avodal Uptime monitoring system.

*Monitor:* {monitorName}
*URL:* {monitorUrl}
*Status:* UP ✅
*Response Time:* 150ms

If you received this message, WhatsApp notifications are working correctly!
```

## Error Handling

```javascript
try {
  await sendWhatsAppMessage({
    to: '+1234567890',
    template: 'monitorAlert',
    data: alertData
  });
} catch (error) {
  console.error('WhatsApp message failed:', error.message);
  
  // Common error scenarios:
  // - Invalid phone number format
  // - Infobip API key not configured
  // - WhatsApp Business account not active
  // - Rate limit exceeded
}
```

## Validation

```javascript
import { validateWhatsAppNumber } from './src/services/whatsappService.js';

const phoneNumber = '+1234567890';
if (validateWhatsAppNumber(phoneNumber)) {
  console.log('Valid WhatsApp number');
} else {
  console.log('Invalid phone number format');
}
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
INFOBIP_API_KEY=your_actual_api_key_here
INFOBIP_BASE_URL=https://your-subdomain.api.infobip.com
INFOBIP_WHATSAPP_SENDER=your_whatsapp_business_number
```

## Testing

Use the provided test script:

```bash
cd server
node test-whatsapp.js
```

Or test through the API:

```bash
# Test an alert
curl -X POST http://localhost:5000/api/alerts/alert_id/test \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Check your `.env` file has `INFOBIP_API_KEY`
   - Restart your server after adding environment variables

2. **"WhatsApp sender not configured"**
   - Verify `INFOBIP_WHATSAPP_SENDER` is set correctly
   - Ensure the number format includes country code

3. **Messages not being delivered**
   - Check your Infobip dashboard for delivery reports
   - Verify the recipient phone number format
   - Ensure your WhatsApp Business account is active

4. **Invalid phone number format**
   - Use international format: +1234567890
   - Include country code
   - No spaces or special characters except +

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
```

This will show detailed logs of WhatsApp API calls and responses.
