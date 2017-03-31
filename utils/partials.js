const fs = require("fs");
const glob = require("glob");
const chalk = require("chalk");
const log = require("./log");


function getPartialId(path) {
    return path.match(/\/([^/]+\/[^/]+)\.[^.]+$/).pop();
}

function loadPartialsMap(Handlebars, partialsGlob) {
    let partials = [];

    if (partialsGlob == null) {
        return {};
    }

    partialsGlob.forEach((partialGlob) => {
        partials = partials.concat(glob.sync(partialGlob));
    });

    const partialMap = {};
    partials.forEach((path) => {
        partialMap[getPartialId(path)] = path;
    });

    return partialMap;
}

function addPartialsMap(Handlebars, partialMap) {
    Object.keys(partialMap).forEach((partialId) => {
        log(chalk.gray(`registering partial '${partialId}'`));
        Handlebars.registerPartial(partialId, fs.readFileSync(partialMap[partialId], "utf8"));
    });
}


module.exports = {

    getId: getPartialId,
    loadMap: loadPartialsMap,
    addMap: addPartialsMap
};
