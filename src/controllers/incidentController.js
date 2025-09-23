import Incident from '../models/Incident.js';
import Monitor from '../models/Monitor.js';

// @desc    Get all incidents for user
// @route   GET /api/incidents
// @access  Private
export const getIncidents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }

    const incidents = await Incident.find(query)
      .populate('monitor', 'name url type')
      .sort({ startedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Incident.countDocuments(query);

    res.json({
      success: true,
      data: {
        incidents,
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

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Private
export const getIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('monitor', 'name url type').populate('affectedServices', 'name url type');

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new incident
// @route   POST /api/incidents
// @access  Private
export const createIncident = async (req, res, next) => {
  try {
    const incidentData = {
      ...req.body,
      user: req.user._id
    };

    const incident = await Incident.create(incidentData);

    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update incident
// @route   PUT /api/incidents/:id
// @access  Private
export const updateIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      message: 'Incident updated successfully',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add incident update
// @route   POST /api/incidents/:id/updates
// @access  Private
export const addIncidentUpdate = async (req, res, next) => {
  try {
    const { status, message, isPublic = true } = req.body;

    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    await incident.addUpdate(status, message, isPublic);

    res.json({
      success: true,
      message: 'Incident update added successfully',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve incident
// @route   PATCH /api/incidents/:id/resolve
// @access  Private
export const resolveIncident = async (req, res, next) => {
  try {
    const { resolutionMessage } = req.body;

    const incident = await Incident.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    await incident.resolve(resolutionMessage);

    res.json({
      success: true,
      message: 'Incident resolved successfully',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active incidents
// @route   GET /api/incidents/active
// @access  Private
export const getActiveIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({
      user: req.user._id,
      status: { $in: ['investigating', 'identified', 'monitoring'] }
    })
    .populate('monitor', 'name url type')
    .sort({ startedAt: -1 });

    res.json({
      success: true,
      data: { incidents }
    });
  } catch (error) {
    next(error);
  }
};
