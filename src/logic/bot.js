const TelegramBot = require("node-telegram-bot-api");
const cron = require('node-cron');
const axios = require('axios');
require("dotenv").config();

const botToken = process.env.BOT_TOKEN;
const coinGeckoToken = process.env.COINGECKO_TOKEN;

const DB = require('./db');
const cryptoTrendsDB = new DB();

let dbUp = false;
cryptoTrendsDB.connect()
  .then(() => { dbUp = true; console.log('DB connected.') })
  .catch(() => { console.log('DB not connected!') })


let bot;
if (process.env.NODE_ENV == 'PROD') {
  const webhookUrl = process.env.WEBHOOK_URL;
  bot = new TelegramBot(botToken);

  // Set webhook
  bot.setWebHook(`${webhookUrl}${botToken}`);
} else {

  // Set Poll
  bot = new TelegramBot(botToken, { polling: true });
}


// Response on first bot interaction/call
bot.onText(/\/start/, async (msg, match) => {
  try {
    const message = `Welcome <b>${msg.chat.username}</b>, I'm <b>Trendora</b>, your cryptocurrency assistant. I can help you with: \n\n➙ <b>Live Prices:</b> Get real-time cryptocurrency prices.\n\n➙ <b>Price Monitoring:</b> Keep track of price changes and receive alerts:\n\n      • Target price reached/crossed(↑|↓).\n\n      • 0.1% price UP or DOWN threshold alert.\n\n➙ <b>Trending Cryptos:</b> Discover the top trending cryptocurrencies, sorted by search popularity.\n\nTo learn and get started with available commands, use /help\n\nPowered by <b><a href="https://www.coingecko.com/en/api/">CoinGecko</a></b>\n\n<b><a href="https://www.ebode.dev">Meet-me</a></b> | &lt;Backend Engineer&gt;`;
    await bot.sendMessage(msg.chat.id, message, {
      parse_mode: "HTML",
      disable_web_page_preview: false,
    });
  } catch (error) {
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});

// Command manual response
bot.onText(/\/help/, async (msg, match) => {
  try {
    const message = `Available commands and how to use them.\n\n/trending < - /1/3/5/10>\n- Top trending cryptocurrencies (based on search).\n• Ex: '/trending'  -  top 5 trending assets\n         '/trending 3'  -  top 3 trending assets\n\n/find <cryptocurrency>\n- Find cryptocurrency id to be used with other commands.\n• Ex: '/find dogecoin'\n\n/price <cryptocurrency-id>\n- Get the price of a cryptocurrency or token.\n• Ex: '/price bitcoin'\n\n/info <cryptocurrency-id>\n- Get information and interesting facts about selected cryptocurrency if available.\n• Ex: '/info bitcoin'\n\n/setalert <cryptocurrency-id> <price>\n- Set a price alert for a cryptocurrency, acceptable to six(6) decimal place.\n• Ex: '/setalert bitcoin 120000'\n• Ex: '/setalert dogecoin 0.512312'\n\n/listalert\n- List all active alerts and id.\n• Ex: '/listalert'\n\n/removealert <alert-id>\n- Remove active alert with id.\n• Ex: '/removealert eq123Dr'`;
    await bot.sendMessage(msg.chat.id, message);
  } catch (error) {
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});

// Trending with filters
bot.onText(/\/trending(?: (\d+))?/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const qty = match[1] ? parseInt(match[1]) : 5; // how many

    if (typeof qty !== "number" || ![1, 3, 5, 10].includes(qty)) {
      return await bot.sendMessage(chatId, "Invalid filter parameter sent!");
    }

    const formatCurrency = (value) => {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    };

    const url = "https://api.coingecko.com/api/v3/search/trending";
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoToken,
      },
    };

    const response = await axios.request(url, options);
    const data = response.data;
    if (!response) {
      return await bot.sendMessage(msg.chat.id, "No item found!");
    }

    const message = `<b><u>Trending</u></b>\n\n${data.coins
      .slice(0, qty)
      .map((val, index) => {
        return `${index + 1}. - ID: <b>${val.item.id}</b>\n     - Coin Id: <b>${val.item.coin_id
          }</b>\n     - Name: <b>${val.item.name}</b>\n     - Ticker: <b>${val.item.symbol
          }</b>\n     - Market Cap: <b>${val.item.data.market_cap
          }</b>\n     - Market Cap Rank: <b>${val.item.market_cap_rank
          }</b>\n     - Total Volume: <b>${val.item.data.total_volume
          }</b>\n     - Price: <b>${formatCurrency(
            val.item.data.price
          )}</b>\n     - 24hrs Price Change: <b>${val.item.data.price_change_percentage_24h.usd.toFixed(
            3
          )}%</b>`;
      })
      .join("\n\n")}`;
    await bot.sendMessage(msg.chat.id, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});

