var Firebase = require('firebase'),
    usersRef = new Firebase('https://envelopeplanet.firebaseio.com/Users'),
    twilio = require('twilio'),
//     client = twilio(process.env.TWILIO_ACCOUNTSID, process.env.TWILIO_AUTHTOKEN),
    client = twilio(),
    cronJob = require('cron').CronJob;
var nodemailer = require('nodemailer'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express();
// var textJob = new cronJob( '0 18 * * *', function(){
//   client.sendMessage( { to:'+12246398453', from:'+12246398453', body:'Hello! Hope you’re having a good day!' }, function( err, data ) {});
// },  null, true);

// var numbers = ['']
// for( var i = 0; i < numbers.length; i++ ) {
//   client.sendMessage( { to:numbers[i], from:'YOURTWILIONUMBER', body:'Hello! Hope you’re having a good day.'}, function( err, data ) {
//     console.log( data.body );
//   });
// }

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var notifyAdmin = function(msg) {
  console.log(msg);
  sendEmail({from: process.env.NODEMAILER_USER, to:'mattcowski@gmail.com', subject:'new call/text', text: msg})
};
var numbers = [];
usersRef.on('child_added', function(snapshot) {
  numbers.push(snapshot.val());
  notifyAdmin('Added number '+snapshot.val());
});

app.post('/message', function (req, res) {
  var resp = new twilio.TwimlResponse();
  notifyAdmin(req.body.From+" texted: "+req.body.Body.trim());
  if( req.body.Body.trim().toLowerCase() === 'subscribe' ) {
    var fromNum = req.body.From;
    if(numbers.indexOf(fromNum) !== -1) {
      resp.message('You already subscribed!');
    } else {
      resp.message('Thank you, you are now subscribed. Reply "STOP" to stop receiving updates.');
      usersRef.push(fromNum);
    }
  } else {
    resp.message('Welcome to Daily Updates. Text "Subscribe" receive updates.');
  }
 
  res.writeHead(200, {
    'Content-Type':'text/xml'
  });
  res.end(resp.toString());
 
});

var adminNum = '+12246398453';
app.post('/call', function(req, res) {
  var resp = new twilio.TwimlResponse();
  var fromNum = req.body.From;
  notifyAdmin('new call from '+fromNum);
  if(numbers.indexOf(fromNum) !== -1) {
    resp.message('You already subscribed!');
  } else {
    resp.message('Thank you, you are now subscribed. Reply "STOP" to stop receiving updates.');
    usersRef.push(fromNum);
  };
  
  resp.dial({
    timeout: 10,
    action: 'http://'+req.headers.host+'/leave_voicemail',
    method: 'POST',
    record: 'record-from-answer'
  }, adminNum);
  res.send(resp.toString());
});

app.post('/leave_voicemail', function (req, res) {
  var resp = new twilio.TwimlResponse();
  resp.say('Please leave a message after the tone and we will get back to you in about')
  .say({voice:'woman'},'15 minutes');
//   .record({
//     transcribeCallback:'http://'+req.headers.host+'/api/twilio/record_cb',
//   });
  res.send(resp.toString());
});

var sendEmail = function(email) { 
  var transporter = nodemailer.createTransport({service: "gmail", auth: {user: process.env.NODEMAILER_USER, pass: process.env.NODEMAILER_PASS}});
//   var email = req.body;
//   var email = {from: process.env.NODEMAILER_USER, to:'mattcowski@gmail.com', subject:'test', text: 'hello world!'};
  transporter.sendMail(email, function (err,response) {
//     if (err) return res.json(500, err);
    email.id = response.messageId;
    email.status = response.message;
    email.transport = '';
//     Emails.push().setWithPriority(email, Firebase.ServerValue.TIMESTAMP); 
    transporter.close(); // shut down the connection pool, no more messages
//     res.json(email);  
  });
};


var server = app.listen(8888, function() {
  console.log('Listening on port %d', server.address().port);
  console.log(process.env.NODEMAILER_USER);
});