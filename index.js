'use strict'

const restify = require('restify');
const path = require('path');
const config = require('./lib/config')

// Import required bot services. See https://aka.ms/bot-services to learn more about the different part of a bot
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { BotConfiguration } = require('botframework-config');

// Import our custom bot class that provides a turn handling function.
const { SimplePromptBot } = require('./lib/bot');

// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

// Create HTTP server
let server = restify.createServer();
server.listen(config.server.port, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log(`\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`);
    console.log(`\nTo talk to your bot, open simple-prompt-bot.bot file in the Emulator`);
});

// .bot file path
const BOT_FILE = path.join(__dirname, (process.env.botFilePath || ''));

let botConfig;
try {
    // Read bot configuration from .bot file.
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.\n\n`);
    process.exit();
}

const DEV_ENVIRONMENT = 'development';

// bot name as defined in .bot file
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);

// Get bot endpoint configuration by service name
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION);

// Create adapter. See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration .
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.microsoftAppID,
    appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
    // Clear out state
    await conversationState.delete(context);
};

const memoryStorage = new MemoryStorage();

const conversationState = new ConversationState(memoryStorage);

// Create the bot object that provides the turn handler function.
const userState = new UserState(memoryStorage);

const bot = new SimplePromptBot(conversationState, userState);

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route the incoming activity to the main bot turn handler.
        await bot.onTurn(context);
    });
});
