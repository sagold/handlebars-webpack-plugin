const glob = require("glob");
const chalk = require("chalk");
const log = require("./log");
const path = require("path");


function getId(filepath) {
    const id = filepath.match(/\/([^/]*).js$/).pop();
    return id.replace(/\.?helper\.?/, "");
}


function register(Handlebars, id, fun) { // eslint-disable-line no-shadow
    if (Handlebars.helpers[id]) {
        log(chalk.yellow(`The helper '${id}' is already registered.
            Remove duplications to prevent hard to find errors.`));
    } else {
        log(chalk.grey(`+ helper '${id}'`));
    }
    Handlebars.registerHelper(id, fun);
}

function unregister(Handlebars, ...helpers) {
    helpers.forEach(id => (Handlebars.helpers[id] = undefined));
}

/**
 * Resolves the helpers config to a map with id, filepath and the corresponding helper-function
 *
 * @param  {Object} query    - object containing mappings of helperId:helperFunc or anyName:globPatternString
 * @return {Array} list of objects { id, filepath, helperFunction }
 */
function resolve(query) {
    const resolvedHelpers = [];

    Object
        .keys(query)
        .forEach(helperId => {
            // globbed paths
            if (typeof query[helperId] === "string") {
                const foundHelpers = glob.sync(query[helperId]);
                foundHelpers.forEach(pathToHelper => {
                    delete require.cache[require.resolve(pathToHelper)];
                    resolvedHelpers.push({
                        id: getId(pathToHelper),
                        filepath: path.normalize(pathToHelper),
                        helperFunction: require(pathToHelper)
                    });
                });
                return;
            }

            resolvedHelpers.push({
                id: helperId,
                filepath: false,
                helperFunction: query[helperId]
            });
        });

    return resolvedHelpers;
}


module.exports = {
    getId,
    register,
    unregister,
    resolve
};
