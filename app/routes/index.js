const apiRouter = require('./api');

const dispatch = (app) => {
    // dispatch all API entry points
    apiRouter(app);

    app.get('/v1/', function (req, res) {
        res.send({
            code: 200,
            message: 'Application version 1.0'
        });
    });

    // unknown routes
    app.all('*', (req, res) => {
        res.status(404).send({
            code: 404,
            message: 'Resource not found',
        });
    });
};

module.exports = {
    dispatch,
};
