"use strict";


var fs = require("fs");
var chalk = require("chalk");
var partialUtils = require("./utils/partials");
var Handlebars = require("handlebars");


function HandlebarsPlugin(options) {
    if (options.onBeforeSetup) {
        options.onBeforeSetup(Handlebars);
    }

    this.options = options;
	this.outputFile = options.output;
	this.entryFile = options.entry;
	this.data = options.data || {};

    // register helpers
    Object.keys(options.helper || {}).forEach(function (helperId) {
        Handlebars.registerHelper(helperId, options.helper[helperId]);
    });
}

HandlebarsPlugin.prototype.apply = function (compiler) {
    var options = this.options;
    var data = this.data;
    var entryFile = this.entryFile;
    var outputFile = this.outputFile;


    compiler.plugin("compile", function (params) {

        var templateContent;
        var template;
        var result;
        var partials;

        // fetch paths to partials
        partials = partialUtils.loadMap(Handlebars, options.partials);

        if (options.onBeforeAddPartials) {
            options.onBeforeAddPartials(Handlebars, partials);
        }
        // register partials
        partialUtils.addMap(Handlebars, partials);

        templateContent = fs.readFileSync(entryFile, "utf-8");

        if (options.onBeforeCompile) {
            templateContent = options.onBeforeCompile(Handlebars, templateContent) || templateContent;
        }
        template = Handlebars.compile(templateContent);

        if (options.onBeforeRender) {
            data = options.onBeforeRender(Handlebars, data) || data;
        }
        result = template(data);

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
