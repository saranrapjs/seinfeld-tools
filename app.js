
/**
 * Module dependencies.
 */

var express = require('express'),
	stache = require('stache'),
  	routes = require('./routes'),
	logger = require('./logger'),
  	channel = require('./channel');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'mustache');
  app.register('.mustache', stache);
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});



channel.on('ready',function() {


	app.get('/', function(req,res) { routes.index(req,res,channel); });

	app.get('/playlist.m3u8', function(req,res) { routes.m3u8(req,res,channel); });

	app.listen(3000, function(){
	  logger.info("server listening on port %d in %s mode", app.address().port, app.settings.env);
	});
})
