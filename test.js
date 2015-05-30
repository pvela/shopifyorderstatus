var express = require('express')
var app = express()

//cache is used to store the phonenumber and requestid so we can use the phone number to get the orders after the verification is complete
var NodeCache = require( "node-cache" );
var phoneNumberCache = new NodeCache({ stdTTL: 600, checkperiod: 660 } );

var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

/*

Sample config file is pasted below for reference
{
	"ShopifyApiKey":"12345",
	"ShopifyApiPassword":"12345",
	"NexmoApiKey":"99999",
	"NexmoApiPassword":"qwerty",
	"ShopifySiteName":"http://ethervoice.myshopify.com"
}
*/
var appConfig = require("./config.json");


var nexmo = require('easynexmo');
nexmo.initialize(appConfig.NexmoApiKey,appConfig.NexmoApiPassword,"https",true);

var Client = require('node-rest-client').Client;
var options_auth={user:appConfig.ShopifyApiKey,password:appConfig.ShopifyApiPassword};
client = new Client(options_auth);

app.use(function (req, res, next) {
  console.log('Time:', Date.now());
  next();
});
//CORS middleware
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin',appConfig.ShopifySiteName );
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
});

app.use(express.static('static'));
app.set('view engine', 'ejs');
app.get('/', function (req, res) {
	res.render("index");
})


app.post('/checkstatus', function(req,res){
	if ( req.query.orderPhoneNumber == '' && req.query.orderPhoneNumber.trim() == '') {
		//res.render("index",{"error":"Phone number not found"})
		res.send({error:"Phone number not found"})
		return;
	} else {
		nexmo.verifyNumber({number:req.query.orderPhoneNumber,brand:'ShopifyOrderStatus'},function(err,verifyResponse){
			if (err || (verifyResponse.status!='0' && verifyResponse.status != '10')) {
				//res.render("index",{"error":"Could not sending verification Code"})
				res.render({"error":"Could not send verification Code"})
			} else {
				console.dir(verifyResponse);
				phoneNumberCache.set(verifyResponse.request_id,req.query.orderPhoneNumber)
				res.send({requestId:verifyResponse.request_id})
				//res.render("checkcode",{authId:verifyResponse.request_id});
			}
			return;
		});
	}
});		
app.post('/checkcode', function(req,res){
	nexmo.checkVerifyRequest({request_id:req.query.requestId,code:req.query.keycode},function(err,verifyResponse) {	
		console.dir(err);
		console.dir(verifyResponse);
		if (err || verifyResponse.status != '0') {
			res.send({error:"Code verification Failed"});
			return;
		} else {
			var phonenumber = phoneNumberCache.get(req.query.requestId);
			if (phonenumber == undefined) {
				res.send({error:"Error retriving phonenumber from cache, please try again"});
				return;
			} else {
				client.get(appConfig.ShopifySiteName + "/admin/orders.json", 
				function(buf, response){
					var StringDecoder = require('string_decoder').StringDecoder;
					var decoder = new StringDecoder('utf8');
					var dataString = decoder.write(buf);
					var data = JSON.parse(dataString);
					console.log("order lookedup");
					var orders = data['orders'];
					var foundOrder;
					for (var orderKey in orders) {
						var order = orders[orderKey];
						var orderPhone = order['billing_address'].phone;
						if (orderPhone.length > phonenumber.length) {
							orderPhone = orderPhone.substring(orderPhone.length-phonenumber.length);
						} else if (orderPhone.length < phonenumber.length) {
							phonenumber = phonenumber.substring(phonenumber.length-orderPhone.length);
						}
						if (orderPhone === phonenumber) {
							foundOrder = order;
							console.log("found order");
							console.dir(order);
							break;
						} else {
							continue;
						}
					}
					//res.send(output);
					phoneNumberCache.del(req.query.requestId);
					if (foundOrder) {
						res.send({order:foundOrder})
					} else {
						res.send({error:"No Matching Orders found for this number"})
					}
					return;
				});
			}
		}
	});
})

var server = app.listen(9000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('ShopifyStatusCheck app listening at http://%s:%s', host, port)

})		