#!/usr/bin/env node

const glob = require("glob");
const fs = require("fs");
const spawncb = require("./spawncb");
const child_process = require('child_process');

// main.js
// Look for all .json files in /etc/rpitv-player and play them in order.
// If live.json exists, use that instead.

const PLAYLIST_DIR="/etc/rpitv-player";
const LIVE_FILE = PLAYLIST_DIR + "/live.json";

// try to set the console to black text on black background
// warning: this will leave tty1 in a messed-up state
child_process.spawn('rpitv-disable-tty1');

// list out all the json files (except live.json if present)
glob(PLAYLIST_DIR + "/!(live|config).json", function(err, files) {
	setImmediate(playNext, files, 0);
});

function playNext(playlist, index) {
	// check if live.json exists and is readable
	fs.open(LIVE_FILE, "r", function(err, file) {
		if (err) {
			// file doesn't exist
			setImmediate(playVideo, playlist, index);
		} else {
			// file exists
			fs.closeSync(file);
			setImmediate(playVideo, playlist, index, true);
		}
	});
}

function playVideo(playlist, index, live) {
	var fn;

	if (live) {
		fn = LIVE_FILE;
	} else {
		fn = playlist[index];
	}

	function next(err) {
		if (err) {
			console.log("playVideo: error: %s", err);
		}
		playNext(playlist, (index + 1) % playlist.length);
	}

	// start play_video.js in a child process
	// when it's finished invoke playNext
	spawncb("rpitv-player-video", [fn], next);
}
