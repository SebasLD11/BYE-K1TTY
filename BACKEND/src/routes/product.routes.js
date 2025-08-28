const router = require('express').Router();
const ctrl = require('../controllers/product.controller');

router.get('/', ctrl.list);

module.exports = router;