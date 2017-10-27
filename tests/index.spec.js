//before turning the faucet on, let's invoke what the user want's to do
//for testing

console.log("\nAFAS test cases, all rights reserved.");
console.log("For testing configuration purposes, ensure your system has the latest");
console.log("NPM system and node 8.x engine installed");
console.log("Please ensure your globals have 'tape', 'cheerio', and 'supertest'");
console.log("installed:");
console.log("\nWhich testing procedure are you trying to run?");
console.log("Type '1' for contact w/ cell ONLY for procedure call.");
console.log("Type '2' for contact w/ land ONLY for procedure call.");
console.log("Type '3' for contact w/ land & cell ONLY for procedure call.");
console.log("Type '4' for texting procedure ONLY");
console.log("Type '5' for contact w/ cell for procedure call & text");
console.log("Type '6' for contact w/ land & cell for procedure call & text");
console.log("Once finished enter 'quit' to finish testing\n");

var test = require('tape');
var cheerio = require('cheerio');
var util = require('util');
var faucet = require('faucet');

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data',function(text){
		      if (!/\d+/.test(text)){
			 text ==='quit\n'?done():console.warn("option is not a number\n");
		      } else {
			 faucet(testCases(text));
		      };
});

function done(){
	console.log("Test phase completed");
	process.exit();
};

function testCases(plan){
  var request = require('request');
  var testURL = "https://AFAS-CLOUD.mybluemix.net/api/red-sub";
  var blues = require('bluebird');
  blues.promisifyAll(request); 
  var secondResource={
	name: "Disee Gillepse",
	land: "find more contacts",
	phone: "find more contacts",
	email: "do we even need this?"
  };
  var sampleForm={
	practitioner: "portal",
	callback: '+18453712125',
	message: "This is a test, please call or text immediately",
	urgency: "call",
	patient: "James Dolan",
	contacts: [ {name: 'Santiago Valdizan',
	cell: '+18455986387',
	email: 'santiagovaldiazan@jts.org',
	land: '',
	} ]
      };
  switch(parseInt(plan)){
   
    case 1: 
	 sampleForm.contacts[0].land = "";
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 return test('afas-cloud/red-sub responds with 200 for ONLY mobile phone on call procedure', (t)=>testFunction(t,request,testURL,sampleForm))
	 break;
    case 2:
	 sampleForm.contacts[0].land = "+18455986387";
	 sampleForm.contacts[0].cell = "";
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 return test('afas-cloud/red-sub responds with 200 for ONLY landline on call procedure', (t)=>testFunction(t,request,testURL,sampleForm))
	 break;
    case 3:
	 sampleForm.contacts[0].land = "+18455986387";
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 return test('afas-cloud/red-sub responds with 200 for EITHER landline or cell on call procedure', (t)=>testFunction(t,request,testURL,sampleForm))
	 break;
    case 4:
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 sampleForm.urgency = 'text';
	 console.log("You may skip the cell phone call to ensure it proceeds to the landline\n");
	 return test('afas-cloud/red-sub responds with 200 for ONLY mobile phone on text', (t)=>testFunction(t,request,testURL,sampleForm));
	 break;
    case 5:
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 sampleForm.urgency = "call&text";
	 console.log("You may ignore the call to trigger text option\n");
	 return test('afas-cloud/red-sub responds with 200 for ONLY mobile phone on call or text procedure', (t)=>testFunction(t,request, testURL, sampleForm));
	 break;
    case 6:
	 sampleForm.contacts[0].land = "+18455986387";
	 sampleForm.contacts = JSON.stringify(sampleForm.contacts);
	 sampleForm.urgency = "call&text";
	 console.log("You may ignore the call to trigger text option\n");
	 return test('afas-cloud/red-sub responds with 200 for EITHER mobile phone on call or text procedure', (t)=>testFunction(t,request, testURL, sampleForm));
	 break;
  };
};

function testFunction(t,r,u,s){
	 t.plan(1);
	 r.postAsync({url: u, form: s })
	 .then((response)=>{
		 console.log(response.body, response.statusCode);
		 if (response.statusCode == 500 ||
		     response.statusCode == 404 ||
		     response.statusCode == 502) {
		     t.fail('HTTP request did not return 200 OK.');
		     console.error(response.content);
		     console.log(response.content);
		 } else {
			  t.pass('HTTP request was successful');
			  console.log("\n\n-----\n"+response.body);
		 }
           })
}
