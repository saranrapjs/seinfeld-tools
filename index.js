var playlist = require('playlist.js'),
	express = require('express'),
	mustacheExpress = require('mustache-express'),
	app = express(),
    glob = require('glob'),
	p;

p = new playlist();

glob("video/*.m4v", {}, function (er, files) {

	// add m4v files
	for (var i = 0; i < files.length; i++) {
		p.addMedia(files[i]);
	};

	// start the playlist, which also kicks off encoding
	p.start();

});

app.engine('mustache', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');
app.use('/', express.static(__dirname + '/public'));

app.get('/', function(req,res) { 
	res.render('index', p);
});

app.get('/playlist.m3u8', function(req,res) {
	//application/x-mpegURL
	res.header('Content-Type','text/plain');
	res.render('m3u8', p);
});
app.use('/tmp', express.static(__dirname + '/tmp'));

app.listen(3000);