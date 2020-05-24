require("dotenv").config();
require("heroku-self-ping").default(process.env.URL);
const express = require("express");
const app = express();
const fetch = require("node-fetch");
const SlackBot = require("slackbots");
global.Headers = fetch.Headers;
//libary import
const { accessSpreadsheet } = require("./accessSpreadsheet");
let { filterString } = require("./filterString");

//external dictionary for a numbver of responses/long strings

let responseStr = "";
//invoke some dates for handling/parsing later
var d = new Date();
var n = d.getDay();
let daysOfTheWeek = "s m t w t f s".split(" ");
let globalEventText = "";

app.use(express.json());

//slackbot init, well only neeed this bot to grab user info later
var bot = new SlackBot({
  token: process.env.BOT_TOKEN,
  name: "RollCall-Bot",
});

//anytime anyone @s our app, slack will post to this address
app.post("/rcb", (req, res) => {
  //setting up new event listener for slack?
  if (req.body.type === "url_verification") {
    res.json(req.body.challenge);
    return;
  }
  //else
  //ignore @rcb in text
  let userText = req.body.event.text
    .split(" ")
    .filter((word) => word !== "<@U013RDVLFEV>")
    .join(" ");

  //grab event id to make sure it is unique, prevent duplicate
  let userId = req.body.event.user;

  //verify that were not responding to multiple requests
  if (globalEventText === `${userId} ${userText}`) {
    return;
  } else {
    //just to call our async function
    sheets();
  }
  //magic happens
  async function sheets() {
    //grab username from out bot

    user = await bot.getUserById(req.body.event.user);
    user = user.profile.real_name_normalized;

    //call the function that will actually parse our string, expecting no data returned
    //responseStr will be returned(["mesg", "res code"])
    filteredOutput = await filterString(userText);
    //once admin auth is enabled, well filter access with codes
    //no 503 err returned from filterString()?
    let { iResponseString } = require("./filterString");
    responseStr = iResponseString;

    if (responseStr[1] === 200) {
      //run success code
      accessSpreadsheet(false, true, true, [user, responseStr[0]]);
      responseStr = "Sucess, adding to sheets" + responseStr[0] + " " + user;
      //else if any error code threw
    } else {
      //return with err log from filterString()
      responseStr = responseStr[0];
    }

    //if all has gone well, we can return with a post request to our slack channel
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({ text: `${responseStr}` });
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    //off she goes
    fetch(process.env.WEBHOOK, requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.log("error", error));
    res.sendStatus(200);
  }
  //set globalVar to verify that there is no repeat responses
  globalEventText = `${userId} ${userText}`;
});

function flagReturn(message, code) {
  responseStr = [message, code];
}

//-----------------------------------------------
//every monday well prompt our bot to set a new week header
if (daysOfTheWeek[n] === "m") {
  accessSpreadsheet(true, false, false, null);
}

//Handle errors
app.use(function (err, req, res, next) {
  console.log("arrived at catchallerror ");
  res.status(err.status || 500);
  res.json({ error: "catchall error" });
});

//Server static assets if in production

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV === "production") {
  //Set static folder
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log("Server started on : ", PORT);
});
