class FedexException extends Error {
    constructor(code, message = '')
    {
        super(message);

        Error.captureStackTrace(this, this.constructor);

        this.code = code;
        this.message = message;
    }
}
class FedexLoadTrackingPageException extends FedexException {}

module.exports = {
    FedexException,
    FedexLoadTrackingPageException,
}