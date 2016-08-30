const child_process = require('child_process');

module.exports = function spawncb(cmd, args, callback) {
	const child = child_process.spawn(cmd, args, { stdio: 'ignore' });
	child.on('close', function(code) {
		if (code == 0) {
			callback();
		} else {
			console.log("%s: exited with code %d", cmd, code);
			console.log(args);
			callback(code);
		}
	});

	child.on('error', function(err) {
		console.log("%s: error (%s)", cmd, err);
		callback(err);
	});

	return child;
}

