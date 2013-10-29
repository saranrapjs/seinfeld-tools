var config = require('./config'),
	events = require('events'),
	util = require('util'),
	glob = require('glob'),
	fs = require('fs'),
	exec = require('child_process').exec;

var playlist = function(srcPath) {
	var self = this;
	this.list = [];
	this.source = srcPath;
	this.id = this.source.replace(/[^a-z0-9]/gi,'') + (new Date).getTime();
	this.convert(this.source);
}
util.inherits(playlist, events.EventEmitter);

playlist.prototype.duration = config.duration;
playlist.prototype.progress = function() {
	return ((this.sequenceStart - this.startingPosition) / this.endingPosition());
}
playlist.prototype.halfway = false;
playlist.prototype.gatherTS = function() {
	var self = this;
	console.log('begin gather')
	glob(this.tsPrefix()+"*.ts", null, function (err, matches) { // possibly stupid to go this way
	    matches.forEach(function (match) {
	    	self.list.push({filename:match});
	    });
	console.log('end gather')
	    self.finish();
	})
}
playlist.prototype.finish = function() {
	var self = this;
	this.list.sort(function(a,b) { // account for the stupid single/double digit integer sort
		var n1 = parseInt(a.filename.replace(self.tsPrefix()+'-','').replace('.ts','')),
			n2 = parseInt(b.filename.replace(self.tsPrefix()+'-','').replace('.ts',''));
		return n1-n2;
	})
	//this.list.splice(15)
	this.emit('ready',this.list)
}
playlist.prototype.tsPrefix = function() {
	return config.ts_folder+this.id;
}
playlist.prototype.cleanup = function() {
	this.list.forEach(function(val) {
		fs.unlink(val.filename);
	})
}
playlist.prototype.convert = function(path) {
	var command = config.segment(path,this.tsPrefix()),
		self = this;
	console.log('begin add')
	exec(command,function(error, stdout, stderr) {
		if (error) {
			console.log('error'+error)
		}
		console.log('end add')
		self.gatherTS();
	})
}

module.exports = playlist;
