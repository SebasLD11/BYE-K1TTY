// backend/src/routes/checkout.routes.js
const router = require('express').Router();
const ctrl = require('../controllers/checkout.controller');

// Checkout ya existe
router.post('/stripe/checkout', ctrl.createCheckout);

// Webhook (nuevo)
const express = require('express');
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

module.exports = router;