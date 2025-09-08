const router = require('express').Router();
const ctrl = require('../controllers/checkout.controller');

// Checkout
router.post('/stripe/checkout', ctrl.createCheckout);

// Confirmación SIN webhook (mientras pruebas)
router.get('/stripe/confirm', ctrl.confirm);

module.exports = router;
