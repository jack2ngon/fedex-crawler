const config = require('./config');
const express = require('express');
const router = require('./app/routes');

require('events').EventEmitter.defaultMaxListeners = 100;

const app = express();
const port = config.APP_PORT || 5505;

app.listen(port, () => console.log(`Listening on ${ port }`));

router.dispatch(app);