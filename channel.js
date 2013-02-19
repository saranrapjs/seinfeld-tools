var playlist = require('playlist'),
	events = require('events'),
	exec = require('child_process').exec,
	glob = require('glob'),
	config = require('config'),
	util = require('util');

var channel = function(callback) {
	var self = this;
	this.list = [];
	this.begun = false;
	this.adding = false;
	this.clean(callback)
	// process.on('SIGINT',function() {
	// 	console.log("CLEANING UP...")
	// 	self.clean();
	// 	process.exit(1);
	// })
}
util.inherits(channel, events.EventEmitter);
channel.prototype.duration = config.duration;
channel.prototype.sequence = 0;
channel.prototype.listCount = 0;
channel.prototype.files = [];
channel.prototype.gatherVideo = function() {
	var self = this;
	glob("video/**/*.m4v",function(err,files) { 
		if (err) return;
		self.addVideo(files);
	});
}
channel.prototype.addVideo = function( files ) {
	var self = this
	this.files = files;
	this.add(); // add first one
}
channel.prototype.start = function() {
	var self = this;
	this.gatherVideo();
	return this;
}
channel.prototype.currentPlaylist = function() {
	return (this.playlists[0]) ? this.playlists[0] : null;
}
channel.prototype.lastPlaylist = function() {
	return this.playlists[this.playlists.length-1];
}
channel.prototype.startPlaying = function( playlist ) {
	var self = this;
	if (this.begun !== true) {
		this.begun = true;
		this.emit('ready')
		setInterval(function() { 
			self.ping(); 
		}, this.duration*1000);		
	}
}
channel.prototype.ping = function() {
	this.sequence++;
	var latest = this.list.shift(0,1);
	if (latest.filename) { // delete any unused TS 
/* 
Per https://tools.ietf.org/html/draft-pantos-http-live-streaming-01#section-6.1.1 ::
	file MUST remain available to clients for a period of time equal to
	the duration of the media file plus the duration of the longest
	Playlist file in which the media file has appeared 
*/
		setTimeout(function() {
			exec('rm -rf '+ latest.filename, function(err) {
				if (err) console.log(err);
			});			
		},(this.duration*1000)*config.timeWindow); 
	}
	if ( this.list.length < (config.timeWindow*2) && this.adding === false) {
		console.log('[adding] list is: ' + this.list.length)
		this.add();
	}
}
channel.prototype.random = function() {
	return Math.floor(Math.random() * this.files.length);
}
channel.prototype.moreTS = function(playlist) {
	var self = this;
	if (this.listCount >= 1) this.list.push({gap:true,filename:false});
	this.listCount++;
	playlist.list.forEach(function(ts) {
		self.list.push({
			filename:ts.filename
		})
	})
	console.log('[list] now '+this.list.length)
}
channel.prototype.display = function() {
	return this.list.slice(0,config.timeWindow);
}
channel.prototype.add = function() {
	if (this.adding === true) return;
	this.adding = true;
	var randomKey = this.random(),
		self = this,
		p = new playlist(this.files[randomKey]);
	console.log('[adding] '+p.id)
	p.key = randomKey;
	p.on('ready',function(ts_files) { // when ready, add to the list, and kickstart the channel if need be
		self.adding = false;
		self.moreTS(p);
		self.startPlaying();
	});
	return p;
}
channel.prototype.clean = function(callback) {
	var self = this;
	exec('rm -rf '+ config.ts_folder + "*",function() {
		console.log('finished clean')
		callback.call(self)
	})
}

module.exports = new channel(function() { this.start(); });