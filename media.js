var media,
	events = require('events'),
	glob = require('glob'),
	util = require('util'),
	async = require('async'),
	ProgressBar = require('progress'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn,

media = function(srcFile) {
	this.src = srcFile;
	this.duration = 0;
	this.encoded = false;
	this.segments = [];
	this.index = null;
	return this;
}
util.inherits(media, events.EventEmitter);

media.prototype.end = function () {
	var self = this;
	console.log(this.src + " [ending]")
	this.encoded = false;
	setTimeout(function() {
		console.log(self.src + " [deleting]")
		exec('rm -rf ./tmp/'+ self.ts_prefix()+'*');		
	}, 20 * 1000)
	this.emit('ended')
}
media.prototype.play = function() {
	var self = this;
	console.log(this.src + " [playing]");
	this.emit('play');
}
media.prototype.ready = function(cb) {
	if (this.encoded === true) {
		cb.call(this);
	} else {
		this.once('ready', function() {
			cb.call(this);
		})
	}
	return this;
}
media.prototype.ts_prefix = function() {
	return this.index + '-';
}
media.prototype.avconv_flags = function() {
	return [
		"-i", "./"+this.src, 
		"-codec","copy",
		"-hls_time","10",
		"-bsf","h264_mp4toannexb",
		"tmp/" + this.ts_prefix() + '.m3u8'
	];
}
media.prototype.probe = function() {

}
media.prototype.addSegments = function() {
	var self = this,
		total_files = 0,
		current_files = 1,
		bar;
	// crude way of retrieving the ts files
	glob("tmp/"+this.ts_prefix()+"*.ts", {}, function (er, files) {

		total_files = files.length;
		bar = new ProgressBar(self.src + ' [analyzing segments :bar]', { total: total_files });

		async.eachSeries(files, function doProbe(file, next) {
			var prb = spawn('avprobe', [
				'-of','json',
				'-show_streams','-show_format',
				'-loglevel','panic',
				file
			]);
			prb.stdout.on('data', function(d) {
				var parsed_result;
				try {
					parsed_result = JSON.parse(d.toString());
					if (parsed_result.streams && parsed_result.streams[0]) {
						self.segments.push({
							file : file,
							duration : parsed_result.streams[0].duration
						})
					}
				} catch (e) {

				}
				// console.log(self.src + " [segment "+current_files+" of "+total_files+"]")
				current_files++;
				bar.tick();
				next();
			});
			prb.on('close', function(probe_result) {
				if (probe_result === 1) next();
			});
		}, function finishedProbe() {
			console.log(self.src + " [gathered segments]")
			if (self.segments.length > 0) {
				self.segments.sort(function(a,b) { // account for the stupid single/double digit integer sort
					var n1 = parseInt(a.file.replace('tmp/'+self.ts_prefix(),'').replace('.ts','')),
						n2 = parseInt(b.file.replace('tmp/'+self.ts_prefix(),'').replace('.ts',''));
					return n1-n2;
				})
				self.segments[self.segments.length - 1].last_segment = true;
			}
			self.encoded = true;
			self.emit('ready');
		})
	});
}
media.prototype.encode = function() {
	var self = this,
		total_seconds = 0,
		total_frames,
		frames_per_second = 25,
		last_length = 0,
		hours = 0, minutes = 0, seconds = 0,
		convert,
		progress;
	console.log(self.src + " [enqueuing]")
	if (self.encoded === true) {
		self.emit('ready');
	} else {
		convert = spawn('avconv', this.avconv_flags());
		convert.stderr.on('data', function(data) {
			var s = data.toString().replace(/\[0;39m/g,'').replace(/\[0m/g,'').replace(/\u001b/g,''),  // ctrl chars?
				dur = /Duration: ([\.:0-9]+)/g.exec(s),
				fps = /, ([0-9]+) fps,/.exec(s),
				frame = /frame=([ 0-9]+)/.exec(s);

			if (dur) {
				dur = dur[1].split(":");
				hours = parseInt(dur[0]), minutes = parseInt(dur[1]), seconds = parseFloat(dur[2]);
				total_seconds = (hours * 60 * 60) + (minutes*60) + seconds;
			}
			if (fps) { // fps always follows duration?
				frames_per_second = parseInt(fps[1]);
				total_frames = total_seconds * frames_per_second;
				progress = new ProgressBar(self.src + ' [encoding :bar]', { total: total_frames });
			}
			if (total_frames) {
				if (frame) {
					frame = parseInt(frame[1]);
					progress.tick(frame - last_length);
					last_length = frame;
				}
			}
		});
		convert.on('close', function(err) {
			self.addSegments();
		});
	}
	return this;
}

module.exports = media;