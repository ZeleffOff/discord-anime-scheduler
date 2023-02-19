function _error(message, code) {
    const error = new Error(message);
    error.code = code;
    throw error;
}

module.exports = _error;