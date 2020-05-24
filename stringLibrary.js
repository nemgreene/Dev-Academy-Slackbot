let positiveDictionary = [
    "ill",
    "i'll",
    "will",
    "can",
    "only",
    "ok",
    "for me",
    "yes",
  ],
  negativeDictionary = " wont dont don't won't not cant can't no".split(" "),
  adminHelp = `Greetings overlord dude:
Admin control of RollCall Bot:
RCB connects to google sheets and updates a roll call total for the week.
Week headers should be generated automatically, and a Roll Call Post should go out on 
Monday.

Probably best not to go manually editing google doc...
  
        RCB calls: 
Add a new header row:         send "@rcb -admin-ahr" (Add Header Row)
Send the google doc link:     send "@rcb -admin-doc" 
Test add user functionality:  send "@rcb -admin-tua (Test User Add)
Re-send a roll call:                  send "@rcb -admin-src (Send Roll Call)
      `,
  Help = `Hi there, I'm roll call bot. 
I'm doing the best that I can, so thanks for helping me out. Im looking for a response that looks something like:
      "Ill be there tues "  
      "Only saturday for me thanks"  
      "Saturday for me this week"  
      "I can do tomorrow and saturday"  
      "I will be online tues wed"  
      "I will come sat"  
      "I can make it tues wed not saturday"  
      "I'm ok for tues" 
      "I won't be there wednesday, only saturday" `,
  sendRollCall =
    "Hi team, please respond with what dates you will be attending",
  doc =
    "https://docs.google.com/spreadsheets/d/1MH1nNDmjD5M-8473Y6T5ieNFLMWS_nPfzz0vnOW2Emg/edit#gid=0",
  dashError = `Looks like you started your string with a dash. I can't see your message properly when you
    do that would you try again without it? `,
  dateless =
    'Couldnt spot any days in your string.... maybe a typo? Try a new response, eg: "I\'ll be coming tues wed but not sat"';

module.exports = {
  ipositiveDictionary: positiveDictionary,
  inegativeDictionary: negativeDictionary,
  iadminHelp: adminHelp,
  iHelp: Help,
  isendRollCall: sendRollCall,
  iDoc: doc,
  iDashError: dashError,
  iDateless: dateless,
};
