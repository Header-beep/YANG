const
	chalk = require('chalk'),
	{ existsSync, readFileSync } = require('fs'),
	{ createDefaultConfigFile } = require('./functions.js'),
	winston = require('winston'),
	yaml = require('js-yaml');

if (!existsSync('./config.yml')) createDefaultConfigFile();
const debug_mode = yaml.load(readFileSync('./config.yml')).debug_mode;

module.exports = winston.createLogger({
	transports: [new winston.transports.Console()],
	format: winston.format.printf(log => {
		const date = new Date();
		const times = [date.getHours(), date.getMinutes(), date.getSeconds()].map(t => t >= 10 ? t : '0' + t);

		const time = chalk.magenta(times.join(':')) + ' ';
		const message = ` » ${log.message}`;

		process.stdout.clearLine(); // Fix overlapping

		if (log.level === 'info') return time + chalk.greenBright(`[${log.level.toUpperCase()}] `) + message;
		else if (log.level === 'warn') return time + chalk.yellow(`[${log.level.toUpperCase()}] `) + message;
		else if (log.level === 'error') return time + chalk.red(`[${log.level.toUpperCase()}]`) + message;
		else if (log.level === 'debug') return time + chalk.blue(`[${log.level.toUpperCase()}]`) + message;
		else return time + `[${log.level.toUpperCase()}]` + message;
	}),
	level: debug_mode ? 'debug' : 'info',
});