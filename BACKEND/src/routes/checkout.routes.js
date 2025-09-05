const router = require('express').Router();
const ctrl = require('../controllers/checkout.controller');
const express = require('express');

// Checkout
router.post('/stripe/checkout', ctrl.createCheckout);

// Confirmación SIN webhook (mientras pruebas)
router.get('/stripe/confirm', ctrl.confirm);

// Webhook (body RAW)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

module.exports = router;
