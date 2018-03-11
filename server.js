const express = require('express');
const session = require('express-session');
const genomeLink = require('genomelink-node');
const app = express();

app.use(session({
	secret: 'FOOBARNIHAR',
	resave: false,
	saveUninitialized: true,
	cookie: {
		maxAge: 5*30*60*1000
	}
}));

var hbs = require('express-handlebars')({
	defaultLayout: 'main',
	extname: '.hbs'
});

app.engine('hbs',hbs);
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

const scope = 'report:blood-glucose report:milk-allergy report:peanuts-allergy report:egg-allergy report:carbohydrate-intake report:protein-intake';

app.get('/login', (req, res) => {
  const authorizeUrl = genomeLink.OAuth.authorizeUrl({ scope: scope });

	res.render('login', { authorize_url: authorizeUrl});
});


app.get('/', async(req, res) => {
	if (!req.session.oauthToken) {
		res.redirect('/login');
		return;
	}
	let reports = [];
	const scopes = scope.split(' ');
	reports = await Promise.all(scopes.map( async (name) => {
		return await genomeLink.Report.fetch({
			name: name.replace(/report:/g, ''),
			population: 'european',
			token: req.session.oauthToken
		});
	}));
	res.render('index', { reports: reports });
});

// app.get('/login', async (req,res) => {
//   const scope = 'report:blood-glucose report:iron report:calcium report:vitamin-b12 report:vitamin-a report:milk-allergy report:peanuts-allergy report:egg-allergy';
//   const authorizeUrl = genomeLink.OAuth.authorizeUrl({ scope: scope });
// 	console.log('help');
//   // Fetching a protected resource using an OAuth2 token if exists.
//   let reports = [];
//   if (req.session.oauthToken) {
//     const scopes = scope.split(' ');
//     reports = await Promise.all(scopes.map( async (name) => {
//       return await genomeLink.Report.fetch({
//         name: name.replace(/report:/g, ''),
//         population: 'european',
//         token: req.session.oauthToken
//       });
//     }));
//   }
// 	// res.render('login', {
//   //   authorize_url: authorizeUrl,
//   //   reports: reports,
//   // });
// });

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
