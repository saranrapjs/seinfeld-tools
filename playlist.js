var config = require('./config'),
	events = require('events'),
	util = require('util'),
	glob = require('glob'),
	fs = require('fs'),
	logger = require('./logger'),
	spawn = require('child_process').spawn;

var playlist = function(srcPath) {
	var self = this;
	this.list = [];
	this.source = srcPath;
	this.filename = this.source.replace(/^.*[\\\/]/, '');
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
	return [
		'-i', this.source,
		'-y',
		'-vcodec', 'copy',
		'-acodec', 'copy',
		'-bsf', 'h264_mp4toannexb',
		config.tmp+'out.ts'
	]
}
playlist.prototype.ffmpeg = function() {
	return [
		'-i', this.source,
		'-y',
		'-vcodec', 'copy',
		'-acodec', 'copy',
		'-map', '0',
		'-map', '-0:s',
		'-vbsf', 'h264_mp4toannexb',
		config.tmp+'out.ts'
	]
}
playlist.prototype.split = function() {
	var self = this,
		splitter = spawn('m3u8-segmenter', [
			'-i', config.tmp+'out.ts',
			'-d', this.duration,
			'-p', this.tsPrefix(),
			'-m', config.tmp + "output.m3u8",
			'-u', '""'
		]).on('exit', function() {
			logger.info('finish m3u8 split')
			self.gatherTS();
		})
	logger.info('begin m3u8 split')
}
playlist.prototype.convert = function() {
	var args = (this.converter === 'ffmpeg') ? this.ffmpeg() : this.avconv(),
		self = this;
	logger.info('conversion started')
	// logger.info('running command: %s', command)
	var conversion = spawn(this.converter, args);
	conversion.stderr.on('data', function(data) {
		// var time = data.toString().match(/time=[0-9:]+/g);
		var text = data.toString(),
			time = text.match(/time=[0-9:]+/g)
		if (time && time.length) {
			logger.info('conversion progress: ' + time[0])
		}
    });
	conversion.on('exit', function() {
		logger.info("conversion finished")
		self.split()
	});
	return this;
}

module.exports = playlist;
