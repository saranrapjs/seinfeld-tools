var events = require('events'),
	media = require('./media.js'),
	fs = require('fs'),
	exec = require('child_process').exec,
	util = require('util'),
	playlist;

playlist = function() {

	this.temp_directory = './tmp';

	this.sequence = 0;
	this.segments_until_next = 0;
	this.target_duration = 10;
	this.window_length = 10;


	this.media = [];
	this.paths = {};

	this.queue = [];
	this.segments = [];

	this.begun = false;

}
util.inherits(playlist, events.EventEmitter);

playlist.prototype.addMedia = function(path) {
	var m,
		index;
	if (typeof this.paths[path] === 'undefined') {
		m = new media(path);
		index = this.media.push(m)
		m.index = this.paths[path] = index;
	} else {
		index = this.paths[path];
	}
	return this.media[index];
}
playlist.prototype.getRandomMedia = function() {
	var random_N = Math.floor(Math.random()*this.media.length);
	return (this.queue.indexOf(random_N) === -1) ? random_N : this.getRandomMedia();
}
playlist.prototype.enqueueOne = function(cb) {
	var self = this,
		media_n = this.getRandomMedia(),
		media = this.media[media_n];
	if (this.queue.length > 3) return this;
	this.queue.push(media_n);
	return media
		.once('play', function() {
			self.enqueueOne();
		})
		.once('ready', function() {
			for (var i = 0; i < this.segments.length; i++) {
				self.segments.push({
					owner : media_n,
					segment : media.segments[i]
				});
			};			
		})
		.once('ended', function() {
			self.playNext();
		})
		.encode();
}
playlist.prototype.playNext = function(cb) {
	var media_n, media, self = this;
	if (this.begun === true) {
		this.queue.shift();		
	}
	media_n = this.queue[0];
	media = this.media[media_n];
	console.log("queue length of " + this.queue.length + " [seinfeld-tools]")
	media.ready(function() {
		self.segments_until_next = media.segments.length;
		media.play();
		if (self.begun === false) {
			self.beginHeartbeat();
		}
		if (cb) cb.call(self);
	})
}
playlist.prototype.formattedSegments = function() {
	return this.segments.slice(0, this.window_length);
}
playlist.prototype.currentlyPlaying = function() {
	return this.media[this.queue[0]];
}
playlist.prototype.heartbeat = function() {
	var old_segment,
		new_segment,
		self = this;
	if (this.segments.length >= 1) {
		self.sequence++;
		self.segments_until_next--;
		old_segment = this.segments.shift();
		new_segment = this.segments[0];
		if (this.segments.length < 1 || old_segment.owner !== new_segment.owner) {
			this.media[old_segment.owner].end();
		}
		if (new_segment) {
			setTimeout(function() {
				self.heartbeat();
			}, new_segment.segment.duration * 1000)
			console.log('next ❤ in ' + new_segment.segment.duration + ' seconds, '+this.segments_until_next+ ' remaining of current episode')
		}
	}
}
playlist.prototype.beginHeartbeat = function() {
	var self = this;
	console.log("beginning heartbeat [seinfeld-tools]")
	this.emit('started')
	this.begun = true;
	setTimeout(function() {
		self.heartbeat();		
	}, this.segments[0].segment.duration * 1000);
	console.log('next ❤ in ' + this.segments[0].segment.duration + ' seconds')
}
playlist.prototype.start = function() {
	var self = this;
	if (this.media.length) {
		console.log("begin ts folder cleanup [seinfeld-tools]")
		exec('rm -rf ./tmp/*', function() {
			console.log("cleanup complete [seinfeld-tools]")
			self.enqueueOne();
			self.playNext();
		});
	}
	return this;
}

module.exports = playlist;