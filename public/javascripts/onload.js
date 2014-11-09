var v;
window.onload = function() {
	var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/i) ? true : false ),
		vid = document.querySelector('#video'),
		can_hls = (vid.canPlayType('application/vnd.apple.mpegURL').length > 0),
		cl = vid.classList;

	if (can_hls === false) { // try flash
		cl.add('video-js')
		cl.add('vjs-default-skin')
		v = videojs("video", {
				"techOrder": ["flash"]
			})
			.on('loadedmetadata',function() {
				console.log("READY?")
				v.play();		
			});
	} else {
		vid.play();
	}

	if (iOS === true) { // work around lack of autoplay on mobile
		document.body.className += " ios";
		document.getElementById("play").onclick = function() {
			var vid = document.querySelector("video");
			vid.play();
			vid.webkitEnterFullscreen();
			document.body.className = "loaded";
		}
	} else {
		setTimeout(function() {
			document.body.className += " loaded";
		},0);
	}
}