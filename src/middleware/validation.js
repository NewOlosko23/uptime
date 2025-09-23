import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

export const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

export const validatePasswordUpdate = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
];

// Monitor validation rules
export const validateMonitor = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Monitor name must be between 1 and 100 characters'),
  body('url')
    .custom((value, { req }) => {
      const type = req.body.type;
      
      if (type === 'server') {
        // For server type, allow IP addresses and hostnames
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        const urlRegex = /^https?:\/\/.+/;
        
        if (ipRegex.test(value) || hostnameRegex.test(value) || urlRegex.test(value)) {
          return true;
        }
        throw new Error('For server type, please provide a valid IP address, hostname, or URL');
      } else {
        // For other types, require valid URL
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(value)) {
          throw new Error('Please provide a valid URL starting with http:// or https://');
        }
        return true;
      }
    }),
  body('type')
    .isIn(['website', 'api', 'server', 'port'])
    .withMessage('Invalid monitor type'),
  body('monitoringInterval')
    .optional()
    .isInt({ min: 30, max: 3600 })
    .withMessage('Monitoring interval must be between 30 and 3600 seconds'),
  body('timeout')
    .optional()
    .isInt({ min: 5, max: 300 })
    .withMessage('Timeout must be between 5 and 300 seconds'),
  handleValidationErrors
];

export const validateMonitorUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid monitor ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Monitor name must be between 1 and 100 characters'),
  body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),
  body('status')
    .optional()
    .isIn(['active', 'paused', 'maintenance'])
    .withMessage('Invalid status'),
  handleValidationErrors
];

// Alert validation rules
export const validateAlert = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Alert name must be between 1 and 100 characters'),
  body('type')
    .isIn(['downtime', 'uptime', 'slow_response', 'ssl_expiry', 'custom'])
    .withMessage('Invalid alert type'),
  body('monitor')
    .isMongoId()
    .withMessage('Invalid monitor ID'),
  body('channels.email.enabled')
    .optional()
    .isBoolean()
    .withMessage('Email channel enabled must be boolean'),
  body('channels.sms.enabled')
    .optional()
    .isBoolean()
    .withMessage('SMS channel enabled must be boolean'),
  handleValidationErrors
];

// Status page validation rules
export const validateStatusPage = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Status page name must be between 1 and 100 characters'),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  handleValidationErrors
];

// Query validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID`),
  handleValidationErrors
];
