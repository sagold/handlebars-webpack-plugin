const path = require("path");


/**
 * Returns the target filepath of a handlebars template
 * @param  {String} filepath            - input filepath
 * @param  {String} [outputTemplate]    - template for output filename.
 *                                          If ommited, the same filename stripped of its extension will be used
 * @return {String} target filepath
 */
module.exports = function getTargetFilepath(filepath, outputTemplate) {
    if (outputTemplate == null) {
        return filepath.replace(path.extname(filepath), "");
    }

    const fileName = path
        .basename(filepath)
        .replace(path.extname(filepath), "");
    return outputTemplate.replace("[name]", fileName);
};
