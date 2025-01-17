
const express = require('express');
const { createWebsite, addEndpoint, removeEndpoint, editEndpoint, getUserWebsites, getWebsiteEndpoints, deleteWebsite } = require('../controllers/websiteController.js');
const { requireSignIn } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.post('/create-website', requireSignIn, createWebsite);
router.post('/delete-website',deleteWebsite);
router.post('/add-endpoint', requireSignIn, addEndpoint);
router.post('/remove-endpoint', requireSignIn, removeEndpoint);
router.post('/edit-endpoint', requireSignIn, editEndpoint);
router.get('/get-user-websites', requireSignIn, getUserWebsites);
router.get('/get-website-endpoints', requireSignIn, getWebsiteEndpoints);

module.exports = router;