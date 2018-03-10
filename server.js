const express = require('express');
const session = require('express-session');
const genomeLink = require('genomelink-node');
const app = express();

app.use(session({
	secret: 'FOOBARNIHAR',
	resave: false,
	saveUninitialized: true,
	cookie: {
		maxAge: 30*60*1000
	}
}));

app.get('/', (req,res) => {
	res.send('Genome Link example');
});

app.get('/callback', async (req, res) => {
  // The user has been redirected back from the provider to your registered
  // callback URL. With this redirection comes an authorization code included
  // in the request URL. We will use that to obtain an access token.
  req.session.oauthToken = await genomeLink.OAuth.token({ requestUrl: req.url });

  // At this point you can fetch protected resources but lets save
  // the token and show how this is done from a persisted token in index page.
  res.redirect('/');
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
	console.log('Express started, listening to port: ', port);
});
