const {
  ipositiveDictionary,
  inegativeDictionary,
  iadminHelp,
  iHelp,
  isendRollCall,
  iDoc,
  iDashError,
  iDateless,
} = require("./stringLibrary");
const { accessSpreadsheet } = require("./accessSpreadsheet");
let responseStr = "";

//return structured output from our function at any time,
//[message, errcode]
function flagReturn(message, code) {
  responseStr = [message, code];
  module.exports = { iResponseString: responseStr };
}

//if string starts with "-", well pull over into this track
//and parse commands
//admin help
function handleCommand(string) {
  if (string.indexOf("-admin-help") !== -1) {
    flagReturn(iadminHelp, 503);
    return;
  }
  //user help
  if (string.indexOf("-help") !== -1) {
    //if so, well call our return message, and end function
    flagReturn(iHelp, 503);
    return;
  }
  //admin send roll call message
  if (string.indexOf("-admin-src") !== -1) {
    flagReturn(isendRollCall, 503);
    return;
  }
  //admin add header row
  if (string.indexOf("-admin-ahr") !== -1) {
    accessSpreadsheet(true, false, false, null);
    flagReturn("New Week Started", 503);
    return;
  }
  //admin receive sheets link
  if (string.indexOf("-admin-doc") !== -1) {
    flagReturn(iDoc, 503);
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
    flagReturn(iDashError, 503);
    return;
  }
}

module.exports = {
  //--------------------------------------------------
  //filter user input

  filterString: function filterString(string) {
    //define negative/positive words at the start,
    //well split the string in to spans from start of one to start of next
    //any dates found in between pos and neg will be returned as dates to add
    //any dates found between neg to pos will be ignored, and once implementation
    //reset response every time
    let positiveDictionary = ipositiveDictionary,
      negativeDictionary = inegativeDictionary,
      retArr = [],
      days = [],
      cancel = false;
    responseStr = null;
    //parse through response
    //check for utility call

    if (string[0] == "-" || string[1] == "-") {
      handleCommand(string);
      return;
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
      flagReturn(iDateless, 503);
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
  },
};
