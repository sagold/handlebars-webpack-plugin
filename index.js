"use strict";


var fs = require("fs");
var chalk = require("chalk");
var partials = require("./utils/partials");
var Handlebars = require("handlebars");


function HandlebarsPlugin(options) {
	this.outputFile = options.output;
	this.entryFile = options.entry;
	this.data = options.data || {};
	this.partials = partials.loadMap(Handlebars, options.partials);

    // register partials
	partials.addMap(Handlebars, this.partials);
    // register helpers
    Object.keys(options.helper || {}).forEach(function (helperId) {
        Handlebars.registerHelper(helperId, options.helper[helperId]);
    });
}

HandlebarsPlugin.prototype.apply = function (compiler, callback) {
	var templateContent = fs.readFileSync(this.entryFile, "utf-8");
	var template = Handlebars.compile(templateContent);
	var result = template(this.data);
	var outputFile = this.outputFile;

    compiler.plugin("compile", function (params) {
    	fs.writeFileSync(outputFile, result, "utf-8");
        console.log(chalk.green(outputFile + " created"));
    });
};


module.exports = HandlebarsPlugin;
