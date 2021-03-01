require('dotenv').config();
module.exports = {
    APP_NAME: process.env.APP_NAME,
    APP_ENV: process.env.APP_ENV,
    APP_PORT: process.env.APP_PORT,
    APP_URL: process.env.APP_URL,
    ENABLE_PROXY: process.env.ENABLE_PROXY,
    API_KEY: process.env.API_KEY,
}