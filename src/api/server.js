const http = require("http");
const util = require("util");
const { URL } = require("url");
const ApiRequest = require("./request");
const ApiResponse = require("./response");

class ApiServer {
	constructor() {
		this.stack = [];
	}

	/**
	 * Registers a new path and matching method to the api. This path will then be checked when handling an incoming 
	 * request. if the request matches this path and method it will call the method with a custom api request class, a 
	 * custom api response class and the path data as arguments. The path data contains information about the url of 
	 * the incoming request. The path may add arguments using ":NAME", which will be included in the path data object. 
	 * For example: the request "/user/123/rename" will be matched to the path "/user/:id/rename" and the path data 
	 * will be: {id: 123}. When an asterisk is added to the end of the specified path the handler will match all 
	 * requests that begin with the text before the asterisk. By default the method matches all incoming methods, 
	 * specified as "*". The callback may return a boolean, true when the stack may continue and false if the request 
	 * is finished.
	 * @param {String} path The path to register.
	 * @param {String} method The method to register.
	 * @param {Function} callback The callback to register.
	 */
	register(path, method = "*", callback) {
		this.log.trace(`Registered path '${path}' with method '${method}'`, "api");
		this.stack.push({
			path, method, callback
		});
	}

	/**
	 * Unregisters the specified path.
	 * @param {String} path The path to unregister.
	 */
	unregister(path) {
		const handlerIndex = this.stack.findIndex(handler => handler.path === path);

		if (handlerIndex < 0) return;

		this.stack.splice(handlerIndex);
	}

	/**
	 * Initializes the api by creating the server and starting error handing.
	 */
	initialize(log) {
		this.log = log;
		this.server = http.createServer((req, res) => {
			this.handle(req, res).catch(err => this.handleError(err));
		});
		this.server.on("error", err => this.handleError(err));
		this.log.debug("Initialized API server", "api");
	}

	/**
	 * Handles the incoming request. This function may only be used internally as it is called by the server when there 
	 * is a new incoming request.
	 * @param {http.IncomingMessage} req The incoming request.
	 * @param {http.ServerResponse} res The outgoing response.
	 * @returns {Promise} A promise that resolves when the request and response have been handled.
	 */
	async handle(req, res) {
		const url = new URL(req.url, "http://localhost/");
		const request = new ApiRequest(req);
		const response = new ApiResponse(res);

		this.log.debug(`Client connected at ${url.pathname}`, "api");

		for (let handler of this.stack) {
			if (handler.method !== "*" && handler.method !== req.method) continue;

			const pathData = this.parsePath(handler.path, url.pathname);

			if (pathData === undefined) continue;

			const canContinue = await handler.callback(request, response, pathData);

			if (!canContinue) return;
		}

		this.log.trace(`No handler for '${url.pathname}', returning 404`, "api");

		res.statusCode = 404;
		res.end();
	}

	/**
	 * Parses the given requested path using the specified template, also retreiving the arguments included in the 
	 * requested path. If the template does not match the given path it will return undefined. For more information 
	 * about the parsing see .register().
	 * @param {String} template The template to match with path to parse.
	 * @param {String} path The path to parse.
	 * @returns {Object} The parsed data or undefined if parsing was unsuccessful.
	 */
	parsePath(template, path) {
		const templateParts = template.split("/");
		const pathParts = path.split("/");
		const data = {};

		for (let i = 0; i < templateParts.length; i++) {
			const templatePart = templateParts[i];
			const pathPart = pathParts[i];

			if (templatePart.startsWith(":")) {
				if (pathPart === undefined) return;
				const key = templatePart.substring(1, templatePart.length);

				data[key] = pathPart;
			}
			else if (templatePart === "*") return data;
			else if (templatePart !== pathPart) return;
		}

		return data;
	}

	/**
	 * Handles the specified error by throwing it.
	 * TODO: Less damaging error handling?
	 * @param {Error} err The error to handle.
	 */
	handleError(err) {
		throw err;
	}

	/**
	 * Starts the api server created after initialization on the specified port. This is done async and this function 
	 * returns a Promise.
	 * @param {Object} options The options when starting.
	 * @param {Number} options.port The port to start on.
	 * @returns {Promise} A promise that is resolved when the server has started.
	 */
	start({ port } = {}) {
		return new Promise(resolve => {
			this.server.listen({ port }, () => resolve());
		});
	}

	/**
	 * Closes the api server. This is done async and this function returns a Promise.
	 * @returns {Promise} A promise that is resolved when the server has been closed.
	 */
	close() {
		return new Promise((resolve, reject) => {
			this.server.close(err => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}

module.exports = ApiServer;