// Find top 3 Crypto and NFT to match user find
bot.onText(/\/find (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const search = match[1]; // search item

    if (typeof search !== "string" || search.length < 1) {
      return await bot.sendMessage(chatId, "Invalid search value sent!");
    }

    const url = `https://api.coingecko.com/api/v3/search?query=${search}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoToken,
      },
    };

    const response = await axios.request(url, options);
    const data = response.data;

    const message = `<b><u>Top Matching Results</u></b>\n\n${data.coins
      .slice(0, 5)
      .map((val, index) => {
        return `${index + 1}. - id: ${val.id}\n     - name: ${val.name
          }\n     - ticker: ${val.symbol}\n     - market Cap Rank: ${val.market_cap_rank
          }`;
      })
      .join(
        "\n\n"
      )}\n\nYou only need the matching id for the coin/token, to use with other commands.\nEx: To get the price info for <b>${data.coins[0].name}(${data.coins[0].symbol
      })</b>, use the command: <b>'/price ${data.coins[0].id
      }</b>'\n\nFor a comprehensive list of all ids, check <a href="https://docs.google.com/spreadsheets/d/1wTTuxXt8n9q7C4NDXqQpI3wpKu1_5bGVmP9Xz0XGSyU">here</a>`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error(error);
    if(error.message.includes('404')) return await bot.sendMessage(msg.chat.id, "No Item found.");
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});

