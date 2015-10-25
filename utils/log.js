"use strict";


var chalk = require("chalk");


function log() {
	var args = Array.prototype.slice.call(arguments, 0);
	args.unshift(chalk.gray("HandlebarsPlugin:"));
	console.log.apply(console, args);
}


module.exports = log;
