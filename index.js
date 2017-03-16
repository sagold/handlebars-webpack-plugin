"use strict";

var fs = require("fs-extra");
var path = require("path");
var chalk = require("chalk");
var partialUtils = require("./utils/partials");
var Handlebars = require("handlebars");
var glob = require("glob");
var log = require('./utils/log');


// export Handlebars for easy access in helpers
HandlebarsPlugin.Handlebars = Handlebars;


function getHelperId(filepath) {
    var id = filepath.match(/\/([^\/]*).js$/).pop();
    return id.replace(/\.?helper\.?/, "");
}

function getDataId(filepath) {
    var id = filepath.match(/\/([^\/]*)$/).pop();
    return id.replace(/\.?data\.?/, "");
}

function addHelper(Handlebars, id, fun) {
    console.log(chalk.grey("HandlebarsPlugin: registering helper " + id));
    Handlebars.registerHelper(id, fun);
}

function HandlebarsPlugin(options) {
    if (options.onBeforeSetup) {
        options.onBeforeSetup(Handlebars);
    }

    this.options = options;
		this.outputFile = options.output;
		this.entryFile = options.entry;
    this.fileDependencies = [];

    // register helpers
    var self = this;
    var helperQueries = options.helpers || {};
    Object.keys(helperQueries).forEach(function (helperId) {
        var foundHelpers;

        // globbed paths
        if (typeof helperQueries[helperId] === "string") {
            foundHelpers = glob.sync(helperQueries[helperId]);
            foundHelpers.forEach(function (pathToHelper) {
                addHelper(Handlebars, getHelperId(pathToHelper), require(pathToHelper));
                self.addDependency(pathToHelper);
            });

        // functions
        } else {
            addHelper(Handlebars, helperId, helperQueries[helperId]);
        }
    });
}

HandlebarsPlugin.Handlebars = Handlebars;

HandlebarsPlugin.prototype.readFile = function (filepath) {
    this.fileDependencies.push(filepath);
    return fs.readFileSync(filepath, "utf-8");
};

HandlebarsPlugin.prototype.addDependency = function () {
    this.fileDependencies.push.apply(this.fileDependencies, arguments);
};

HandlebarsPlugin.prototype.apply = function (compiler) {
    var self = this;
    var options = this.options;
    var entryFile = this.entryFile;
    var outputFile = this.outputFile;

    compiler.plugin("compile", function (object, done) {
        var templateContent;
        var template;
        var result;
        var partials;
        var data = {};
        var dataMap;

        // fetch paths to partials
        partials = partialUtils.loadMap(Handlebars, options.partials);

        if (options.onBeforeAddPartials) {
            options.onBeforeAddPartials(Handlebars, partials);
        }
        // register partials
        partialUtils.addMap(Handlebars, partials);
        // watch all partials for changes
        self.addDependency.apply(self, Object.keys(partials).map(function (key) {return partials[key]; }) );

        templateContent = self.readFile(entryFile, "utf-8");

        if (options.onBeforeCompile) {
            templateContent = options.onBeforeCompile(Handlebars, templateContent) || templateContent;
        }
        template = Handlebars.compile(templateContent);

        // fetch paths to data files
        dataMap = partialUtils.loadMap(Handlebars, options.data);

        if (options.onBeforeRender) {
            dataMap = options.onBeforeRender(Handlebars, dataMap) || dataMap;
        }

        // watch all data files for changes
        self.addDependency.apply(self, Object.keys(dataMap).map(function (key) {return dataMap[key]; }) );

        Object.keys(dataMap).forEach(function (dataId) {
          log(chalk.gray("registering data file " + getDataId(dataId)));
          delete require.cache[dataMap[dataId]];
          delete require.cache[fs.realpathSync(dataMap[dataId])];
          data[getDataId(dataId)] = require(dataMap[dataId]);
        });

        result = template(data);

        if (options.onBeforeSave) {
            result = options.onBeforeSave(Handlebars, result) || result;
        }
    	fs.outputFileSync(outputFile, result, "utf-8");

        console.log(chalk.green(outputFile + " created"));

        if (options.onDone) {
            options.onDone(Handlebars);
        }
    });

    compiler.plugin("emit", function (compiler, done) {
        // add dependencies to watch. This might not be the correct place for that - but it works
        // webpack filters duplicates...
        compiler.fileDependencies = compiler.fileDependencies.concat(self.fileDependencies);
        done();
    });
};


module.exports = HandlebarsPlugin;
