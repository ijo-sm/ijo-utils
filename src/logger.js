const fs = require("fs");

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
 * - `info` - Simple information reflecting normal behaviour. Events such as the start and stop of services are included
 * - `debug` (optional) - More granular information about the events taking place in the running enviroment
 * - `trace` (optional) - Logs every detail that could be of use. 
 * - `warn` - Unexpected events/uses that should not occure normally
 * - `error` - Serious issues that can cause things to fail
 * - `fatal` - Serious issues that cause the entire application to fail
 */
class Logger {
  /**
   * Create a new logging instance
   * 
   * ### Logging Level
   * 
   * `0` - logs `info`, `warn`, `error`, and `fatal`. Usage for production
   * `1` - logs all in `0` and `debug`. Used for basic debugging
   * `2` - logs all in `1` and `trace`. Used to see every detail logged for advanced debugging
   * 
   * @param {string} name Name of the log
   * @param {number} log_level The level of logging accepted, see above
   */
  constructor(name, log_level) {
    this.cache = "";
    this.name = name;
    if (log_level < 0 || log_level > 2) throw Error(`Log level of '${log_level}' not accepted; must be 0, 1, or 2`);
    this.log_level = log_level;
  }

  /**
   * Initialize the log with a path
   * @param {string} path Path of file to write log (should be in the ./logs/ directory)
   */
  initialize(path) {
    this.path = path;
    fs.writeFile(path, this.cache, "utf8", err => {
      if (err) throw Error(`${this.name} failed to write data to log: ${this.path}`)
    });
  }

  /**
   * Write to the log file
   * @param {string} msg Message to write to file
   */
  async write(msg) {
    msg = `[${this.timestamp()}] ${msg}\n`;
    this.cache += msg;
    fs.appendFile(this.path, msg, "utf8", err => {
      if (err && !this.path) throw Error(`${this.name} failed to write data to log: ${this.path}`) 
    });
  }

  /**
   * Get the timestamp
   */
  timestamp() {
    return new Date().toISOString();
  }

  /**
   * A timer that starts when called and returns a function that when invoked, 
   *   stops the timer and returns the time passed in milliseconds
   * @returns {function} function to call to stop the timer and get difference in milliseconds
   */
  timer() {
    var timestart = performance.now();
    return () => {return performance.now() - timestart}
  }

  /**
   * Log simple information
   * @param {string} message Message to log
   */
  info(message) {
    message = `${this.name} info: ${message}`;
    console.log(colors.info + message + colors.reset);
    this.write(message);
  }

  /**
   * Log a debug message
   * @param {string} message Message to log
   */
  debug(message) {
    if (this.log_level < 1) return;
    message = `${this.name} debug: ${message}`;
    console.log(colors.debug + message + colors.reset);
    this.write(message);
  }

  /**
   * Log a trace message
   * @param {string} message Message to log
   */
  trace(message) {
    if (!this.log_level < 2) return;
    message = `${this.name} trace: ${message}`;
    console.log(colors.trace + message + colors.reset);
    this.write(message);
  }

  /**
   * Log a warning
   * @param {string} message Message to log
   */
  warn(message) {
    message = `${this.name} warn: ${message}`;
    console.log(colors.warn + message + colors.reset);
    this.write(message);
  }

  /**
   * Log an error
   * @param {string} message Message to log
   */
  error(message) {
    message = `${this.name} error: ${message}`;
    console.log(colors.error + message + colors.reset);
    this.write(`${message}`);
  }

  /**
   * Log a fatal error
   * @param {string} message Message to log
   */
  fatal(message) {
    message = `${this.name} fatal: ${message}`;
    console.log(colors.fatal + message + colors.reset);
    this.write(`${message}`);
  }
}

module.exports = Logger;
