# CRYPTO TELEGRAM BOT
This bot serves different functions, it can fetch realtime cryptocurrency prices, as provided by coinGecko-API, majorly, it can set price alerts, and perform CRUD actions for that,create alert, remove alert, add new alerts and delete alerts. You can also get interesting information about your favorite cryptocurrency as well.
It uses mongoDB for this, and for me, this is run in a Dckerized container on, GCP VM instance. You can check out the bot [here](https://web.telegram.org/k/#@trendora_bot).


## Its Components.
The app has three main parts,

- **Express Server:** A server is created for the webhook proccess, following the Telegram documentation and code sample from their repo. This listens on a designated port, in my case 3000, and then listens for all Telgram updates to the application. This process is used as a more efficient alternative to the polling approach.

- **DB Logic:** The DB connects to a containered official docker image, with its ports exposed. The official nodeJS driver for docker is used, and all queries for the alert CRUD is operated inside the DB class. The bot.js file imports the class, and uses its methods as needed.


- **Telegram-bot-api:** The Telegram bot api is a node module from npm, It is an abstraction to directly interacting with Telegram bot API. I listen for triggers and send responses. For the alert notification, I have a cron Job that runs every 10 minutes(it is not the best approach, but there is limited API calls in coinGecko free tier). I then perform a db query that fetched all alerts not reached yet, filtering and getting unique crytpo-id. On price responses, I make a mongodb query to match price upper and lower bounds, to a 0.1% threshold. If any is reached, the chat id is recovered, and an alert is sent to the user with that, and that alert is disabled from future checks in the DB.


## Getting environment variables

- **BOT_TOKEN=<telegram_bot_token_from_bot_father>:** To get started with the Telegram bot, you need an API from Bot_father. To correctly do this, read Telegram documentation on that [here](https://core.telegram.org/bots/api).

<br>

- **COINGECKO_TOKEN=<coingecko_api_token>** Coingecko-api is used to retrieve crypto prices and facts as well, to get started, you need to create an account and then read the docs [here](https://docs.coingecko.com/v3.0.1/reference/introduction).
<br>

- **DB_CONNECTION_URI=mongodb://<...>/** This is the mongodb connection string, depending on if you're using atlas, or running mongodb locally, you can check the documentation [here](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/#std-label-node-connect-to-mongodb) for that. In my case, I am running mongo from a docker container, and exposing it to localhost with a -p flag to publish the port from the container on 20127:20127. You can watch this [video](https://youtu.be/gFjpv-nZO0U?si=RliCV73d3q2eBjT2) to better understand this.

<br>

- **WEBHOOK_URL=<webhook_url_for_telegram>** The webhook approach to bot message update means you need to have an ear listening for Telegram updates. To do that, you send your url to Telegram, and they communicate with your server there over port 80 or 443. During development, to test this, you can simply port forward your express server port in VS code, make public, and provide the url from the port forward in this field. You can read Telegran docs on webhook [here](https://core.telegram.org/bots/webhooks).

<br>

- **NODE_ENV=<DEV | PROD>:** During testing, I initially started with polling instead of webhook, when I decided to use webhooks, I needed a way to test thing and ensure they were working as I switched. To handle that more properly and easily, I use an env file which is watched in thebot.js file to know if to switch from polling to webhook in different scenarios. but the NODE_ENV field can be used for more things as well.

## Watch me use this project
<!-- [![Watch me use this project](<img-link>)](<video-url>)  
Click on Image to Youtube video or use link: <video-url> -->

## Help Improve
You can also contribute to improving how this works, by sending in a pull request. It can be to fix a problem, improve a section, or to add a new feature.

## Reach me
This was written and developed by me, Ebode.
You can find more adventurous solutions I have developed in my corner [here](https://www.ebode.dev).