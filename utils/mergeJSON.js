const glob = require("glob");
const path = require("path");


module.exports = function mergeJSON(absoluteGlobPattern) {
    const dataFiles = glob.sync(absoluteGlobPattern);
    const resultingData = {};
    dataFiles.forEach(filepath => {
        const id = path.basename(filepath, ".json");
        if (resultingData[id]) {
            throw new Error(`Duplicate id '${id}'. It has already been added to result.`);
        }
        resultingData[id] = require(filepath);
    });
    return resultingData;
};
