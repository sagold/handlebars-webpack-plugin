const path = require("path");


module.exports = function getRootFolder(sourcePath, entry, partials) {
    const domen = entry.split("*")[0];
    // array of all path elements except the relative ones (**|*)
    const rootArray = domen.split(path.sep);
    const rootFolderName = rootArray[rootArray.length - 2];

    if (partials) {
        let isPartialsPath = false;

        // ignore partials paths
        partials.forEach(partial => {
            let partialRootIndex = null;

            // find parent folder for relatives (**|*)
            if (partial.split(path.sep).indexOf("**") !== -1) {
                partialRootIndex = partial.split(path.sep).indexOf("**") - 1;
            } else if (partial.split(path.sep).indexOf("*") !== -1) {
                partialRootIndex = partial.split(path.sep).indexOf("*") - 1;
            }

            if (partialRootIndex) {
                // partial folder name
                const partialFolderName = partial.split(path.sep)[partialRootIndex];
                // current source folder name
                const folderName = path.dirname(sourcePath).split(path.sep)[partialRootIndex];
                // ignore partial
                if (folderName === partialFolderName) {
                    isPartialsPath = true;
                }
            }
        });

        if (isPartialsPath) {
            return false;
        }
    }

    return rootFolderName;
};
