const fedexService = require('../services/fedex');

module.exports = {
    search: async (req, res) => {
        const { date, zipcode, country } = req.query;
        let status = 200;
        let response = {};

        try {
            response = {
                success: true,
                data: await fedexService.search(date, zipcode, country)
            };
        } catch (e) {
            response = {
                success: false,
                data: e.message
            };
        }
        res.status(status).json(response);
    },
};