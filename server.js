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


/* for edamam API */
// const dietOptions = [“balanced”, “high-protein”, “high-fiber”, “low-fat”, “low-carb”, “low-sodium”];
// const healthOptions = [“vegan”, “vegetarian”, “paleo”, “dairy-free”, “gluten-free”, “wheat-free”, “fat-free”, “low-sugar”, “egg-free”, “peanut-free” ];

const scope = 'report:blood-glucose report:milk-allergy report:peanuts-allergy report:egg-allergy report:carbohydrate-intake report:protein-intake';

app.get('/login', (req, res) => {
			const authorizeUrl = genomeLink.OAuth.authorizeUrl({ scope: scope });
			res.render('login', { authorize_url: authorizeUrl});
});

app.get('/logout', (req, res) => {
		req.session.destroy((err) => {
			if(err){
				res.status(500).send('unable to logout');
			}else{
				res.redirect('/login');
			}
		})
});

let determineEdamamParams = (trait, score) => {
	switch(trait){
		case('BLOOD GLUCOSE'):
			if(score>2){
					return "q=low-sugar&health=sugar-conscious";
			}
			return;
		case('PROTEIN INTAKE'):
			if(score<2){
					return "diet=protein&diet=high-protein"
			}
			return;
		case('MILK ALLERGY'):
			if(score < 2){
				return "q=dairy-free";
			}
			return;
		case('PEANUTS ALLERGY'):
			if(score < 2){
				return "q=peanut-free&health=peanut-free"
			}
			return;
		case('EGG ALLERGY'):
			if(score < 2){
				return "q=egg-free";
			}
			return;
		case('CARBOHYDRATE INTAKE'):
			if(score < 2){
				return "q=low-carb&diet=low-carb";
			}
		default:
			return;
	}
}


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
		}).then((response) => {
			let obj = Object.assign({},
				{name: response.phenotype.display_name.toUpperCase()},
				{score: response.summary.score},
				{description: response.summary.text},
				{id: response.phenotype.url_name});
			obj.query = determineEdamamParams(obj.name, obj.score);
			return obj;
		}).catch((err) =>
			res.status(404).send('your report is not found\n'+err)
		);
	}));

	let categories = {};
	// let categories = { 'deficiencies': [], 'excess': [], 'normal':[] , 'allergies':[] };
	reports.forEach((report) => {
		if(report.name.includes('ALLERGY')){
			categories.allergies ? categories.allergies.push(report): categories.allergies = [report];
		}else if(report.score < 2){
			categories.deficiencies ? categories.deficiencies.push(report): categories.deficiencies = [report];
		}else if(report.score === 2){
			categories.normal ? categories.normal.push(report): categories.normal = [report];
		}else{
			categories.excess ? categories.excess.push(report): categories.excess = [report];
		}
	})
	res.render('index', { categories: categories });
});


app.get('/recipes/:query', (req, res) => {

	fetch(`https://api.edamam.com/search?app_id=a793e502&app_key=ee354651f93c535869926a785bc53735&to=10&${req.params.query}`)
	.then((response) => response.json())
	.then((data) =>
	// res.json(data)
	res.render('recipes', {recipes: data.hits})
	)
	.catch((err) => res.status(500).send(err))
})

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
