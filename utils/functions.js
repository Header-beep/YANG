const chalk = require('chalk'),
	logger = require('./logger'),
	ms = require('ms'),
	needle = require('needle');

module.exports = {
	checkConfig: (conf) => {
		const configData = {
			debugMode: ['boolean'], proxyRetries: ['number'], removeNonWorkingProxies: ['boolean'],
			requestTimeout: ['number'], restartWithWorkingProxies: ['boolean'], saveWorkingProxies: ['boolean'],
			threads: ['number'], webhookUrl: ['string'],
		};

		for (const k of Object.keys(configData)) {
			if (conf[k] === undefined) logger.error(`The ${chalk.bold(k)} configuration variable is missing, please check the '${chalk.yellow('config.json')}' file.`);
			else if (!configData[k].includes(typeof conf[k])) logger.error(`The ${chalk.bold(k)} configuration variable is misconfigured. It should be one of '${chalk.yellow(configData[k].join(', '))}'.`);
		}
		return module.exports.checkToken(conf.redeemToken);
	},

	checkToken: (token) => {
		const headers = { 'Content-Type': 'application/json', 'Authorization': token, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0' };
		needle.get('https://discordapp.com/api/v8/users/@me', { open_timeout: 10000, headers: headers }, (err, res, body) => {
			if (err) { logger.error(`Could not login using the provided ${chalk.bold('redeemToken')} : ${err}`); }
			else if (body.message === '401: Unauthorized') { logger.error(`The provided ${chalk.bold('redeemToken')} was invalid.`); }
			else { logger.debug(`Successfully logged in as ${chalk.bold(chalk.blue(body.username + '#' + body.discriminator))}.`); }
			return;
		});
	},

	formatThreadID: (threadCount, threadId) => {
		return '0'.repeat(String(threadCount).length).slice(0, -String(threadId).length) + threadId;
	},

	sendWebhook: (url, message) => {
		const date = +new Date();

		const data = JSON.stringify({ 'username': 'YANG', 'avatar_url': 'https://cdn.discordapp.com/attachments/794307799965368340/794356433806032936/20210101_010801.jpg', 'content': message });

		needle.post(url, data, { headers: { 'Content-Type': 'application/json' } }, (err) => {
			if (err) logger.error(`Could not deliver webhook message : ${err}`);
			else logger.debug(`Successfully delivered webhook message in ${ms(+new Date() - date, { long: true })}.`);
		});
	},

	redeemNitro: async (code, config) => {

		needle.post(`https://discordapp.com/api/v6/entitlements/gift-codes/${code}/redeem`, '', { headers: { 'Authorization': config.redeemToken } }, (err, res, body) => {
			if (err || !body) {
				console.log(err);
				logger.info(chalk.red(`Failed to redeem a nitro gift code : ${code} > ${err}.`));
			}

			else if (body.message === 'You are being rate limited.') {
				logger.warn(chalk.red(`You are being rate limited, trying again in ${chalk.yellow(body.retry_after / 1000)} seconds.`));
				return setTimeout(() => { module.exports.redeemNitro(code, config); }, body.retry_after + 50);
			}
			else if (body.message === 'Unknown Gift Code') {
				return logger.warn(`${chalk.bold(code)} was an invalid gift code or had already been claimed.`);
			}
			else if (body.message === 'This gift has been redeemed already.') {
				if (config.webhookUrl) { module.exports.sendWebhook(config.webhookUrl, `This gift code (${code}) has already been redeemed...`); }
				return logger.warn(`${code} has already been redeemed...`);
			}
			else {
				if (config.webhookUrl) { module.exports.sendWebhook(config.webhookUrl, 'Successfully claimed a gift code !!!'); }
				return logger.info(chalk.green(`Successfully redeemed the nitro gift code : ${code} !`));
			}

		});
	},
};