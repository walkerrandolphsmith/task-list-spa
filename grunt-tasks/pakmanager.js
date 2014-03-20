module.exports = function (grunt) {
	"use strict";

	grunt.registerMultiTask('pakmanager', function(){
		var files = this.files;

		function pakmange(f) {
			var source = f.src
			, destination = f.dest;

			grunt.util.spawn(
			{
				"cmd": "pakmanager"
				, args: [
				"-e"
				, this.target
				, "build"
				, source
				, destination
				]

			}
			, this.async()
		);
	}

	files.forEach(pakmange, this);
	});
};