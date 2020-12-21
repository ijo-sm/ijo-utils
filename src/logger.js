const path = require("path");
const FSUtils = require("./fs");
const {performance} = require('perf_hooks');

const colors = {
    info: "\x1b[32m",
    debug: "\x1b[35m",
    trace: "\x1b[36m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    fatal: "\x1b[1m\x1b[31m",
    reset: "\x1b[0m"
}

/**
 * The `Logger` class is used to keep track of events when debugging IJO.
 * There are different types of logs which each have there own function. 
 * 
 * ### Log Types
 * 
 * - `trace` (optional) - Logs every detail that could be of use. 
 * - `debug` (optional) - More granular information about the events taking place in the running enviroment
 * - `info` - Simple information reflecting normal behaviour. Events such as the start and stop of services are included
 * - `warn` - Unexpected events/uses that should not occure normally
 * - `error` - Serious issues that can cause things to fail
 * - `fatal` - Serious issues that cause the entire application to fail
 */
class Logger {
    /**
     * Create a new logging instance.
     * 
     * ### Logging Level
     * 
     * `0` - logs `info`, `warn`, `error`, and `fatal`. Usage for production
     * `1` - logs all in `0` and `debug`. Used for basic debugging
     * `2` - logs all in `1` and `trace`. Used to see every detail logged for advanced debugging
     * 
     * @param {Object} options The default options for the logger. These options will be overwritten on initialization.
     * @param {String} options.name Name of the log.
     * @param {String} options.folder The folder to place the log in. By default this is "./logs".
     * @param {number} options.logLevel The level of logging accepted, see above.
     */
    constructor({name, folder="./logs", logLevel = 0} = {}) {
        if (logLevel < 0 || logLevel > 2) throw Error(`Log level of '${logLevel}' not accepted; must be 0, 1, or 2`);
        this.name = name;
        this.folder = folder;
        this.logLevel = logLevel;
        this.cache = [];
        this.initialized = false;
        this.writing = false;
    }

    /**
     * Initialize the log with a folder, name and logLevel. It will also create the folder if it doesn't exist already.
     * The cache that is being stored will be written lastly.
     * @param {Object} options The options when logging.
     * @param {String} options.folder The folder to write the log to (by default is the ./logs/ directory).
     * @param {String} options.name The name of this log.
     * @param {number} options.logLevel The level of logging that will be included.
     * @returns {Promise} A promise that resolves when the logger has been initialized.
     */
    async initialize({folder=this.folder, name=this.name, logLevel=this.logLevel} = {}) {
        this.folder = folder;
        this.name = name;
        this.logLevel = logLevel;
        this.path = path.join(this.folder, `${this.name}-${this.time({includeHours: true, separator: "-"})}.log`);

        if (!FSUtils.exists(this.folder) || !await FSUtils.isFolder(this.folder)) {
            await FSUtils.createFolder(this.folder);
        }

        if (this.cache === undefined) return;

        await this.writeCache();
    }

    /**
     * Closes the logger. If there is still logs in the cache and it is not writing them it will write them to an
     * emergency file. This is done to ensure that the logs will always be written even when the logger isn't sure
     * where to write them.
     * @returns {Promise} A promise that resolves when the logger has closed.
     */
    async close() {
        if(this.cache.length === 0 || this.writing) return;
        if(this.path) {
            this.writeCache();

            return;
        }

        if (!FSUtils.exists(this.folder) || !await FSUtils.isFolder(this.folder)) {
            await FSUtils.createFolder(this.folder);
        }
        
        this.path = path.join(this.folder, `${this.name}-${this.time({includeHours: true, separator: "-"})}.log`);

        await this.writeCache({path});
    }

    /**
     * Writes all the logs that are still in cache to the file at the specified path. Ifter writing this asynchronously
     * there are more logs these will be written too. This ensures that the logs will be written in the correct order.
     * @param {String} path The path to write the cache to. By default this is the path set at this.path. 
     * @returns {Promise} A promise that resolves when all logs are written or when some other call is making sure they
     * are written. Don't depend on the logs being written after this is resolved.
     */
    async writeCache(path = this.path) {
        if (this.writing || path === undefined || this.cache.length === 0) return;

        const text = this.cache.map(log => JSON.stringify(log)).join("\n") + "\n";
        
        this.cache = [];
        this.writing = true;

        await FSUtils.append(this.path, text);

        this.writing = false;

        if(this.cache.length > 0) await this.writeCache();
    }

    /**
     * Logs the given message with the specified log level and namespace.
     * @param {String} message Message to log.
     * @param {Object} options The options to log.
     * @param {number} options.level The log level.
     * @param {String} options.namespace The namespace.
     */
    log(message, {level, namespace} = {}) {
        this.logToConsole(message, {level, namespace});
        this.logToFile(message, {level, namespace});
    }

    /**
     * logs the message to the console.
     * @param {String} message Message to log.
     * @param {Object} options The options to log.
     * @param {number} options.level The log level.
     * @param {String} options.namespace The namespace.
     */
    logToConsole(message, {level, namespace} = {}) {
        const time = this.time();

        console.log(`[${time} - ${colors[level]}${level}${colors.reset}]${namespace ? ` (${namespace}): ` : ": "}${message}`);
    }

    /**
     * logs the message to the file or if there is no file it will add it to the cache.
     * @param {String} message Message to log.
     * @param {Object} options The options to log.
     * @param {number} options.level The log level.
     * @param {String} options.namespace The namespace.
     */
    logToFile(message, {level, namespace} = {}) {
        const date = this.timestamp();

        this.cache.push({
            message, level, namespace, date
        });
        this.writeCache();
    }

    /**
     * Get the timestamp as ISO string.
     * @returns {String} The timestamp.
     */
    timestamp() {
        return new Date().toISOString();
    }

    /**
     * Returns the time as string, 
     * @param {Object} options The options for the time string.
     * @param {boolean} includeHours If hours should be included at the start. This is set to false by default.
     * @param {String} separator The separator between each part of the time. It is ":" by default.
     */
    time({includeHours=false, separator=":"} = {}) {
        const date = new Date();
        const hours =  String(date.getHours()).padStart(2, "0");
        const minutes =  String(date.getMinutes()).padStart(2, "0");
        const seconds =  String(date.getSeconds()).padStart(2, "0");

        return `${includeHours ? `${hours}${separator}` : ""}${minutes}${separator}${seconds}`;
    }

    /**
     * A timer that starts when called and returns a function that when invoked, stops the timer and returns the time 
     * passed as string.
     * @param {Object} options The options for the timer.
     * @param {number} options.decimals The amount of decimal precision. By default there are three decimals.
     * @returns {Function} A function to call to stop the timer and get difference in milliseconds.
     */
    timer({decimals=3} = {}) {
        const startTime = performance.now();

        return () => {
            return `${(performance.now() - startTime).toFixed(decimals)}ms`;
        };
    }

    /**
     * Log simple information.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    info(message, namespace) {
        this.log(message, {level: "info", namespace});
    }

    /**
     * Log a debug message. This is only logged when the log level is high enough.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    debug(message, namespace) {
        if (this.logLevel < 1) return;

        this.log(message, {level: "debug", namespace});
    }

    /**
     * Log a trace message. This is only logged when the log level is high enough.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    trace(message, namespace) {
        if (this.log_level < 2) return;

        this.log(message, {level: "trace", namespace});
    }

    /**
     * Log a warning.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    warn(message, namespace) {
        this.log(message, {level: "warn", namespace});
    }

    /**
     * Log an error.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    error(message, namespace) {
        this.log(message, {level: "error", namespace});
    }

    /**
     * Log a fatal error.
     * @param {String} message Message to log.
     * @param {String} namespace The namespace.
     */
    fatal(message, namespace) {
        this.log(message, {level: "fatal", namespace});
    }
}

module.exports = Logger;
