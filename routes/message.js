"use strict";

module.exports = function(number, message, prac, callback){

  var number = encodeURIComponent(number);
  var prac = encodeURIComponent(prac);
  var request = require('request');

  return new Promise((resolve,reject)=>{
             var statementReturn;
             request.post({url: 'https://afas-twilio.mybluemix.net/api/voip/text/'+number+'/'+prac,
             form:{message: message,
                   callback: callback
                  }
              }, ((err, httpResponse, body)=>{
                if (err){
                 console.error("An error has occured");
                 console.log(err);
                 statementReturn = err;
                 } else{
                   if (httpResponse.status == 500 ||
                       httpResponse.status == 502){
                       console.error("An error occurred within the server "+
                                         httpResponse.responseContent);
                       statementReturn = httpResponse.responseContent;
                       setTimeout(function(){reject(statementReturn)}, 30000);
                   } else {
                     console.log("Before statementReturn: ".concat(statementReturn));
                     body = body;
                     console.log(Object.prototype.toString.call(body));
                     statementReturn = body["signal"];
                     console.log(statementReturn);
                     console.log("Statement Return is --->\t".concat(statementReturn));
                     setTimeout(function(){resolve(statementReturn)},30000);
                   }
                };
              })
             );
  });
};
