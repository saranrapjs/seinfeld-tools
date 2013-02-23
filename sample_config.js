var config = {}
config.tmp = "tmp/";
config.videos = "video/";
config.duration = 10;
config.ts_folder = "ts/";
config.timeWindow = 10;
// config.segment = function(inFile,outPrefix){
// 	var exec = 'avconv -i ' + inFile + ' -vcodec copy -acodec copy -bsf h264_mp4toannexb '+this.tmp+'out.ts ';
// 	exec += '| m3u8-segmenter -i - -d 10 -p '+outPrefix+' -m '+this.tmp+'output.m3u8 -u ""';
// 	return exec;
// }
config.segment = function(inFile,outPrefix){
	var ts = this.tmp+'out.ts';
	var exec = 'ffmpeg -i "' + inFile + '" -y -vcodec copy -acodec copy -map 0 -map -0:s -vbsf h264_mp4toannexb '+ts;
	exec += '; m3u8-segmenter -i '+ts+' -d '+this.duration+' -p '+outPrefix+' -m '+this.tmp+'output.m3u8 -u ""';
	return exec;
}
module.exports = config;