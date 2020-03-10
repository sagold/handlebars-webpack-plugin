const path = require("path");


module.exports = function getRootFolder(sourcePath, entry) {
    const domen = entry.split("*")[0];
    // array of all path elements except the relative ones (**|*)
    const rootArray = domen.split(path.sep);
    const rootFolderName = rootArray[rootArray.length - 2];

    return rootFolderName;
};
