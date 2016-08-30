#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const async = require('async');
const crypto = require('crypto');
const spawncb = require('./spawncb');

var titleDuration = 10000;
const CACHE_DIR = "/var/cache/rpitv-player";

// try to read in configuration from the same directory with the videos
var config = { };

try {
	var fullpath = fs.realpathSync(process.argv[2]);
	var conffile = path.dirname(fullpath) + "/config.json";
	config = JSON.parse(fs.readFileSync(conffile));
} catch (err) {
	console.log(err);
}

if (config.titleDuration) { 
	titleDuration = config.titleDuration; 
}

// read in the JSON data describing the title
var video = JSON.parse(fs.readFileSync(process.argv[2]));

// add on any global titles, if any are defined
if (config.globalTitles) {
	video.titleList = video.titleList.concat(config.globalTitles);
}

// hash each title string so we can find it if it's already rendered
var titlesList = video.titleList.map(function(value) {
	var hash = crypto.createHash('sha256');	
	hash.update(value);
	return {
		label: value, 
		filename: CACHE_DIR + "/" + hash.digest('hex') + '.png' 
	};
});

// start up the video player. we exit when it exits
startVideo(video.url, function() {
	process.exit(0);
});

// render all our titles
async.each(titlesList, renderTitleIfNecessary, onTitlesReady);

// check if the title exists. if so call the callback immediately.
// if not then we try to render the title and call the callback
// when the rendering is done.
function renderTitleIfNecessary(titleData, callback) {
	fs.open(titleData.filename, 'r', function(err, fd) {
		if (err) {
			// cannot read the title, so let's try to render it
			renderTitle(titleData, callback);			
		} else {
			// file exists, all good
			fs.closeSync(fd);
			setImmediate(callback);
		}
	});
}

// render the title by launching an ImageMagick subprocess
function renderTitle(titleData, callback) {
	var convertArgs = [
		'-background', 'black',
		'-fill', 'white',
		'-pointsize', '60',
		'-size', '1680x105',
		'-font', 'Gotham-Black',
		'-gravity', 'center',
		'label:' + titleData.label,
		titleData.filename
	];

	spawncb('convert', convertArgs, callback);
}

function onTitlesReady(err) {
	showTitle(0);
}

function showTitle(titleNumber) {
	// wrap back to zero if we have reached the end of the list
	if (titleNumber >= titlesList.length && titleNumber != 0) {
		setImmediate(showTitle, 0);
		return; 
	}

	const file = titlesList[titleNumber].filename;

	// invoke pngview to display the title
	const pngviewArgs = [
		'-l', '1',
		'-x', '0',
		'-y', '945',
		file		
	];

	const startTime = new Date();	
	const pngview = spawncb('pngview', pngviewArgs, function(err) {
		// if we ran short, don't spawn the next title immediately
		const runTime = (new Date()) - startTime;
		if (runTime < titleDuration / 2) {
			setTimeout(showTitle, 5000 - runTime, titleNumber + 1);
		} else {
			setImmediate(showTitle, titleNumber + 1);
		}

		// no longer need to worry about this process
		process.removeListener('exit', killTitle);
	});

	function killTitle() {
		pngview.kill('SIGINT');
	}

	setTimeout(killTitle, titleDuration);	
	process.on('exit', killTitle);
}

function startVideo(url, callback) {
	const omxplayerArgs = [
		"-c", getVolume().toString(),
		"--win", "0,0,1680,945",
		"--layer", "2",
		url
	];

	const omxplayer = spawncb("omxplayer", omxplayerArgs, callback);
	process.on('exit', function() {
		console.log("trying to kill omxplayer...");
		omxplayer.kill('SIGINT');
	});
}

// use config data and time of day to determine compressor target volume
function getVolume() {
	var quietStart = 22;
	var quietEnd = 8;

	if (config.quietStart) {
		quietStart = config.quietStart;
	}

	if (config.quietEnd) {
		quietEnd = config.quietEnd;
	}

	// helper to return true if we are currently within the quiet hours
	function isQuiet() {
		var hour = (new Date()).getHours();
		if (quietStart > quietEnd) {
			return (hour >= quietStart) || (hour < quietEnd);
		} else {
			return (hour >= quietStart) && (hour < quietEnd);
		}
	}

	if (config.quietVolume) {
		if (isQuiet()) {
			return config.quietVolume;
		} else {
			return config.normalVolume;
		}		
	} else if (config.normalVolume) {
		return config.normalVolume;
	} else {
		// default if no configuration set
		return 5000;
	}
}
