const express = require('express');
const fedexController = require('../controllers/fedex');
const config = require('../../config');

module.exports = (app) => {
    const apiRouter = express.Router();

    apiRouter.use(function (req, res, next) {
        const apiKey = req.header('x-api-key');
        if (apiKey == config.API_KEY) {
            next();
        } else {
            res.status(401).send({
                success: false,
                message: 'Unauthorized'
            })
        }
    });
    apiRouter.get('/fedex/search', fedexController.search);
    apiRouter.get('/fedex/search-by-refs', fedexController.searchByRefs);
    app.use('/v1/', apiRouter);
};
