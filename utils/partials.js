"use strict";


var fs = require("fs");
var glob = require("glob");
var chalk = require("chalk");
var log = require("./log");


function getPartialId(path) {
    return path.match(/\/([^\/]+\/[^\/]+)\.[^\.]+$/).pop();
}

function loadPartialsMap(Handlebars, partialsGlob) {
	var partials = [];

    if (partialsGlob == null) {
        return {};
    }

	partialsGlob.forEach(function (partialGlob) {
		partials = partials.concat(glob.sync(partialGlob));
	});

	var partialMap = {};
	partials.forEach(function (path) {
		partialMap[getPartialId(path)] = path;
	});

	return partialMap;
}

function addPartialsMap(Handlebars, partialMap) {
	Object.keys(partialMap).forEach(function (partialId) {
		log(chalk.gray("registering partial " + partialId));
		Handlebars.registerPartial(partialId, fs.readFileSync(partialMap[partialId], "utf8"));
	});
}


module.exports = {

	getId: getPartialId,
	loadMap: loadPartialsMap,
	addMap: addPartialsMap
};