// Fetches provided valid, crypto price
bot.onText(/\/price (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const search = match[1]; // search item

    if (typeof search !== "string" || search.length < 1) {
      return await bot.sendMessage(chatId, "Invalid search value sent!");
    }

    const formatCurrency = (value) => {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    };

    const url = `https://api.coingecko.com/api/v3/coins/${search}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoToken,
      },
    };

    const response = await axios.request(url, options);
    const data = response.data;

    // console.log(data.market_data, data.market_data.price_change_percentage_1h_in_currency.usd)
    const message = `<b><u>Coin Data</u></b>\n1. Name: <b>${data.name
      }</b>\n2. Ticker: <b>${String(
        data.symbol
      ).toUpperCase()}</b>\n3. Price: <b>${formatCurrency(
        data.market_data.current_price.usd
      )}</b>\n4. Market cap rank: <b>${data.market_cap_rank
      }</b>\n5. ATH: <b>${formatCurrency(
        data.market_data.ath.usd
      )}</b>\n6. ATL Growth: <b>${formatCurrency(
        data.market_data.atl_change_percentage.usd
      ).slice(
        2
      )}%</b>\n7. Price Change:\n      |- 1hr: ${data.market_data.price_change_percentage_1h_in_currency.usd ? data.market_data.price_change_percentage_1h_in_currency.usd.toFixed(
        3
      )+'%' : 'N/A'}\n      |- 24hr: ${data.market_data.price_change_percentage_24h_in_currency.usd ? data.market_data.price_change_percentage_24h_in_currency.usd.toFixed(
        3
      )+'%' : 'N/A'}\n      |- 7D: ${data.market_data.price_change_percentage_7d_in_currency.usd ? data.market_data.price_change_percentage_7d_in_currency.usd.toFixed(
        3
      )+'%' : 'N/A'}\n      |- 30D: ${data.market_data.price_change_percentage_30d_in_currency.usd ? data.market_data.price_change_percentage_30d_in_currency.usd.toFixed(
        3
      )+'%' : 'N/A'}\n      |- 1Yr: ${data.market_data.price_change_percentage_1y_in_currency.usd ? data.market_data.price_change_percentage_1y_in_currency.usd.toFixed(
        3
      )+'%' : 'N/A'}`;
    await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    console.error(error);
    if(error.message.includes('404')) return await bot.sendMessage(msg.chat.id, "Coin not found. Use the /find command.");
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});

// Fetches provided valid, crypto price
bot.onText(/\/info (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const search = match[1]; // search item

    if (typeof search !== "string" || search.length < 1) {
      return await bot.sendMessage(chatId, "Invalid search value sent!");
    }

    const formatCurrency = (value) => {
      try {
        return value.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        });
      } catch (error) {
        return `-N/A`;
      }
    };

    function formatDate(dateString) {
      try {
        if (!dateString) return "N/A";
        const months = [
          "Jan.",
          "Feb.",
          "Mar.",
          "Apr.",
          "May",
          "Jun.",
          "Jul.",
          "Aug.",
          "Sep.",
          "Oct.",
          "Nov.",
          "Dec.",
        ];

        const date = new Date(dateString);
        const month = months[date.getMonth()];
        const day = date.getDate().toString().padStart(2, "0");
        const year = date.getFullYear();

        return `${month} ${day}, ${year}`;
      } catch (error) {
        return "N/A";
      }
    }

    const url = `https://api.coingecko.com/api/v3/coins/${search}`;
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoToken,
      },
    };

    const response = await axios.request(url, options);
    const data = response.data;

    const message = `<b><u>Coin Information</u></b>\n1. Name: <b>${data.name
      }</b>\n2. Ticker: <b>${String(
        data.symbol
      ).toUpperCase()}</b>\n3. Price: <b>${formatCurrency(
        data.market_data.current_price.usd
      )}</b>\n4. Market cap rank: <b>${data.market_cap_rank
      }</b>\n5. Website: <b>${data.links.homepage && data.links.homepage.length > 0
        ? `<a href="${data.links.homepage[0]}">${new URL(
          data.links.homepage[0]
        ).host.replace("www.", "")}</a>`
        : "N/A"
      }</b>\n6. White Paper: <b>${data.links.whitepaper
        ? `<a href="${data.links.whitepaper}">paper</a>`
        : "N/A"
      }</b>\n7. Genesis Date: <b>${formatDate(
        data.genesis_date
      )}</b>\n8. Max Supply: <b>${formatCurrency(
        data.market_data.max_supply
      ).slice(1)}</b>\n9. Circulating Supply: <b>${formatCurrency(
        data.market_data.circulating_supply
      ).slice(1)}${ data.links.repos_url.github.length > 0 || data.links.repos_url.bitbucket.length > 0 ? `</b>\n10. Dev Repo: <b>${data.links.repos_url.github.length > 0
        ? `\n       |- <a href="${data.links.repos_url.github[0]}">Github-repo</a>`
        : ""
      }` : ''}${data.links.repos_url.bitbucket.length > 0
        ? `\n       |- <a href="${data.links.repos_url.bitbucket[0]}">Bitbucket-repo</a>`
        : ""
      }</b>${data.links.twitter_screen_name || data.links.subreddit_url || data.links.telegram_channel_identifier ? `\n${data.links.repos_url.github.length > 0 || data.links.repos_url.bitbucket.length > 0 ? '11' : '10'}. Socials: <b>${data.links.twitter_screen_name
        ? `\n       |- <a href="https://x.com/${data.links.twitter_screen_name}">x.com/${data.links.twitter_screen_name}</a>`
        : ""
      }:` : ''}${data.links.subreddit_url
        ? `\n       |- <a href="${data.links.subreddit_url
        }">${data.links.subreddit_url.replace("https://www.", "")}</a>`
        : ""
      }${data.links.telegram_channel_identifier
        ? `\n       |- <a href="https://t.me/${data.links.telegram_channel_identifier}">Telegram channel</a>`
        : ""
      }</b>`;



    await bot.sendMessage(chatId, message, { parse_mode: "HTML", disable_web_page_preview: true })

    const historyMessage = data.description.en || "No historical information available.";
    return await bot.sendMessage(chatId, historyMessage, { parse_mode: "HTML", disable_web_page_preview: true })
  } catch (error) {
    console.error(error.message);
    if(error.message.includes('404')) return await bot.sendMessage(msg.chat.id, "Coin not found. Use the /find command.");
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});


// Sets alert for a valid crypto coin
bot.onText(/\/setalert (.+) (\d+(\.\d+)?)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const cryptoId = match[1];
    const price = parseFloat(match[2]);

    if (typeof cryptoId !== "string" || cryptoId.length < 1) {
      return await bot.sendMessage(chatId, "Invalid cryptocurrency-id sent");
    }

    if (isNaN(price) || price <= 0) {
      return await bot.sendMessage(chatId, "Invalid price value sent!");
    }

    if (price.toString().split(".")[1]?.length > 6) {
      return await bot.sendMessage(chatId, "Price value cannot have more than 6 decimal places!");
    }

    const isValidCoin = await isCoinValid(cryptoId);

    if (!isValidCoin) {
      return await bot.sendMessage(chatId, "Invalid cryptocurrency-id sent!\n\nTo get a valid cryptocurrency-id, you can use the '/find <cryptocurrency>' command.\n\nValid coin-id available is returned in the ID field.");
    }

    // Check if there is DB connection
    if (!dbUp) {
      const retryConnection = await cryptoTrendsDB.connect();
      if (!retryConnection) return await bot.sendMessage(chatId, "Data cannot be retrieved at this moment, please try again later!");
    }

    // Get pre-existing alerts
    const alerts = await cryptoTrendsDB.retrievAlertsLength(chatId);
    if (alerts >= 3) return await bot.sendMessage(chatId, "Your Alert list cannot exceed three(3) items.\nYou can remove older alerts.");

    const alertCode = generateAlertCode();

    if (alerts === 0) {
      // Insert new alert to DB
      await cryptoTrendsDB.insertAlert({
        chatId: msg.chat.id,
        coinId: cryptoId,
        targetPrice: price,
        alertCode,
        targetReached: false
      })
    } else {
      await cryptoTrendsDB.updateAlertList(true, {
        chatId: msg.chat.id,
        coinId: cryptoId,
        targetPrice: price,
        alertCode,
        targetReached: false
      })
    }

    const formatCurrency = (value) => {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    };

    await bot.sendMessage(chatId, `<b><u>Alert</u></b>\nAlert set for <b>'${cryptoId}'</b> at price <b>${formatCurrency(price)}</b>.\n\nAlert ID: <b>${alertCode}</b>\n\nUnset alert(s) left: <b>${3 - (1 + alerts)}</b>\n\n<b><u>Info</u></b>\n\nYou are advised to set a different notification sound for this chat. This would help easily identify alert notification. You can watch this <b><a href="https://youtube.com/shorts/nqXO5MGH2Y8">video</a></b> to learn how.\n\nAlert notifications are delivered with three rapid consecutive messages and notifications.\n\nPlease take note!`, { parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(msg.chat.id, "An error occurred, please try again.");
  }
});


// Get list of alerts
bot.onText(/\/listalert/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    if (!dbUp) {
      await cryptoTrendsDB.connect();
    }

    const alertList = await cryptoTrendsDB.retrieveAlerts(msg.chat.id);
    if (!alertList || alertList.length<1) return await bot.sendMessage(chatId, "There are no alert items available.");

    const formatCurrency = (value) => {
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    };

    const message = `<b><u>Alert(s)</u></b>\n\n${alertList.map((alert, index) => { return `${index + 1}. Alert ID: <b>${alert.alertCode}</b>\n    Crypto ID: <b>${alert.coinId}</b>\n    Target price: <b>${formatCurrency(alert.targetPrice)}</b>\n    Target reached: <b>${alert.targetReached ? 'Yes' : 'No'}</b>${alert.triggerDate ? `\n    Date observed (UTC): <b>${formatEpochToDate(alert.triggerDate)}</b>` : ''}` }).join('\n\n')}`;
    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(msg.chat.id, "An error occured, please try again.");
  }
});


// Remove alert
bot.onText(/\/removealert (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const alertCode = match[1].toUpperCase(); // search item

    if (typeof alertCode !== "string" || alertCode.length < 1) {
      return await bot.sendMessage(chatId, "Invalid alert code sent!");
    }

    const response = await cryptoTrendsDB.updateAlertList(false, { chatId, alertCode });
    if (response.modifiedCount === 0) return await bot.sendMessage(chatId, 'No Alerts with the provided ID was found.\n\nYou can use the /listalert command and try again.');

    // Get pre-existing alerts
    const alerts = await cryptoTrendsDB.retrievAlertsLength(chatId);
    return await bot.sendMessage(chatId, `Alert with ID: ${alertCode}, has been removed.\n\nUnset alert(s) left: ${3 - alerts}`);
  } catch (error) {
    console.error(error);
    await bot.sendMessage(msg.chat.id, "An error occurred, please try again.");
  }
})


// Utility
async function isCoinValid(coin) {
  const url = `https://api.coingecko.com/api/v3/coins/${coin}`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": coinGeckoToken,
    },
  };

  const response = await axios.request(url, options);
  const data = response.data;

  if (data.error) {
    return false;
  }

  return true;
}

function generateAlertCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function checkPrices() {
  try {
    const activeSearch = await cryptoTrendsDB.retrieveActivealerts();
    if (!activeSearch) return console.log('Nothing to search.');

    activeSearch.forEach(async (cid) => {
      const price = await fetchPrice(cid);
      const alertTriggered = await cryptoTrendsDB.findAndUpdateAlerts(cid, price);

      if (alertTriggered.length > 0) {
        alertTriggered.forEach(async (item) => {
          await sendAlertMessage(item.id, cid, item.targetPrice, price);
        })
      }

    })
  } catch (error) {
    console.error('An error occured!', error.message);
    throw error;
  }
}


async function fetchPrice(id) {
  try {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": coinGeckoToken,
      },
    };

    const url = `https://api.coingecko.com/api/v3/coins/${id}`;
    const response = await axios.request(url, options);
    const data = response.data;

    if (data.error) {
      throw new Error(data.error.message)
    }

    return data.market_data.current_price.usd;
  } catch (error) {
    throw error;
  }
}


async function sendAlertMessage(chatId, coinId, triggerPrice, currentPrice) {

  const formatCurrency = (value) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  await bot.sendMessage(chatId, `${coinId} Alert Trigger Notification`);
  await bot.sendMessage(chatId, `${coinId} Alert Trigger Notification`);
  await bot.sendMessage(chatId, `<b><u>Alert Notification</u></b>\n\nOne of your set alert Just got triggered within the '0.1%' up|down threshold.\n\n<b>Details</b>\n- Crypto ID: <b>${coinId}</b>\n- Alert price: <b>${formatCurrency(triggerPrice)}</b>\n- Current price: <b>${formatCurrency(currentPrice)}</b>\n\nThis alert has been triggered, and would stop getting monitored. You can remove it with the '/removealert &lt;crypto-id&gt;' command and then set another.`, { parse_mode: 'HTML' });

}

function formatEpochToDate(epochSeconds) {
  const date = new Date(epochSeconds * 1000);
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'UTC' };
  return date.toLocaleString('en-US', options);
}



// Price Checker Cron
cron.schedule("*/10 * * * *", async () => {
  if (dbUp) {
    await checkPrices();
  }
});

module.exports = bot;