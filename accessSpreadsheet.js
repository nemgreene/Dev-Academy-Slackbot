const { GoogleSpreadsheet } = require("google-spreadsheet");
var d = new Date();
var n = d.getDay();

let week = `${d.getDate() <= 9 ? "0" + d.getDate() : d.getDate()}/${
  d.getMonth() + 1 <= 9 ? "0" + (d.getMonth() + 1) : d.getMonth() + 1
}/${d.getFullYear()}`;

module.exports = {
  //access spreadsheet, ill be calling the sub functions from a global scope
  //may consider bringing those to a global scope once deployed,
  //wait for persistence of hosting platform

  accessSpreadsheet: async function accessSpreadsheet(
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
    //------------------------------------------------------------------
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
    //------------------------------------------------------------------
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
      const larryRow = await sheet.addRow({
        "Student Name": name,
        "Days Attending": daysattending.join(","),
      });
    }
    callAddRows === true ? addRows(argument[0], argument[1]) : null;

    //call to update week total in master counter
    //expects input("Full Name", ["T", "W", "S"])
    //------------------------------------------------------------------
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
  },
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
};
