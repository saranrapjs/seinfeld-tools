var config = require('./config'),
	events = require('events'),
	util = require('util'),
	glob = require('glob'),
	fs = require('fs'),
	logger = require('./logger'),
	exec = require('child_process').exec;

var playlist = function(srcPath) {
	var self = this;
	this.list = [];
	this.source = srcPath;
	this.id = this.source.replace(/[^a-z0-9]/gi,'') + (new Date).getTime();
}
util.inherits(playlist, events.EventEmitter);

playlist.prototype.duration = config.duration;
playlist.prototype.progress = function() {
	return ((this.sequenceStart - this.startingPosition) / this.endingPosition());
}
playlist.prototype.halfway = false;
playlist.prototype.gatherTS = function() {
	var self = this;
	logger.info('gathering available ts files')
	glob(this.tsPrefix()+"*.ts", null, function (err, matches) { // possibly stupid to go this way
	    matches.forEach(function (match) {
	    	self.list.push({filename:match});
	    });
		logger.info('ts files gathered: '+self.list.length+' total')
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
playlist.prototype.converter = config.converter || 'ffmpeg';
playlist.prototype.segment = function() {
	return (this.converter === 'ffmpeg') ? this.ffmpeg() : this.avconv();
}
playlist.prototype.avconv = function() {
	return util.format('avconv -i "%s" -vcodec copy -acodec copy -bsf h264_mp4toannexb "%sout.ts" | \
		m3u8-segmenter -i - -d %s -p %s -m %soutput.m3u8 -u ""',
	this.source,
	config.tmp,
	this.duration,
	this.tsPrefix(),
	config.tmp);
}
playlist.prototype.ffmpeg = function() {
	var ts = config.tmp+'out.ts';
	return util.format('ffmpeg -i "%s" -y -vcodec copy -acodec copy -map 0 -map -0:s -vbsf h264_mp4toannexb %s; \
		m3u8-segmenter -i %s -d %s -p %s -m "%soutput.m3u8" -u "";',
	this.source,
	ts,
	ts,
	this.duration,
	this.tsPrefix(),
	config.tmp);
}
playlist.prototype.convert = function() {
	var command = this.segment(),
		self = this;
	logger.info('conversion started')
	logger.info('running command: %s', command)
	exec(command,function(error, stdout, stderr) {
		if (error) {
			logger.error('error: '+error)
		}
		logger.info('conversion finished')
		self.gatherTS();
	})
	return this;
}

module.exports = playlist;
