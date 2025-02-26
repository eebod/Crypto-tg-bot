const express = require('express');
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

// Health check
app.get(`/`, (req,res) => {
  res.status(200).json({ msg: "Bot Api is up and botting!"});
})

app.listen(PORT, () => {
  console.log(`[${process.env.NODE_ENV || "DEV"}] - Web server running on port: ${PORT}`);
});

module.exports = function (bot, token) {
  app.post(`/${token}`, (req,res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  })
};