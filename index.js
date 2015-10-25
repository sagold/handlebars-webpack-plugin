"use strict";


var fs = require("fs");
var chalk = require("chalk");
var partials = require("./utils/partials");
var Handlebars = require("handlebars");


function HandlebarsPlugin(options) {
    if (options.onBeforeSetup) {
        options.onBeforeSetup(Handlebars);
    }

    this.options = options;
	this.outputFile = options.output;
	this.entryFile = options.entry;
	this.data = options.data || {};
	this.partials = partials.loadMap(Handlebars, options.partials);

    if (options.onBeforeAddPartials) {
        options.onBeforeAddPartials(Handlebars, this.partials);
    }

    // register partials
	partials.addMap(Handlebars, this.partials);
    // register helpers
    Object.keys(options.helper || {}).forEach(function (helperId) {
        Handlebars.registerHelper(helperId, options.helper[helperId]);
    });
}

HandlebarsPlugin.prototype.apply = function (compiler, callback) {
    var options = this.options;
	var templateContent = fs.readFileSync(this.entryFile, "utf-8");

    if (options.onBeforeCompile) {
        templateContent = options.onBeforeCompile(Handlebars, templateContent) || templateContent;
    }

	var template = Handlebars.compile(templateContent);

    if (options.onBeforeRender) {
        this.data = options.onBeforeRender(Handlebars, this.data) || this.data;
    }

	var result = template(this.data);
	var outputFile = this.outputFile;

    compiler.plugin("compile", function (params) {

        if (options.onBeforeSave) {
            result = options.onBeforeSave(Handlebars, result) || result;
        }

    	fs.writeFileSync(outputFile, result, "utf-8");
        console.log(chalk.green(outputFile + " created"));

        if (options.onDone) {
            options.onDone(Handlebars);
        }
    });
};


module.exports = HandlebarsPlugin;
