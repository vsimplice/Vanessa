var express = require("express");
var app = express();
var cfenv = require("cfenv");
var bodyParser = require('body-parser');
var moment = require('moment');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

var cloudant, mydb;

/* Endpoint to add a new company to the database
* Send a POST request to localhost:3000/api/companies with body
* {
* 	"companyName": "American Airlines",
*   "address": "123 Main St",
*   "sector": "Airline"
* }
*/
app.post("/api/companies", function (request, response) {
  // console.log('request.body: ', request.body);
  var doc = {
    "companyName" : request.body.companyName,
    "address" : request.body.address,
    "sector" : request.body.sector,
    "lastUpdated": moment()
  };
  if(!mydb) {
    console.log("No database.");
    response.send(doc);
    return;
  }
  // insert the username as a document
  mydb.insert(doc, function(err, body, header) {
    if (err) {
      console.log('[mydb.insert] ', err.message);
      response.send("Error");
      return;
    }
    doc._id = body.id;
    response.send(doc);
  });
});

/**
 * Endpoint to get a JSON array of all the companies in the database
 * REST API example:
 * <code>
 * GET http://localhost:3000/api/companies
 * </code>
 *
 * Response:
 * [ "American Airlines", "Regions" ]
 * @return An array of all the company names
 */
app.get("/api/companies", function (request, response) {
  var names = [];
  if(!mydb) {
    response.json(names);
    return;
  }

  mydb.list({ include_docs: true }, function(err, body) {
    if (!err) {
      body.rows.forEach(function(row) {
        if(row.doc.companyName)
          names.push(row.doc.companyName);
      });
      response.json(names);
    }
  });
});


// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);

// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');
if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
    // CF service named 'cloudantNoSQLDB'
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
     // user-provided service with 'cloudant' in its name
     cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }
} else if (process.env.CLOUDANT_URL){
  cloudant = Cloudant(process.env.CLOUDANT_URL);
}
if(cloudant) {
  //database name
  var dbName = 'old-data';

  // // Create a new "mydb" database.
  // cloudant.db.create(dbName, function(err, data) {
  //   if(!err) //err if database doesn't already exists
  //     console.log("Created database: " + dbName);
  // });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);
}

//serve static file (index.html, images, css)
app.use(express.static(__dirname + '/views'));



var port = process.env.PORT || 3000
app.listen(port, function() {
    console.log("To view your app, open this link in your browser: http://localhost:" + port);
});
