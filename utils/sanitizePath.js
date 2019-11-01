module.exports = function sanitizePath(filepath) {
    // convert windows path
    return filepath.replace(/\\/g, "/");
};
