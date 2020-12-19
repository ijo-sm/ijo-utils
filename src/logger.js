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
 * There are different levels of logs which each have there own function. 
 * 
 * ### Log Levels
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
   * @param {string} name Name of the log
   * @param {string} path Path of file to write log (should be in the ./logs directory)
   * @param {boolean} debug If the log should accept debug messages
   * @param {boolean} trace If the log should accept trace messages
   */
  constructor(name, path, debug=false, trace=false) {
    this.name = name;
    this.path = path;
    this._debug = debug;
    this._trace = trace;
    fs.writeFile(path, "", "utf8", err => {
      if (err) throw Error(`${this.name} failed to write data to log: ${this.path}`)
    });
    this.debug("Created log");
  }

  /**
   * Write to the log file
   * @param {string} msg Message to write to file
   */
  async write(msg) {
    fs.appendFile(this.path, `[${this.timestamp()}] ${msg}\n`, "utf8", err => {
      if (err) throw Error(`${this.name} failed to write data to log: ${this.path}`)
    });
  }

  /**
   * Get the timestamp
   */
  timestamp() {
    return new Date().toISOString();
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
    if (!this._debug) return;
    message = `${this.name} debug: ${message}`;
    console.log(colors.debug + message + colors.reset);
    this.write(message);
  }

  /**
   * Log a trace message
   * @param {string} message Message to log
   */
  trace(message) {
    if (!this._trace) return;
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
