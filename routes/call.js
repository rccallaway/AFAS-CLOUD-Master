"use strict";

module.exports = function(number, message, prac, callback){

//encodeURIComponent the number to use as a parameter
var request = require('request');
var number = encodeURIComponent(number);
console.log("Passed the route phase");
return new Promise((resolve,reject)=>{
	     var statementReturn;
             request.post({url: 'https://afas-twilio.mybluemix.net/api/voip/call/'+number+'/'+prac, 
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
		       setTimeout(()=>reject(statementReturn));
		   } else {
		     console.log("Before statementReturn: ".concat(statementReturn));
		     body = body;
		     console.log(Object.prototype.toString.call(body));
		     statementReturn = body["signal"];
		     console.log(statementReturn);
	             console.log("Statement Return is --->\t".concat(statementReturn));
	             setTimeout(()=>resolve(statementReturn),30000);
		   }
		};
	      })
	     );
	     
	 })
};
