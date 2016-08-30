# rpitv-player
Rotate a bunch of videos and titles.
Uses omxplayer and pngview on Raspberry Pi.

## Installation
* Install node.js and npm. If installing npm from Debian, upgrade npm:
  `sudo npm install -g npm`
* Make sure you have `omxplayer`, `pngview`, and ImageMagick's `convert`
  installed somewhere on your PATH.
** See other RPITV repositories at github for patched versions of `omxplayer`
   and `pngview`.
* From this directory, `sudo npm link` (someday... `sudo npm install rpitv-player`?)
* Install `rpitv-disable-tty1`: `sudo install -m 755 rpitv-disable-tty1 /usr/local/bin`
** this is used to disable the cursor and clear the terminal before videos are shown
** make sure that the user account that `rpitv-player` will run under has permission
   to run this via `sudo` with no password
* Create a couple directories:
** `sudo mkdir /etc/rpitv-player /var/cache/rpitv-player`
** `sudo chown yourUser:yourGroup /etc/rpitv-player /var/cache/rpitv-player`
* Install systemd service:
** `sudo cp rpitv-player.service /etc/systemd/system`
** `sudo systemctl daemon-reload`
** `sudo systemctl enable rpitv-player.service`
* Create some JSON files in /etc/rpitv-player before proceeding further (see below)
* Start service:
** `sudo service rpitv-player start`

## Playlist/Configuration
The rpitv-player script looks for .json files in `/etc/rpitv-player`. There are 
two "special" files: `live.json` (which takes precedence over all other videos)
and `config.json` (which defines some global parameters). Besides its precedence 
there is nothing else special about `live.json`. More on `config.json` below.

The JSON files look like this:
```
{
	"url": "rtmp://video1.rpitv.org:1935/rpitv-vod/20140322_domino_squad_dcc-4400.mp4",
	"titleList": [
		"The Domino Squad (2014)",
		"See this again at rpitv.org/p/684"
	]
}
```

They define a URL (passed verbatim to `omxplayer`), and a list of title strings to overlay.
The global title list from `config.json` is appended to the title list and the resulting
list of titles is shown in sequence. Each title is shown for a time of 10 seconds unless
this is overridden in `config.json`.

`config.json` looks like this:
```
{
	"titleDuration": 10000,
	"globalTitles" : [
		"Join us! Meetings Tuesdays 9pm Union 3202",
		"More free content at rpitv.org",
		"Want us to cover your event? rpitv@union.rpi.edu"
	]
}
```

where `globalTitles` is appended to each video's `titleList`, and `titleDuration` is the
time for which each title is shown before proceeding to the next (in milliseconds).

When creating or removing JSON files, follow up with a `sudo service rpitv-player restart`.
The script caches the list of files so it's necessary to do this before changes will be seen.
As an exception, `live.json` will be picked up at the end of each video.

## Volume Control
It's possible to control the volume based on the time of day with a config.json like the 
following (setting quietStart, quietEnd, and quietVolume). This lowers the volume between
22:00 and 08:00 the following day:

```
{
	"normalVolume" : 5000,
	"quietVolume" : 2000,
	"quietStart": 22,
	"quietEnd": 8,
	"globalTitles" : [
		"Join us! Meetings Tuesdays 9pm Union 3202",
		"More free content at rpitv.org",
		"Want us to cover your event? rpitv@union.rpi.edu",
		"Follow us on Twitter @rpitv"
	]
}
```
