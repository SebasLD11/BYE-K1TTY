const router = require('express').Router();
const ctrl = require('../controllers/checkout.controller');

router.post('/summary', ctrl.summary);
router.post('/finalize', ctrl.finalize);

router.post('/email-buyer', ctrl.emailBuyer);
router.post('/email-vendor', ctrl.emailVendor);

module.exports = router;
