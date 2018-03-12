"use strict";
/**
 * `Image` plugin help.
 * 
 * @function
 * @name pluginHelp
 * @arg {yargs} yargs - `yargs` instance in order to expand its options.
 * @arg {function} d - Function to manage option description: join, colorize, etc.
 * @return {yargs} - Expanded `yargs` instance.
 */
module.exports = (args, d) => {
    return args
        .options({
            "screenshot-on-fail": {
                describe: d("Capture screenshot on chunk fail."),
                type: "boolean",
                group: "Image:",
            },
        });
};
