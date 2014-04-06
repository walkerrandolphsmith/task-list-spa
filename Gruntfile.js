module.exports = function(grunt){
	"use strict";

	grunt.initConfig({
		"less": {
			dev: {
				files: [
                {
                    "app/concat.css": "app/content/less/styles.less"
                }
                 ]
			},
		    dist: {
				files: { "styles.min.css": "styles.less" },
				options: { yuicompress: true }
			}
		},
		"jade": {
			dev: {
				files: {"app/index.html" : "app/index.jade" }
			},
			dist: {
	  			files: {"app/index.html": "app/index.jade" }
	  		}
		},
		"markdown": {
			all: {
				files: [
				{
					expand: true,
					src: 'app/_posts/*.md',
					dest: 'app/posts/',
					ext: '.html'
				}
				]
			}
		},
		"concat": {
  			js: {
    			src: ['app/scripts/jquery-1.9.1.js', 'app/scripts/bootstrap.js', 'app/scripts.knockout-2.3.0.js', 'app/jquery.backstretch.js'],
    			dest: 'app/concat.js'
  			},
  			css: {
    			src: 'app/content/**/*.css',
    			dest: 'app/concat.css'
  			}
		},
		"pakmanager": {
			browser: {
				files: { "pakmanaged.js": "concat.js" }
			},
			node: {
		  		files: {"pakmanaged.js": "concat.js" }
		  }
		},
		"uglify": {
			files: { "pakmanaged.min.js": "pakmanaged.js" }
		},
		"connect": {
	       	server: {
       			options: {
       				port: 4000,
       				base: 'app',
       				hostname: '*'
       			}
       		}
    	},
    	"watch": {
    		stylesheets: {
    			files: 'app/content/*.less',
    			tasks: 'less'
    		},
    		jade: {
    			files: 'app/*.jade',
    			tasks: 'jade'
    		},
    		specs:{
    			files: ['app.spec/spec/**/*.js', 'app/viewmodels/**/*.js', 'app.spec/SpecRunner.js'],
    			tasks: 'exec'
    		}
    	},
        "exec": {
     		 jasmine: {
        		command: 'C:\\Users\\Walker\\Repositories\\grunt-basics\\node_modules\\grunt-contrib-jasmine\\node_modules\\grunt-lib-phantomjs\\node_modules\\phantomjs\\lib\\phantom\\phantomjs.exe app.spec/lib/run-jasmine.js http://localhost:4000/test',
        		stdout: true
      		}
    	}
});
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-markdown');
	grunt.loadTasks('grunt-tasks/');
	//Alias Task grunt.registerTask(taskName, [description, ] taskList)
	grunt.registerTask('build', ['jade:dev', 'markdown', 'less:dev', 'concat', 'pakmanager', 'uglify']);
    grunt.registerTask('test', ['connect:server', 'exec', 'watch']);

    grunt.registerTask('default', ['connect:server', 'watch']);
};