var Airtable = require('airtable');
var passengersBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_PASSENGERS_ID);

var attractionsBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_ATTRACTIONS_ID);

var ammnetiesBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_AMMNETIES_ID);

var facilitiesBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_FACILITIES_ID);

var express = require('express');
var expressApp = express();

var bodyParser = require('body-parser');
expressApp.use(bodyParser.json()); // support json encoded bodies

const {
  dialogflow,
  BasicCard,
  BrowseCarousel,
  BrowseCarouselItem,
  Button,
  Carousel,
  Image,
  LinkOutSuggestion,
  List,
  MediaObject,
  Suggestions,
  SimpleResponse,
  Table,
 } = require('actions-on-google');

// User Data Object Definition
var userData = {
  "name" : 'Landon',
  "flightArrival" : '05:30',
  "flightDepart" : '09:25',
  "terminal" : 'T2',
  "type" : 'Arrival',
  "from" : 'London',
  "to" : 'Singapore',
  "baggageBelt" : '36',
  "delay": '0',
  "membership" : 'Krisflyer Elite Gold',
  "loaded": true
}

// Service Suggestions
const SerivcesSuggestions = [
  'Free Rest Areas',
  'Pharmacy',
  'Clinics',
  'Charging Points',
  'Smoking Rooms',
  'Free Rest Areas',
  'Back'
]

// Baggage Suggestions
const baggageSuggestions = [
  'Pickup Baggage',
  'Drop Baggage',
  'Porter Services',
  'Baggage Storage',
  'Back'
]

// Intent Suggestions
const intentSuggestions = [
  'Baggage',
  'Food',
  'Facilities',
  'Shopping',
  'Attraction',
  'Immigration',
  'Bye'
];

// Resolve Location (user given or already present in user data)
const resolveLocation = function(location) {
  if(location == '') {
    return userData.terminal
  } else {
    return location 
  }
}

// Create an app instance
const app = dialogflow()

// goBack Intent
app.intent('goBack', conv => {
  console.log('back')
  conv.ask(new SimpleResponse({text: 'Sure' , speech: 'Sure'}))
  conv.ask(new Suggestions(intentSuggestions));
})

//Close Conversation Intent
app.intent('bye', conv => {
  conv.close('Bye');
})

