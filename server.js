require("dotenv").config();
const express = require("express");
const app = express();
const fetch = require("node-fetch");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const SlackBot = require("slackbots");
global.Headers = fetch.Headers;
let globalEventText = "";
require('heroku-self-ping').default(process.env.URL);

//invoke some dates for handling/parsing later
let responseStr;
var d = new Date();
var n = d.getDay();
let daysOfTheWeek = "s m t w t f s".split(" ");
let week = `${d.getDate() <= 9 ? "0" + d.getDate() : d.getDate()}/${
  d.getMonth() + 1 <= 9 ? "0" + (d.getMonth() + 1) : d.getMonth() + 1
}/${d.getFullYear()}`;

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

  //verify that were not responding to multiple requests
  if (globalEventText === `${userId} ${userText}`) {
    return;
  } else {
    //just to call our async function
    sheets();
  }
  //set globalVar to verify that there is no repeat responses
  globalEventText = `${userId} ${userText}`;
});

//-----------------------------------------------
//every monday well prompt our bot to set a new week header
if (daysOfTheWeek[n] === "m") {
  accessSpreadsheet(true, false, false, null);
}

//return structured output from our function at any time,
//[message, errcode]
function flagReturn(message, code) {
  responseStr = [message, code];
}

//--------------------------------------------------
//filter user input
function filterString(string) {
  //reset response every time
  //define negative/positive words at the start,
  //well split the string in to spans from start of one to start of next
  //any dates found in between pos and neg will be returned as dates to add
  //any dates found between neg to pos will be ignored, and once implementation
  //for change/delete fucntionality is added, deleted if necessary
  responseStr = null;
  (positiveDictionary = [
    "ill",
    "i'll",
    "will",
    "can",
    "only",
    "ok",
    "for me",
    "yes",
  ]),
    (negativeDictionary = " wont dont don't won't not cant can't no".split(
      " "
    )),
    (retArr = []),
    (days = []),
    (cancel = false);
  //parse through response
  //check for utility call

  if (string[0] == "-" || string[1] == "-") {
    //admin help
    if (string.indexOf("-admin-help") !== -1) {
      flagReturn(
        `Greetings overlord dude:\n
Admin control of RollCall Bot:
RCB connects to google sheets and updates a roll call total for the week.
Week headers should be generated automatically, and a Roll Call Post should go out on 
Monday.
Probably best not to go manually editing google doc...

    RCB calls: 
Re-send a Roll Call, send "@rcb -admin-src (Send Roll Call)
Add a new header with the most recent monday, send "@rcb -admin-ahr" (Add Header Row)
Send the google doc link, send "@rcb -admin-doc" 
Test add user functionality, send "@rcb -admin-tua
    `,
        503
      );
      return;
    }
    //user help
    if (string.indexOf("-help") !== -1) {
      //if so, well call our return message, and end function
      flagReturn(
        `Hi there, I'm roll call bot. 
I'm doing the best that I can, so thanks for helping me out. Im looking for a response that looks something like:
"Ill be there tues "  
"Inly saturday for me thanks"  
"Iaturday for me this week"  
"I can do tomorrow and saturday"  
"I will be online tues wed"  
"I will come sat"  
"I can make it tues wed not saturday"  
"I'm ok for tues" 
"I wont be there wednesday, only saturday" `,
        503
      );
      return;
    }
    //admin send roll call message
    if (string.indexOf("-admin-src") !== -1) {
      console.log("Send Roll Call");
      flagReturn(
        "Hi team, please respond with what dates you will be attending",
        503
      );
      return;
    }
    //admin add header row
    if (string.indexOf("-admin-ahr") !== -1) {
      console.log("Add Header Row");
      accessSpreadsheet(true, false, false, null);
      flagReturn("New Week Started", 503);
      return;
    }
    //admin receive sheets link
    if (string.indexOf("-admin-doc") !== -1) {
      console.log("Send Google Doc link");
      flagReturn(
        "https://docs.google.com/spreadsheets/d/1MH1nNDmjD5M-8473Y6T5ieNFLMWS_nPfzz0vnOW2Emg/edit#gid=0",
        503
      );
      return;
    }
    if (string.indexOf("-admin-tua") !== -1) {
      let filtered = string.split(" ").filter((word) => word !== "-admin-tua");
      let testName = `${filtered[0]} ${filtered[1]}`;
      filtered.splice(0, 2);
      accessSpreadsheet(false, true, true, [testName, filtered]);
      flagReturn("User Added", 503);
      return;
    } else {
      flagReturn(
        `Looks like you started your string with a dash. I can't see your message properly when you
do that would you try again without it? `,
        503
      );
      return;
    }
  }
  //

  //else well go on to search word by word
  //spread string
  string = string.toLowerCase().split(" ");

  //master filter input
  string.filter((word) => {
    //if string includes tomorrow, well look at our global dates and see
    //if there is a calss tomorrow
    if (word === "tomorrow") {
      "t w s".split(" ").includes(daysOfTheWeek[n + 1])
        ? retArr.push(daysOfTheWeek[n + 1])
        : (cancel = flagReturn(
            "No class tomorrow, double check your dates",
            503
          )); //handle error
    }
    //next we break down the phrase. Stip out everything that will
    //not parse down into Positive, Negative, T, W, S -->
    //demo output phrase [positive, t, w, negative, s]

    //if positive word is found
    positiveDictionary.includes(word) ? retArr.push("positive") : null;
    //if negative word is found
    negativeDictionary.includes(word) ? retArr.push("negative") : null;

    //day searching with typo dictionary
    "tues tue tuesday tuseday".split(" ").includes(word)
      ? retArr.push("t")
      : null;
    "wed weds wednesday wendesday".split(" ").includes(word)
      ? retArr.push("w")
      : null;
    "sat saturday".split(" ").includes(word) ? retArr.push("s") : null;
  });

  //cancel should be legacy/outdated
  //if there is no class tomorrow, well prompt a cancel and return a 503
  if (cancel !== false) {
    return flagReturn(cancel);
  }
  //if no dates are in string, prompt user
  if (
    retArr.includes("t") === false &&
    retArr.includes("w") === false &&
    retArr.includes("s") === false
  ) {
    flagReturn(
      'Couldnt spot any days in your string.... maybe a typo? Try a new response, eg: "I\'ll be coming tues wed but not sat"',
      503
    );
    return;
  }

  //if no negatives, all days listed will be attended
  retArr.includes("negative") === false
    ? (days = retArr.filter((word) => word !== "positive"))
    : null;

  //if there is a negative....
  if (retArr.includes("negative")) {
    let pos = retArr.indexOf("positive"),
      neg = retArr.indexOf("negative");
    //end var is either end of array, or next index of "negative"
    let end = pos > neg ? retArr.length : neg;
    //return slice between positive and negative
    days = retArr.slice(pos, end).filter((word) => word !== "positive");
  }

  //return array of days format : [T, W, S]
  flagReturn(
    (ret = days.map((val) => {
      return val.toUpperCase();
    })),
    200
  );
}

