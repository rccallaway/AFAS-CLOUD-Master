//Comment for 10/26
var express = require("express"),
    app = express(),
    createError = require('http-errors'),
    cfg = require('./config'),
    bodyParser = require('body-parser');

//Wait Function//
function wait (timeout) {  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, timeout)
  })
}

//Express urlencoding
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

function TimeStamper(){
  var date = new Date();
  return date.toISOString();
};

async function makeCallOrMakeTextOrMakeEmail(ms, 
					     interface, 
					     contact,
					     message, 
					     practitioner, 
					     callback,
					     client) {

 switch (interface){

  case 'call':
    if (contact.cell.value !== 'no recording' &&
	contact.home.value == 'no recording'){
        await require('./routes/call')(contact.cell.value, message, practitioner, callback)
        .then(results=>console.info(results))
        .catch(err=>console.error(err));

    } else if (contact.cell.value == 'no recording' &&
               contact.home.value !== 'no recording'){
        await require('./routes/call')(contact.home.value, message, practitioner, callback)
	.then(results=>console.info(results))
        .catch(err=>console.error(err));

    } else if (contact.cell.value !== 'no recording' &&
	       contact.home.value !== 'no recording'){
       //complete this module first
       await require('./routes/call')(contact.cell.value, message, practitioner, callback)
       .then(results=>console.info(results))
       .catch(err=>console.error(err));
       client.hgetAsync(practitioner, "answered")
       .then((err, reply)=>{
        if (!err){
          if (reply === "human"){
            retrievedHuman = TimeStamper() +
                "--> CONTACT: " + contact.fname+
                " was successfully connected to" +
                " PRACTITIONER: " + practitioner;
            console.info(retrievedHuman);

           } else {
             contact.cell.value = 'no recording'; //disable the contact.cell and proceed to the landline
             makeCallOrMakeTextOrMakeEmail(20000, 'call', contact,
                       message, practitioner, callback, client);
           };
        } else {
           console.warn(TimeStamper() +
             "--> [VIOLATION] CONTACT: "+ contact.fname+
             " was NOT connected to" +
             " PRACTITIONER: " + practitioner + "by TYPE: "+
             " LANDLINE"
            );
       }
      });
    } else if (contact.cell.value == 'no recording' &&
	       contact.home.value ==  'no recording'){
	     var noCommunication = TimeStamper() + "--> [ENOTELE] No cell phone or land line"+
				" provided for this CONTACT "+ contact.name + " for patient "+
				patient;
	     console.warn(noCommunication);
	     auditFile.message = "\n"+noCommunication;
    } else {
        console.error(TimeStamper()+"--> Contact information cannot be provided for CONTACT "+
                      contact.fname+" please provide valid communication channels");
    }
    break;

  case 'text':
    if (contact.cell !== ''){
      await require('./routes/message')(contact.cell.value, message, practitioner, callback)
      .then(results=>console.info(results))
      .catch(err=>console.error(err));
    } else {
      var noCell = TimeStamper()+"--> "+" cannot contact cell number, no valid information"+
		   " or whereabouts on the cell for CONTACT "+contact.name;
      console.warn(noCell);
      auditFile.message = "\n"+noCell;
    };
    break;

   case 'email':
     if (contact.email !== ''){
       require('./routes/email')(contact.email.value, message, practitioner, callback);
     } else {
      var noEmail = TimeStamper()+"--> "+" cannot contact email address, no valid email"+
		    " or whereabouts on the email address for CONTACT "+contact.email;
      console.warn(noEmail);
      auditFile.message="\n"+noEmail;
    }
    break;
  }
  return new Promise(resolve=>setTimeout(resolve,ms)) 
};

/* 
 * Practicioners, Doctors, Nursers, and validated administrators
 * use the POST: /api/red-sub
 *
 * body {
 *        practitioner: name,
 *        callback: callback,
 *        message: message,
 *        urgency: DTSU2 status{R},
 *	  contacts: [{contact 1 telecom},
 		     {contact 2 telecom}
		    ],
	  patient: patient
 *      }
 */
 
