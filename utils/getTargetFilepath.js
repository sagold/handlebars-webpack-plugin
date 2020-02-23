const path = require("path");
const sanitizePath = require("./sanitizePath");


/**
 * Returns the target filePath of a handlebars template
 * @param  {String} filePath            - input filePath
 * @param  {String} [outputTemplate]    - template for output filename. If ommited, the same filename stripped of its
 *                                        extension will be used
 * @param  {String} [rootPath]          - input rootPath
 * @return {String} target filePath
 */
module.exports = function getTargetFilepath(filePath, outputTemplate, rootPath) {
    filePath = sanitizePath(filePath);
    rootPath = rootPath ? sanitizePath(rootPath) : path.dirname(filePath);

    if (outputTemplate == null) {
        return filePath.replace(path.extname(filePath), "");
    }

    const folderPath = path
        .dirname(filePath)
        .split(rootPath)[1];

    const fileName = path
        .basename(filePath)
        .replace(path.extname(filePath), "");

    return outputTemplate
        .replace("[path]", folderPath)
        .replace("[name]", fileName);
};