//access spreadsheet, ill be calling the sub functions from a global scope
//may consider bringing those to a global scope once deployed,
//wait for persistence of hosting platform

async function accessSpreadsheet(
  callStartWeek,
  callAddRows,
  callUpdateWeekTotal,
  argument
) {
  //access google doc
  const doc = new GoogleSpreadsheet(
    "1MH1nNDmjD5M-8473Y6T5ieNFLMWS_nPfzz0vnOW2Emg"
  );

  await doc.useServiceAccountAuth(require("./client_secret.json"));
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  //on timer, once a week call this function to add new header with
  //empty week totals
  async function startWeek() {
    //just check through all the rows with weeks in em
    let rows = await sheet.getRows();
    let headerExists = rows.map((rows) => {
      return rows["Week"];
    });

    //if weve already got one today, return
    if (headerExists.includes(week)) return;
    //else add new header
    const addHeader = await sheet.addRow({
      Week: week,
      T: "0",
      W: "0",
      S: "0",
      Tuesday: "0",
      Wednesday: "0",
      Saturday: "0",
    });
  }
  callStartWeek === true ? startWeek() : null;

  //call this to add a new student
  //expects input ("Full Name", ["T", "W", "S"])
  async function addRows(name, daysattending) {
    let containerRows = await sheet.getRows(),
      rowIndexCounter = [];
    //parse through table to find indexes of weekHeaders
    for (let i = 0; i < containerRows.length; i++) {
      if (containerRows[i]["Week"] !== undefined) {
        rowIndexCounter.push(i);
      }
    }
    //split off index of most recent one
    let headerRow = rowIndexCounter.pop(),
      range = headerRow,
      alreadyFound = false;
    //iterate through the next 10 cells(hardcoded value) to sdee if name appears
    while (range < headerRow + 10) {
      //if cell is not empty and name is already listed, alreadyFound
      if (
        containerRows[range] !== undefined &&
        containerRows[range]["Student Name"] === name
      ) {
        alreadyFound = true;
        await containerRows[range].save();
        return;
      }
      //else check next
      range++;
    }
    //if we threw an err, we wont add
    if (alreadyFound === true) {
      return;
    }
    //else add new row
    const newRow = await sheet.addRow({
      "Student Name": name,
      "Days Attending": daysattending.join(", "),
    });
  }
  callAddRows === true ? addRows(argument[0], argument[1]) : null;

  //call to update week total in master counter
  //expects input("Full Name", ["T", "W", "S"])
  async function updateWeekTotal(name, attendingArr) {
    let row = await sheet.getRows();
    //get the most recent header row
    let headerRow = row
      .filter((row) => {
        return typeof row["Week"] === "string" ? row : null;
      })
      .pop();
    //if we get this error, we should double check our header timer
    if (headerRow === undefined) {
      returnError(
        "Looks like we need to double check theres a header for this week"
      );
      return;
    }

    //parse name into initials
    name = name
      .split(" ")
      .map((word) => {
        return word.slice(0, 1).toUpperCase();
      })
      .join("");

    //Tuesday Wednesday Saturday, T W S
    //here we'll map through the dates attending.
    attendingArr.map((letter) => {
      //hanlde T
      if (letter === "T") {
        if (headerRow["Tuesday"].indexOf(name) !== -1) {
          return;
        }
        headerRow["Tuesday"] =
          headerRow["Tuesday"].length < 2
            ? name
            : `${headerRow["Tuesday"]}, ${name}`;

        headerRow[letter] =
          headerRow[letter].length < 1 ? 1 : parseInt(headerRow[letter]) + 1;
      }
      //hanlde W
      if (letter === "W") {
        if (headerRow["Wednesday"].indexOf(name) !== -1) {
          return;
        }
        headerRow["Wednesday"] =
          headerRow["Wednesday"].length < 2
            ? name
            : `${headerRow["Wednesday"]}, ${name}`;

        headerRow[letter] =
          headerRow[letter].length < 1 ? 1 : parseInt(headerRow[letter]) + 1;
      }
      //hanlde S
      if (letter === "S") {
        if (headerRow["Saturday"].indexOf(name) !== -1) {
          return;
        }
        headerRow["Saturday"] =
          headerRow["Saturday"].length < 2
            ? name
            : `${headerRow["Saturday"]}, ${name}`;

        headerRow[letter] =
          headerRow[letter].length < 1 ? 1 : parseInt(headerRow[letter]) + 1;
      }
    });
    await headerRow.save();
  }
  callUpdateWeekTotal === true
    ? updateWeekTotal(argument[0], argument[1])
    : null;
}
//external calls accessSpreadsheet(
//  startWeek,
//  addRows,
//  updateWeekTotal,
//  argument
//)
//on timer call:  accessSpreadsheet(true, false, false, null)
//to add student row call : accessSpreadsheet(false, true, false, ["Vincent Greene",["T", "W"]])
//to update total Attending block : accessSpreadsheet(false, false, true [Vincent Greene,["T", "W"]])
//to update week total counter

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