app.post("/api/red-sub", function(request, response) {

 var practitioner = request.body.practitioner;

 const host = cfg.Host,
       password = cfg.Password,
       port = cfg.Port;

 var message = request.body.message;
     contacts = JSON.parse(request.body.contacts),
     urgency = request.body.urgency,
     callback = request.body.callback,
     patient = request.body.patient;

 var redis = require('redis'); //service we are working with
 var bluebird = require('bluebird');
 bluebird.promisifyAll(redis.RedisClient.prototype);
 bluebird.promisifyAll(redis.Multi.prototype);
  
 var client = redis.createClient(port, host, {no_ready_check: true, password: password});

 //<-------ASYNC-REDIS------->//

 /* AuditSheet for successful data transferal through 2 apps */
 var auditFile = {};
 //<------------------------>//
 
 //INITIALIZE THE QUERYLOOP//
 var contactKeys = contacts.keys(),
     contactType = urgency.split('&'),
     interfaceKeys = contactType.keys(),
     interface = contactType[interfaceKeys.next().value],
     nextContact, //DECLARED GLOBAL VARIABLE FOR scrollEachContact
     nextSystem;  //DECLARED GLOBAL VARIABLE FOR scrollEachContact

 var index = contactKeys.next().value,
     contact = contacts[index];
 //-----------------------//

 auditFile.patient = patient;
 auditFile.message = '';
 
 async function scrollEachSystem(contact, interface) {

   var noRetrieval = null,
       answer;
   console.info(contact);
   client.hset(practitioner,
	       'message',
	       message,
	       (err, reply)=>
	       !err?console.info(TimeStamper()+" set message "+message+
   				 " from PRACTITIONER "+practitioner
			        )
		:console.error(err));

   if (/call/i.test(interface)){
        client.hset(practitioner, 'answered', 'no');
        return await makeCallOrMakeTextOrMakeEmail(40000, 'call', contact,
				   message, 
				   practitioner, 
				   callback,
				   client)
				   .then(_dual=>{
				   	   return new Promise((resolve,reject)=>{
						console.info("THE CALL WAS TRANSFERRED AND RETURNED SUCCESSFULLY");
						client.hgetAsync(practitioner, "answered")

						.then(reply=>{

						reply?answer=reply:console.error("[ERROR] No message was returned...");
						if (answer==="human"){
							retrievalSuccess = TimeStamper()+"--> Successfully retrieved CONTACT "+
									    contact.fname +" and delivered the message.";
							console.info(retrievalSuccess);
							console.info(answer);
							auditFile.message+="\n\n"+retrievalSuccess;
						        resolve(answer);
						} else if (answer==="machine_start" ||
							   answer==="fax" ||
							   answer==="unknown"){
						  	noRetrieval = TimeStamper()+"-->Retrieved the machine, stepping to another target"
						  	console.info(answer);
							console.info(noRetrieval);
							auditFile.message+="\n\n"+noRetrieval;
						        reject(answer);
						} else {
							noRetrieval = "[CONNECTION ERROR] could not retrieve machine or human please advise"
							console.warn(noRetrieval);
							console.warn(answer);
							auditFile.message+="\n\n"+noRetrieval;
							reject("unknown");
						}
					     })
					 })
				      });
   } else if (/text/i.test(interface)){
     client.hset(practitioner, 'texted', 'no');
     return await makeCallOrMakeTextOrMakeEmail(40000, 'text',
              contact,
     	      message, 
              practitioner, 
              callback,
              client).then(()=>{
                return new Promise((resolve, reject)=>{
                  client.multi().hget(practitioner, "texted").hget(practitioner, "replied")
                    .execAsync().then((replies)=>{
                      var _replied = replies[1],
                          _texted = replies[0];
                      if (_replied && _texted){
                        retrievalSuccess = TimeStamper()+"-->Practitioner has sent a message to the user, closing...";
                        console.info(retrievalSuccess);
                        auditFile.message += "\n"+retrievalSuccess;
                        resolve('human');
                      } else if (_texted && !_replied){
                        noRetrieval = TimeStamper()+"-->Message sent to CONTACT "+contact.fname+" but no reply or callback next communication strategy to execute";
                        auditFile.message += "\n"+noRetrieval;
                        reject('failure');
                      } else {
			noRetrieval = TimeStamper()+"-->Could not get indication of user receiving text OR replying. Please troubleshoot";
			auditFile.message += "\n"+noRetrieval;
			reject('failure');
		      }
                    });
                });
             });
   } else if (/email/i.test(interface)) {
           client.hset(practitioner, 'returnedEmailed', 'no');
           return await makeCallOrMakeTextOrMakeEmail(10000, 'email',contact,
                    message, practitioner, callback,client).then(()=>{
		    return Promise((resolve, reject)=>{
			  client.hgetAsync(practitioner, 
					   'returnedEmail', 
					   (err, reply)=>
					     !err&&reply?answer=reply:noRetrieval=TimeStamper()+
				             contact.fname+" did not receive email from PRACTITIONER "+practitioner+" TYPE: email"
					  );
        
		   if (answer == 'yes'){
		      retrievalSuccess = TimeStamper()+"--> CONTACT " + contact.fname +
		       " received email from PRACTITIONER "+
		       practitioner + " TYPE: email";
		       console.info(retrievalSuccess);
		       auditFile.message += "\n"+retrievalSuccess;
		       client.del(practitioner, 
				  (err,reply)=>
				   !err&&reply?console.info(TimeStamper() + "-->Finished transaction for "+` ${practitioner}`):
				   Error("could not close hash for PRACTITIONER "+practitioner+"."));
		   } else {
		      noRetrieval = TimeStamper()+"--> CONTACT "+contact.fname+
		    " did not receive email from PRACTITIONER "+
		    practitioner + " TYPE: email";
		    console.warn(noRetrieval);
		    auditFile.message += "\n"+noRetrieval
		    return Promise.reject("failure");
		 };
	       });
	});
   } else {
     throw new Error("ENOINTERFACE-->NO INTERFACE TO CONNECT WITH, PLEASE REMEDIATE");
   }
 }

 async function connectEachContact(){
   scrollEachSystem(contact, interface)
	
	.then(results=>{
		console.info("The Results-->".concat(results));
		if (results === 'human'){
		      client.del(practitioner,
				 (err,reply)=>
				   !err?console.info("Removed hash key PRACTITIONER: "+practitioner)
				   :console.warn("Could not delete hash key PRACTITIONER: "+practitioner)
				);
		      client.quit();
		      return response.status(200).json(auditFile);
		} else {
		  console.info(results);
		  console.error("An undefined promise came back, please assess");
		  return response.status(500).json(auditFile);
		}
	 })
	.catch(async function(failure){
       	  console.error(failure);
          console.info(TimeStamper()+"-->Stepping to next interface or contact");
	  nextSystem = interfaceKeys.next().value;
          if (nextSystem !== undefined) {
		interface = contactType[nextSystem];
		connectEachContact();
	  } else {
	    nextContact = contactKeys.next().value;
	    interfaceKeys = contactType.keys(); //restart the generator for urgencies
	    interface = contactType[interfaceKeys.next().value];

	    if (nextContact !== undefined){
	      contact = contacts[nextContact];
	      await wait(20000*2*3);
	      connectEachContact();
	    } else {
	      noConnections = TimeStamper()+"--> AFAS couldn't connect with any "+
	      		      " of the contacts, please resubmit";
	      auditFile.message += "\n"+"Unable to connect to with proxies in AFAS";
	      return response.status(404).json(auditFile);
	    };
	  }
        });
  }
  

 //Start The System!!!//
 console.info(TimeStamper()+"-->PRACTITIONER "+practitioner+
	      " is going through the loop, going through each "+
	      "contact");
 connectEachContact();
});

  
         

var appEnv = cfenv.getAppEnv();
// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
//print a message when the server starts listening
  console.info("server starting on " + appEnv.url);
});
