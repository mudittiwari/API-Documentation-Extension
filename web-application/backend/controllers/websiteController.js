const Website = require('../models/Website');
const User = require('../models/User');
const mongoose = require('mongoose');


exports.createWebsite = async (req, res) => {
  try {
    const { websiteName, userId } = req.body;
    const existingWebsite = await Website.findOne({ websiteName, createdByUser: userId });
    if (existingWebsite) {
      return res.status(400).json({ message: 'Website already exists for this user' });
    }
    const newWebsite = new Website({
      websiteName,
      createdByUser: userId,
      endpoints: [],
    });
    await newWebsite.save();
    await User.findByIdAndUpdate(userId, { $push: { websites: newWebsite._id } });

    res.status(201).json({ message: 'Website created successfully', website: newWebsite });
  } catch (error) {
    console.error('Error creating website:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteWebsite = async (req, res) => {
  try {
    const { websiteId, userId } = req.body;
    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }
    if (website.createdByUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to delete this website' });
    }
    await User.findByIdAndUpdate(userId, { $pull: { websites: websiteId } });
    await website.deleteOne({ _id: websiteId });
    res.status(200).json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




exports.addEndpoint = async (req, res) => {
  try {
    const { websiteId, url, method, headers, requestBody, response, params } = req.body;
    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }
    const existingEndpoint = website.endpoints.find(
      (ep) => ep.url === url && ep.method === method
    );
    if (existingEndpoint) {
      return this.editEndpoint(req,res);
    }
    website.endpoints.push({ url, method, headers, requestBody, response, params });
    await website.save();

    res.status(200).json({ message: 'Endpoint added successfully', website });
  } catch (error) {
    console.error('Error adding endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeEndpoint = async (req, res) => {
  try {
    const { websiteId, url, method } = req.body;

    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }
    website.endpoints = website.endpoints.filter(
      (ep) => ep.url !== url || ep.method !== method
    );
    await website.save();
    res.status(200).json({ message: 'Endpoint removed successfully', website });
  } catch (error) {
    console.error('Error removing endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.editEndpoint = async (req, res) => {
  try {
    const { websiteId, url, method, headers, requestBody, response, params } = req.body;
    const website = await Website.findById(websiteId);
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }
    const endpoint = website.endpoints.find(
      (ep) => ep.url === url && ep.method === method
    );
    if (!endpoint) {
      return res.status(404).json({ message: 'Endpoint not found' });
    }
    if (headers) endpoint.headers = headers;
    if (requestBody !== undefined) endpoint.requestBody = requestBody;
    if (response !== undefined) endpoint.response = response;
    if (params !== undefined) endpoint.params = params;
    await website.save();
    res.status(200).json({ message: 'Endpoint updated successfully', website });
  } catch (error) {
    console.error('Error editing endpoint:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getUserWebsites = async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId).populate('websites');
    if (!user || !user.websites.length) {
      return res.status(404).json({ message: 'No websites found for this user' });
    }
    res.status(200).json({ message: 'Websites retrieved successfully', websites: user.websites });
  } catch (error) {
    console.error('Error retrieving websites:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getWebsiteEndpoints = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid or missing ID' });
    }
    const website = await Website.findById(id);
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.status(200).json({ message: 'Endpoints retrieved successfully', endpoints: website.endpoints });
  } catch (error) {
    console.error('Error retrieving endpoints:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
