
/*
 * GET home page.
 */

exports.index = function(req, res, channel) {
  res.render('index', { title: 'Express' })
};


/*
 * GET m3u8 playlist
 */

exports.m3u8 = function(req, res, channel) {
	res.header('Content-Type','text/plain');
	res.render('m3u8', channel )
};