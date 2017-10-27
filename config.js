var dotenv = require('dotenv');
var vcap_local;
var account = dotenv.load().parsed;

cfenv = require('cfenv');

if (!account ||
    typeof account == 'undefined') {
  account = {};
  //Get Cloud Foundry user-defined services
  var serviceEnvs = cfenv.getAppEnv();
  account.Host = serviceEnvs.services['rediscloud'][0].credentials.hostname;
  account.Password = serviceEnvs.services['rediscloud'][0].credentials.password;
  account.Port = serviceEnvs.services['rediscloud'][0].credentials.port;
  //console.log(account);
} else {
  console.log(account);
}

/* TDD  local */
try {
	vcap_local = require('./AFAS-CLOUD_vcap_local.json');
	redisHostname = vcap_local.rediscloud[0].credentials.hostname;
	redisPassword = vcap_local.rediscloud[0].credentials.password;
	redisPort = vcap_local.rediscloud[0].credentials.port;
	redis = {host: redisHostname, password: redisPassword, port: redisPort};
} catch (e){
	console.warn("not within local environment, proceeding...");
};

if (vcap_local == undefined){
  module.exports = account;
} else if (vcap_local !== undefined){
  //The only service we are using for the afas-cloud portion, if other services are
  //needed then create this export as an object
  module.exports = redis;
} else {
  console.error("[ERROR] Cannot setup environments for applications, please troubleshoot");
};