// Assigns New User Data
var getNewUser = function(userDataObject) {
  var index = (Math.random() * (58 - 0 + 1) ) << 0
  userDataObject = userDataObject[index]._rawJson
  userData.name = userDataObject.fields['Name']
  userData.flightDepart = userDataObject.fields['Flight departure time']
  userData.flightArrival = userDataObject.fields['Flight arrival time']
  userData.terminal = userDataObject.fields['Terminal']
  userData.type = userDataObject.fields['Type']
  userData.from = userDataObject.fields['From']
  userData.to = userDataObject.fields['To']
  userData.baggageBelt = userDataObject.fields['Baggage Belt']
  userData.delay = userDataObject.fields['Delay']
  userData.membership = userDataObject.fields['Membership']
  userData.loaded = true
}
// Get Passengers Info
const getPassengersInfo = async () => {
    try {
        return await passengersBase('Passengers Info').select({
          maxRecords : 100,
          view: 'Grid view'
          
          }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Get Tips Info
const getTipsInfo = async (type) => {
    try {
        return await ammnetiesBase('Tips').select({
          maxRecords: 100,
          view: "Grid view",
          filterByFormula: "{Type} ='"+type+"'"
        }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Default Welcome Intent
app.intent('Default Welcome Intent', async (conv) => {
  var myResponse = await getPassengersInfo()
  if(userData.loaded == false) {
    getNewUser(myResponse)    
  }
  var flightTiming, subtitleText
  console.log(userData.type)
  if(userData['type']== 'Departure') {
    flightTiming = userData.flightDepart
    subtitleText = '✈️ Flight Info'+' - '+flightTiming+' '+userData.terminal+' at Gate 22  \n'
  } else if(userData['type'] == 'Arrival') {
    flightTiming = userData.flightArrival
    subtitleText = '✈️ Flight Info'+' - '+flightTiming+' '+userData.terminal+' at Gate 13  \n'
  } else if (userData['type'] == 'Transit') {
    flightTiming = userData.flightDepart
    subtitleText = '✈️ ' + userData['type']+' - '+flightTiming+' '+userData.terminal+' at Gate 33  \n'
  }
  if(userData.type == 'Departure' || userData.type == 'Transit') {
    if(userData.delay == '0'){
      subtitleText += '✅ Your flight is ON time'
    } else {
      subtitleText += '😰 Your flight is delayed by '+userData.delay+' minutes' 
    }
  }
  
  //Get Tips
  var tipsResponse = await getTipsInfo(userData.type)
  var tipsArray = []
  var initialTipsString = '💡 Here are a few useful tips'
  //initialTipsString = initialTipsString.bold()
  for (var i=0; i<tipsResponse.length; ++i) {
    tipsArray.push(
      tipsResponse[i].fields['Tip'],
    );
  }
  if(userData['type'] == 'Transit') {
    initialTipsString += ' during your Transit  \n'
  } else {
    initialTipsString += ' before ' + userData.type + ' -  \n'
  }
  var tipsString = initialTipsString
  
  for(var i=0;i<tipsArray.length;++i){
    tipsString += tipsArray[i]+'  \n'
  }
  
  if(userData.membership == 'No'){
    tipsString += '🤓 Be sure to checkout the free rest areas '+'  \n'
  } else if(userData.membership == 'Business class'){
    tipsString += '😎 As a '+userData.membership+'flyer, you have access to SilverKris First Class Lounge   \n'
  } else {
    tipsString += '😎 As a member of '+userData.membership+', you have access to SilverKris First Class Lounge   \n'
  }
  tipsString += '☎️ Make free local calls from phone booths'+'  \n'
  tipsString += '🚰 Remember to stay hydrated during your flight to '+userData.to+'  \n'
  
  conv.ask(new SimpleResponse({text: 'Hi '+userData.name+'! Here\'s a summary of your flight', 
                               speech: 'Hi '+userData.name+'! Here\'s a summary of your flight'}))
  conv.ask(new BasicCard({
    text:tipsString ,
    subtitle: subtitleText,
    title: userData.from+' ➡️ '+userData.to,
    display: 'CROPPED',
  }));
  
  conv.ask(new Suggestions(intentSuggestions));
});

//Get Attractions Info
const getAttractionsInfo = async (location) => {
    try {
        return await attractionsBase('Table1').select({
          maxRecords: 7,
          view: "Grid view",
          filterByFormula: "{Location} ='"+location+"'"
        }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Attractions Intent
app.intent('Attractions', async (conv, params) => {
  var location = resolveLocation(params.TerminalLocation)
  var myResponse = await getAttractionsInfo(location)
  var attractionsArray = []
  for (var i=0; i<myResponse.length; ++i) {
    attractionsArray.push({
      name: myResponse[i]._rawJson.fields["Name"],
      location : myResponse[i]._rawJson.fields["Location"],
      time : myResponse[i]._rawJson.fields["Time"],
      address : myResponse[i]._rawJson.fields["Address"],
      timing : myResponse[i]._rawJson.fields["Timings"],
      accessibleTo: myResponse[i]._rawJson.fields["AccessibleTo"],
      imageURL: myResponse[i]._rawJson.fields["Image"]
    });
  }
  
  var carouselItems = {
    items: {}
  }
  
  for(i=0; i<attractionsArray.length; ++i) {
    carouselItems.items[attractionsArray[i].name] = {
      title: attractionsArray[i].name,
      description: attractionsArray[i].address,
      image: new Image({
        url: attractionsArray[i].imageURL,
        alt: 'Attraction Image',
      }),
      
    }
  }
      
  var carouselObject = new Carousel(carouselItems);   
  
  conv.ask(new SimpleResponse({text: 'Here are a few popular attractions near '+location, speech: 'Here are a few popular attractions near '+location}))
  conv.ask(carouselObject)
  conv.ask(new Suggestions(intentSuggestions));
})

// Get Shops Info
const getShopsInfo = async (category, location) => {
    try {
        return await ammnetiesBase('Shopping').select({
          maxRecords: 7,
          view: "Grid view",
          filterByFormula: "AND(({Category} ='"+category+"')"+", ({Location} ='"+location+"'))"
        }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Shopping Intent
app.intent('Shopping', async (conv, params) => {
  var location = resolveLocation(params.TerminalLocation)
  console.log(params)
  var category = params.Category
  console.log('category: '+category)
  if (category=='alcohol') {
    category = 'Duty Free Alcohol'
  } else if (category=='footwear') {
    category = 'Footwear'
  }
  else {
    category = 'Shopping'
  }
  console.log(category)
  console.log(location)
  var myResponse = await getShopsInfo(category, location)
  var shopsArray = []
  for (var i=0; i<myResponse.length; ++i) {
    shopsArray.push({
      name: myResponse[i]._rawJson.fields["Name"],
      category : myResponse[i]._rawJson.fields["Category"],
      location: myResponse[i]._rawJson.fields["Location"],
      imageURL: myResponse[i]._rawJson.fields["Image"]
    });
  }
  
  console.log(shopsArray)
  
  var carouselItems = {
    items: {}
  }
  
  for(i=0; i<shopsArray.length; ++i) {
    carouselItems.items[shopsArray[i].name] = {
      title: shopsArray[i].name,
      description: shopsArray[i].category + ' - ' + shopsArray[i].location,
      image: new Image({
        url: shopsArray[i].imageURL,
        alt: ' ',
      }),
    }
  }
      
  var carouselObject = new Carousel(carouselItems);   
  conv.ask(new SimpleResponse({text: 'Here are a few shops near '+location, speech: 'Here are a few shops near '+location}))
  conv.ask(carouselObject)
  conv.ask(new Suggestions(intentSuggestions));

})

// Facilities Intent 
app.intent('Facilities', (conv) =>{
  console.log('Facilities')
  conv.ask(new SimpleResponse({
    speech:'Here are some things that you can ask me -',
    text: 'Here are some things that you can ask me -', 
  }));
  conv.ask(new Suggestions(SerivcesSuggestions)) 
});

// Get Smoking Rooms Info
const getSmokingRoomsInfo = async (location) => {
    try {
        return await facilitiesBase('SmokingRooms').select({
          view: "Grid view",
          //maxRecords: 2,
          filterByFormula: "{Location} ='"+location+"'"
        }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Smoking Rooms Intent
app.intent('SmokingRooms', async (conv, params) => {
  var location = resolveLocation(params.TerminalLocation)
  console.log(location)
  var response = await getSmokingRoomsInfo(location)
  var SmokingRoomsArray = []
  for (var i=0; i<response.length; ++i) {
    SmokingRoomsArray.push({
      name: response[i]._rawJson.fields['Name'],
      url : response[i]._rawJson.fields["url"]
    });
  }
  var carouselItems = {
    items: []
  }
  console.log(SmokingRoomsArray)
  for(i=0; i<SmokingRoomsArray.length; ++i) {
    var item = new BrowseCarouselItem({
        title: 'Smoking Room '+(i+1),
        description: SmokingRoomsArray[i].name,
        url: SmokingRoomsArray[i].url,
        image: new Image({
          url: 'http://www.changiairport.com/content/dam/cag/airport-guide/Facilities-Services/smoking-areas/dt-fs-smoking_areas.jpg',
          alt: 'Smoking Areas',
        }),      
    })
    carouselItems.items.push(item)
  } 
  var carouselObject = new BrowseCarousel(carouselItems); 
  conv.ask(new SimpleResponse({text: 'Here are a few Smoking Areas near '+location, speech: 'Here are a few Smoking Areas near '+location}))
  conv.ask(carouselObject) 
  conv.ask(new Suggestions(SerivcesSuggestions)) 
  
})

// Get CharginPoints Info
const getChargingPointsInfo = async (location) => {
    try {
        return await facilitiesBase('ChargingPoints').select({
          view: "Grid view",
          //maxRecords: 2,
          filterByFormula: "{Location} ='"+location+"'"
        }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// ChargingPoints Intent
app.intent('ChargingPoints', async (conv, params) => {
  var location = resolveLocation(params.TerminalLocation)
  var response = await getChargingPointsInfo(location)
  var ChargingPointsArray = []
  for (var i=0; i<response.length; ++i) {
    ChargingPointsArray.push({
      name: response[i]._rawJson.fields['Name'],
      url : response[i]._rawJson.fields["url"],
      AccessibleTo : response[i]._rawJson.fields["AccessibleTo"]
    });
  }
  var carouselItems = {
    items: []
  }
  console.log(ChargingPointsArray)
  for(i=0; i<ChargingPointsArray.length; ++i) {
    var item = new BrowseCarouselItem({
        title: 'Accessible To '+ChargingPointsArray[i].AccessibleTo,
        description: ChargingPointsArray[i].name,
        url: ChargingPointsArray[i].url,
        //description: SmokingRoomsArray[i].name,
        image: new Image({
          url: 'http://www.changiairport.com/content/dam/cag/airport-guide/Facilities-Services/charging-points/1140x425-lvl3_masthead-charging_points.jpg',
          alt: 'Charging points',
        }),      
    })
    carouselItems.items.push(item)
  }
  
  var carouselObject = new BrowseCarousel(carouselItems);   
  
  console.log(carouselObject)
  
  conv.ask(new SimpleResponse({text: 'Here are a charging points near '+location, speech: 'Here are a few charging points near '+location}))
  conv.ask(carouselObject) 
  conv.ask(new Suggestions(SerivcesSuggestions)) 
  
})

// Baggage Intent
app.intent('Baggage', (conv) => {
  var tempBaggageSuggestions = JSON.parse(JSON.stringify(baggageSuggestions))
  console.log('Baggage')
  conv.ask(new SimpleResponse({
    speech: 'Here are some things that you can ask me -',
    text: 'Here are some things that you can ask me -',
  }));
  if(userData.type == 'Departure') {
    tempBaggageSuggestions.splice(0,1)
  }
  if(userData.type == 'Arrival') {
    tempBaggageSuggestions.splice(1,1)
  }
  console.log(tempBaggageSuggestions)
  conv.ask(new Suggestions(tempBaggageSuggestions));
});

//Immigration Intent
app.intent('Immigration', (conv) => {
  console.log('Immigration')
  conv.ask(new SimpleResponse({
    speech: 'Upon your arrival in Singapore, please follow the Arrivals signs'+
    ' to the Arrival Immigration Halls on the ground floor for immigration clearance.',
    text: 'Upon your arrival in Singapore, please follow the Arrivals signs '+ 
    ' to the Arrival Immigration Halls on the ground floor for immigration clearance. ',
  }));
  conv.ask(new SimpleResponse({
    speech: ' ',
    text: ' Singapore Citizens, Permanent Residents and Long-term Pass Holders -> ' +
    ' Look out for the dedicated immigration clearance lanes' +
    'Foreign Visitors -> ' +
    ' Ensure you have your passport, completed Disembarkation / Embarkation (D/E) cards and/n Permits / Entry Visa (if applicable).\n '
    
  }));
  conv.ask(new Suggestions(intentSuggestions));
});

// Drop Intent
app.intent('Drop', (conv) => {
  console.log('Drop')
  conv.ask(new SimpleResponse({
    speech: 'Proceed to the dedicated baggage drop off desk or check-in desk of your airline.',
    text: 'Proceed to the dedicated baggage drop off desk or check-in desk of your airline.',
  }));
  conv.ask(new SimpleResponse({
    speech: ' ',
    text: 'The maximum weight of one piece of checked baggage is 20 kg,'  +
    'and the maximum dimensions of the bag are 100x50x80 cm.',
  }));
  conv.ask(new Suggestions(baggageSuggestions));
});

// Porter Intent
app.intent('Porter', (conv) => {
  console.log('Porter')
  conv.ask(new SimpleResponse({
    speech: 'A porter service is available at all terminals to help you with your baggage',
    text :'A porter service is available at all terminals to help you with your baggage' +
    ', when departing from or arriving in Changi Airport.\n'+ 
    ' Please make your booking at least 4 hours before your flight departs or arrives.  \n',
   }));
  conv.ask(new SimpleResponse({
    speech: ' ',
    text: 'The charges for Porter Services will be S$3.00 per item (a minimum charge of S$10.00 applies)'
  }));
  conv.ask(new Suggestions(baggageSuggestions));
});

// Pickup Intent
app.intent('Pickup', (conv) => {
  var baggageBelt = userData.baggageBelt
  console.log('Pickup')
  conv.ask(new SimpleResponse({
    speech: 'The checked-in baggages can be collected at baggage belt '+baggageBelt+' after the immigration is completed.',
    text: 'The checked-in baggages can be collected at baggage belt '+baggageBelt+' after the immigration is completed.'
      }));
  conv.ask(new Suggestions(baggageSuggestions));
});

// Storage Intent
app.intent('Storage', (conv) => {
  console.log('Storage')
  conv.ask(new SimpleResponse({
    speech: 'If you need your baggage looked after, so you can shop hands-free or leave the airport comfortably, visit our Left Baggage counters.',
    text: 'If you need your baggage looked after, so you can shop hands-free or leave the airport comfortably, visit our Left Baggage counters.'
      }));
  conv.ask(new SimpleResponse({
    speech: ' ',
    text: 'The Storage Rates are as follows:\n Loose items: S$5.00\n Small items (below 10kg): S$10.00\n Big/Odd items (above 10kg): S$15.00'
      }));
  conv.ask(new Suggestions(baggageSuggestions));
});

// Get Restaurants Info
const getRestaurants = async (category, location) => {
    try {
        return await ammnetiesBase('Restaurant').select({
          maxRecords : 10,
          view: 'Grid view',
          filterByFormula: "AND(({Category} ='"+category+"')"+", ({Location} ='"+location+"'))"
          }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Restaurants Intent
app.intent('Restaurant', async (conv, params) =>{
  var category, location
  if(params.RestaurantCuisine[0]) {
     category = params.RestaurantCuisine[0] 
   }
  
  var location = resolveLocation(params.TerminalLocation)
  console.log(location)
  var result = await getRestaurants(category, location)
  var myResponse = result  
  var RestaurantArray = []
  for (var i=0; i<myResponse.length; ++i) {
    RestaurantArray.push({
      name: myResponse[i]._rawJson.fields["Name"],
      Location : myResponse[i]._rawJson.fields["Location"],
      Time : myResponse[i]._rawJson.fields["Time"],
      Category : myResponse[i]._rawJson.fields["Category"],
      Image: myResponse[i]._rawJson.fields["Image"],
      url:myResponse[i]._rawJson.fields["url"],
      
    });
  }
  console.log(RestaurantArray)
  var carouselItems = {
    items: []
  }
  for(i=0; i<RestaurantArray.length; ++i) {
    var item = new BrowseCarouselItem({
      title: RestaurantArray[i].name,
      description: "Opening Hours:  \n" +RestaurantArray[i].Time,
      url:RestaurantArray[i].url,
      image: new Image({
        url: RestaurantArray[i].Image,
        alt: 'Appetizing Restaurant Image',
      }),
  })
    carouselItems.items.push(item)
  }
  if (RestaurantArray === undefined || RestaurantArray.length == 0) {
    conv.ask(new SimpleResponse({text: 'Sorry, there are no '+ category + ' restaurants at ' +location+'. You can ask me some alternatives', speech: 'Sorry, there are no '+ category + ' at ' +location+'. You can ask me some alternatives'}))
    var fallbackChip = [category+' at jewel', category+ ' at T2']
    conv.ask(new Suggestions(fallbackChip)); 
  } else {
    var carouselObject = new BrowseCarousel(carouselItems);   
    conv.ask(new SimpleResponse({text: 'Here are a few '+ category + ' Restaurants at ' +location, speech: 'Here are a few '+ category + ' at ' +location}))
    conv.ask(carouselObject)
    conv.ask(new Suggestions(intentSuggestions));    
  }

  
});

// Get Rest Areas Info
const getRestAreas = async (location) => {
    try {
        return await facilitiesBase('FreeRestAreas').select({
          maxRecords : 10,
          view: 'Grid view',
          filterByFormula: " {Location} ='"+location+"'"
          }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Free Rest Areas Intent
app.intent('FreeRestAreas', async (conv, params) =>{
  console.log('Free Rest Areas')
  var response = []
  var location = resolveLocation(params.TerminalLocation)
  var response = await getRestAreas(location)

  var RestArea = []
  for (var i=0; i<response.length; ++i) {
    RestArea.push({
      name: response[i]._rawJson.fields["Name"],
      address : response[i]._rawJson.fields["Address"],
      image: response[i]._rawJson.fields["image"],
      url: response[i]._rawJson.fields["url"],
    });
  } 
  var carouselItems = {
    items: []
  }

  for(i=0; i<RestArea.length; ++i) {
    var item = new BrowseCarouselItem({
      title: 'RestArea '+ (i+1) ,
      description: "Address: " +RestArea[i].address,
      url:RestArea[i].url,
      image: new Image({
        url: RestArea[i].image,
        alt: 'Rest area Image',
      }),
  })
    carouselItems.items.push(item)
  }
  console.log(carouselItems)
  var carouselObject = new BrowseCarousel(carouselItems);   
  conv.ask(new SimpleResponse({text: 'Here are a few Resting areas available at '+ location , speech: 'Here are a few Resting areas available at '+ location}))
  conv.ask(carouselObject)
  conv.ask(new Suggestions(SerivcesSuggestions)) 
});

// Get Pharmacies Info
const getPhar = async (location) => {
    try {
        return await facilitiesBase('Pharmacies').select({
          maxRecords : 10,
          view: 'Grid view',
          filterByFormula: " {Location} ='"+location+"'"
          }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Pharmacies Intent
app.intent('Pharmacy', async (conv, params) =>{
  console.log('Pharmacy')
  var response = []
  var location = resolveLocation(params.TerminalLocation)
  var response = await getPhar(location)

  var pharmacy = []
  for (var i=0; i<response.length; ++i) {
    pharmacy.push({
      name: response[i]._rawJson.fields["Name"],
      address : response[i]._rawJson.fields["Address"],
      location: response[i]._rawJson.fields["Location"],
      Timings: response[i]._rawJson.fields["Timings"],
      Image: response[i]._rawJson.fields["Image"],
      url: response[i]._rawJson.fields["url"],
    });
  }
   
  var carouselItems = {
    items: []
  }

  for(i=0; i<pharmacy.length; ++i) {
    var item = new BrowseCarouselItem({
      title: 'Pharmacy '+ (i+1),
      //title: pharmacy[i].name,
      description: "Address: " +pharmacy[i].address + '  \n ' + 'Location: '+ pharmacy[i].location +'  \nTimings: ' + pharmacy[i].Timings,
      url:pharmacy[i].url,
      image: new Image({
        url: pharmacy[i].Image,
        alt: 'Pharmacy Image',
      }),
  })
    carouselItems.items.push(item)
  }
  
  var carouselObject = new BrowseCarousel(carouselItems);   
  console.log(pharmacy)
  if (pharmacy === undefined || pharmacy.length == 0 || pharmacy.length == 1) {
    conv.ask(new SimpleResponse({text: 'Sorry, there are no Pharmacies at ' +location+'. You can ask me some alternatives', speech: 'Sorry, there are no Pharmacies at ' +location+'. You can ask me some alternatives'}))
    var fallbackChip = ['Pharmacies at T1', 'Pharmacies at T2']
    conv.ask(new Suggestions(fallbackChip)); 
  } else {
    conv.ask(new SimpleResponse({text: 'Here are some Pharmacies available at '+ location , speech: 'Here are some Pharmacies available at '+ location}))
    conv.ask(carouselObject)
    conv.ask(new Suggestions(SerivcesSuggestions))     
  }
 

});

// Get Clinics Info
const getClinics = async (location) => {
    try {
        return await facilitiesBase('Clinics').select({
          maxRecords : 10,
          view: 'Grid view',
          filterByFormula: " {Location} ='"+location+"'"
          }).all();
    }
    catch(err) {
        console.error(err);
        return; 
    }
};

// Clinics Intent
app.intent('Clinics', async (conv, params) =>{
  console.log('Clinics')
  var response = []
  var location = resolveLocation(params.TerminalLocation)
  var response = await getClinics(location)
  var clinics = []
  for (var i=0; i<response.length; ++i) {
    clinics.push({
      name: response[i]._rawJson.fields["Name"],
      address : response[i]._rawJson.fields["Address"],
      location: response[i]._rawJson.fields["Location"],
      Timings: response[i]._rawJson.fields["Timings"],
      Image: response[i]._rawJson.fields["Images"],
      url:response[i]._rawJson.fields["url"],
      AccessibleTo:response[i]._rawJson.fields["AccessibleTo"],
    });
  } 
  var carouselItems = {
    items: []
  }
  for(i=0; i<clinics.length; ++i) {
    var item = new BrowseCarouselItem({
      title: "Accesible to " + clinics[i].AccessibleTo,
      description: "Address: " +clinics[i].address + '  \n' + 'Location: '+ clinics[i].location +'  \nTimings: ' + clinics[i].Timings,
      url: clinics[i].url,
      image: new Image({
        url: clinics[i].Image,
        alt: 'Clinics Image',
       }),
  })
    carouselItems.items.push(item)
  }  
  var carouselObject = new BrowseCarousel(carouselItems);   
  conv.ask(new SimpleResponse({text: 'Here are some Clinics available at '+ location , speech: 'Here are some Clinics available at '+ location}))
  conv.ask(carouselObject)   
  conv.ask(new Suggestions(SerivcesSuggestions)) 
});

// Default Fallback Intent
app.intent('Default Fallback Intent', conv => {
  console.log('fallback')
  conv.ask('I did not understand. Can you tell me something else?')
})

// Endpoint
expressApp.post("/", app)

var listener = expressApp.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
