
const express = require('express');
const { register, login, validateToken } = require('../controllers/authController.js');
const { requireSignIn } = require('../middleware/authMiddleware.js');

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/validate-token', validateToken);

module.exports = router;