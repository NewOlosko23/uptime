# Avodal Uptime - Backend API

A comprehensive MERN stack backend for the Avodal Uptime monitoring service.

## Features

- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 📊 **Monitor Management** - CRUD operations for uptime monitors
- 🚨 **Alert System** - Email (Resend) notifications
- 📈 **Real-time Updates** - WebSocket support for live dashboard updates
- 📱 **Status Pages** - Public status pages for service transparency
- 🎯 **Incident Management** - Track and manage service incidents

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Socket.io** - Real-time communication
- **Resend** - Email service

## Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Resend API key

## Installation

1. **Clone the repository**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/avodal-uptime
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   
   # Email (Resend)
   RESEND_API_KEY=your_resend_api_key_here
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # Frontend URL
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password` - Reset password

### Monitors
- `GET /api/monitors` - Get all monitors
- `POST /api/monitors` - Create new monitor
- `GET /api/monitors/:id` - Get single monitor
- `PUT /api/monitors/:id` - Update monitor
- `DELETE /api/monitors/:id` - Delete monitor
- `PATCH /api/monitors/:id/toggle` - Pause/resume monitor
- `GET /api/monitors/:id/stats` - Get monitor statistics
- `POST /api/monitors/test` - Test monitor configuration

### Alerts
- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create new alert
- `GET /api/alerts/:id` - Get single alert
- `PUT /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert
- `PATCH /api/alerts/:id/toggle` - Toggle alert status
- `POST /api/alerts/:id/test` - Test alert

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/:id` - Get single incident
- `PUT /api/incidents/:id` - Update incident
- `POST /api/incidents/:id/updates` - Add incident update
- `PATCH /api/incidents/:id/resolve` - Resolve incident

### Status Pages
- `GET /api/status` - Get all status pages
- `POST /api/status` - Create new status page
- `GET /api/status/:id` - Get single status page
- `PUT /api/status/:id` - Update status page
- `DELETE /api/status/:id` - Delete status page
- `GET /api/status/public/:slug` - Get public status page
- `POST /api/status/:slug/subscribe` - Subscribe to status updates


## Database Models

### User
- Authentication and profile information
- Subscription details
- Preferences and settings

### Monitor
- Website/API monitoring configuration
- Monitoring statistics and history
- Alert settings

### Alert
- Notification configuration
- Trigger conditions
- Delivery channels (email)

### Incident
- Service outage tracking
- Status updates and resolution
- Public incident management

### StatusPage
- Public status page configuration
- Service grouping and display
- Subscriber management

## Monitoring Service

The monitoring service runs background jobs to check monitor endpoints:

- **Scheduled Checks** - Based on monitor interval settings
- **Real-time Updates** - WebSocket notifications for status changes
- **Alert Triggering** - Automatic notifications on status changes
- **Incident Management** - Automatic incident creation and resolution

## WebSocket Events

### Client → Server
- `join-monitor` - Join monitor room for real-time updates

### Server → Client
- `monitor-update` - Monitor status change notification

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS configuration
- Helmet security headers

## Error Handling

- Global error handler middleware
- Validation error handling
- Database error handling
- API error responses

## Development

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests (placeholder)

### Code Structure
```
src/
├── controllers/     # Route handlers
├── models/         # MongoDB schemas
├── routes/         # API endpoints
├── middleware/     # Custom middleware
├── services/       # Business logic
├── utils/          # Helper functions
└── config/         # Configuration files
```

## Deployment

1. Set production environment variables
2. Build the application
3. Start with PM2 or similar process manager
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Configure MongoDB connection
7. Set up Stripe webhooks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
