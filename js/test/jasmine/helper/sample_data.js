define(function() {
  var data = {};

  data.products = [
    {"code":"ONLINE_SAVINGS","name":"Online Savings","accountName":"Online Savings Account","terms":[],
      "marketingFeatures":["High Interest","No Fees","$500 Minimum Deposit","FDIC Insured"],
      "defaultAPY":1.08,"defaultAPR":1.05,"minimumFundingAmount":500},
    {"code":"CD_CODE","name":"CD","accountName":"CD Account",
      "terms":[{"description":"3 Months","length":3,"apy":1.25,"apr":1.23,"apyDescription":"for a 3 Month Term",
        "minimumFundingAmount":100},
        {"description":"12 Months","length":12,"apy":1.35,"apr":1.33,"apyDescription":"for a 12 Month Term",
          "minimumFundingAmount":200}],
      "marketingFeatures":["Great Rates, Guaranteed Returns",
        "Terms that fit your Lifestyle","Interest when you Need it","FDIC Insured"],
      "defaultAPY":-1.0,"defaultAPR":-1.0,"minimumFundingAmount":0}];

  data.owner = {
    "nameFirst": "Bob",
    "nameMI": "R",
    "nameLast": "Smith",
    "dob": "07/18/1974",
    "ssn": "123-45-6789",
    "occupation": "15-1131",
    "phoneNumber": "646-555-1234",
    "phoneType": "Mobile",
    "phoneMobileType": "Android",
    "email": "bob@hotmail.com",
    homeAddress: {
      "line1": "99 w etruria st",
      "line2": "apt q",
      "city": "seattle",
      "state": "WA",
      "zip": "98199"
    },
    "addressOlderThan2Years": true,
    "sharedHomeAndMailingAddresses": false,
    "mailingAddress": {
      "line1": "36 W 20th St",
      "line2": "Top Floor",
      "city": "New York",
      "state": "NY",
      "zip": "10011"
    },
    "pin": "4443"
  };

  return data;
});