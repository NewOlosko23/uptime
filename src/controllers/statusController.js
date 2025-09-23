import StatusPage from '../models/StatusPage.js';
import Monitor from '../models/Monitor.js';

// @desc    Get all status pages for user
// @route   GET /api/status
// @access  Private
export const getStatusPages = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const statusPages = await StatusPage.find({ user: req.user._id })
      .populate('monitors', 'name url type lastStatus')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await StatusPage.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        statusPages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single status page
// @route   GET /api/status/:id
// @access  Private
export const getStatusPage = async (req, res, next) => {
  try {
    const statusPage = await StatusPage.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('monitors', 'name url type lastStatus lastCheck lastResponseTime uptime');

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found'
      });
    }

    res.json({
      success: true,
      data: { statusPage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new status page
// @route   POST /api/status
// @access  Private
export const createStatusPage = async (req, res, next) => {
  try {
    const statusPageData = {
      ...req.body,
      user: req.user._id
    };

    const statusPage = await StatusPage.create(statusPageData);

    res.status(201).json({
      success: true,
      message: 'Status page created successfully',
      data: { statusPage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update status page
// @route   PUT /api/status/:id
// @access  Private
export const updateStatusPage = async (req, res, next) => {
  try {
    const statusPage = await StatusPage.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found'
      });
    }

    res.json({
      success: true,
      message: 'Status page updated successfully',
      data: { statusPage }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete status page
// @route   DELETE /api/status/:id
// @access  Private
export const deleteStatusPage = async (req, res, next) => {
  try {
    const statusPage = await StatusPage.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found'
      });
    }

    res.json({
      success: true,
      message: 'Status page deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public status page
// @route   GET /api/status/public/:slug
// @access  Public
export const getPublicStatusPage = async (req, res, next) => {
  try {
    const statusPage = await StatusPage.getPublicStatusPage(req.params.slug);

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found'
      });
    }

    // Record page view
    await statusPage.recordView();

    // Get overall status
    const overallStatus = await statusPage.getOverallStatus();
    const uptimeStats = await statusPage.getUptimeStats();

    res.json({
      success: true,
      data: {
        statusPage: {
          ...statusPage.toObject(),
          overallStatus,
          uptimeStats
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Subscribe to status page
// @route   POST /api/status/:slug/subscribe
// @access  Public
export const subscribeToStatusPage = async (req, res, next) => {
  try {
    const { email } = req.body;

    const statusPage = await StatusPage.findOne({
      slug: req.params.slug,
      status: 'active',
      'settings.isPublic': true,
      'settings.allowSubscriptions': true
    });

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found or subscriptions not allowed'
      });
    }

    await statusPage.addSubscriber(email);

    res.json({
      success: true,
      message: 'Successfully subscribed to status updates'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsubscribe from status page
// @route   POST /api/status/:slug/unsubscribe
// @access  Public
export const unsubscribeFromStatusPage = async (req, res, next) => {
  try {
    const { email } = req.body;

    const statusPage = await StatusPage.findOne({
      slug: req.params.slug,
      status: 'active',
      'settings.isPublic': true
    });

    if (!statusPage) {
      return res.status(404).json({
        success: false,
        message: 'Status page not found'
      });
    }

    await statusPage.removeSubscriber(email);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from status updates'
    });
  } catch (error) {
    next(error);
  }
};
