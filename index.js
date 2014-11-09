var playlist = require('./playlist.js'),
	express = require('express'),
	mustacheExpress = require('mustache-express'),
	app = express(),
	has_raspberry_video_out = false,
	port = 3000,
	exec = require('child_process').exec,
    glob = require('glob'),
	p;

p = new playlist();

exec('which omxplayer', function(error, stdout, stderr) {
	if (!error) {
		has_raspberry_video_out = true;
	}
});

glob("video/**/*.m4v", {}, function (er, files) {

	// add m4v files
	for (var i = 0; i < files.length; i++) {
		p.addMedia(files[i]);
	};

	// start the playlist, which also kicks off encoding
	p.start()
		.on('started', function() {
			if (has_raspberry_video_out === true) {
				console.log("sending video to video out [seinfeld-tools]")
				exec('omxplayer http://localhost:'+port+'/playlist.m3u8')				
			}
		});

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
app.listen(port);