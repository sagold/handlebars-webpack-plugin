const chalk = require("chalk");


function log(...args) {
    args.unshift(chalk.gray("HandlebarsPlugin:"));
    console.log.apply(console, args);
}


module.exports = log;
