A shopify custom private app to allow shopify shop customers to check on the order status using just the phone number used to place the order without having the login to the shopify site.

As a level of authentication this app uses nexmo 2fa api for verifying if the user submitting the status check request owns the phone. This means that an authcode will be sent to SMS if the phone is the mobile phone otherwise nexmo will make a voice phone call to read out the authcode.

After the 2 factor authentication is done the app will show the status of the order.

Currently it shows the Order id, Fulfillment status and payment status of the order matching the phone number.

The steps to activate this app are 

1. Create a private app in shopify admin of the store that needs the Anonymous Order Status check feature

2. Create a new page under Online Store menu. Paste the code from order_status_page.html in this new page using the shopify admin page.

3. clone this project and run it in a server.

4. Change the server url in the html page for the following 2 javascript varibles
var checkPhoneUrl = "http://localhost:9000/checkstatus?orderPhoneNumber=";
var checkOrderUrl = "http://localhost:9000/checkcode?requestId=";

Once this is done you have a status check page using 2fa.

