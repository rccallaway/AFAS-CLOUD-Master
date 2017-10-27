#!/usr/bin/env node

"use strict";
//will not be utilized outside local environment
(function(){
  var has_require = typeof require !== 'undefined';

  var Red = require('redis');
  var Twil = require('twilio');
  var root = this;

  var afasRedTwil = function(){
    console.log(Twil);
    console.log(Red);
    var tls = require('tls');
    var fs = require('fs');

    //TODO: must have an ssl for secure transfers look at for setup:
    //https://www.ibm.com/blogs/bluemix/2014/09/ssl-certificates-bluemix-custom-domains/
    /*
    var ssl = {
      key: fs.readFileSync('path_to_keyfile', encoding='ascii'),
      cert: fs.readFileSync('path_to_cerfile', encoding='ascii'),
      ca: [ fs.readFileSync('path_to_ca_certfile', encoding='ascii') ]
    };
    */
    
    if (!has_require){
      var retrieve_pass = prompt("Please enter Red password");
    } else {
      var retrieve_pass = String(process.env.REDIS_PASSWORD);
    };
      try {
      var client = Red.createClient(13202, 'pub-redis-13202.dal-05.1.sl.garantiadata.com');
      } catch (err) {
        console.error("ENOCONN: NO CONNECTION COULD BE MADE TO ENDPOINT, CONTACT IT PROVIDER");
        throw "Cannot Continue";
      };

      client.auth(retrieve_pass, function (err) {
        err ? console.log("You have an error\n\n\t>>".concat(err)) : console.log(client);
      });

      return client; //client goes back to variable
  };
  
  afasRedTwil.noConflict = function(){
    root.afasRedTwil = previous_afas;
    return afasRedTwil;
  };
  
  if (typeof exports !== 'undefined') {
    exports.afasRedTwil = afasRedTwil;
  } else {
    root.afasRedTwil = afasRedTwil;
  };

  //When it's all said and done, it should at least have the packages working 
  //together in harmony.
  
  var clientpublisher = afasRedTwil();
 
  if (!has_require){
    twilio_initialization().then(function(con){
      clientpublisher.publish('portal', patientcluster);
     });
    }
}).call(this);
