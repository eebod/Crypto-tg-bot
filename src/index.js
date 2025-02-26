const bot = require('./logic/bot');
const server = require('./logic/server');

const bot_token = process.env.BOT_TOKEN;
server(bot, bot_token);