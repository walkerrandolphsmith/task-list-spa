define(["viewmodels/toDoItem/list"], function (ToDoItems) {
	"use strict";

	(function() {
		var props = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' '),
			prop,
			el = document.createElement('div');

		for (var i = 0, l = props.length; i < l; i++) {
			if (typeof el.style[props[i]] !== "undefined") {
				prop = props[i];
				break;
			}
		}
		
		var xAngle = 0, yAngle = 0;
		$('body').keydown(function (e) {
			switch (e.keyCode) {
				case 37:
					yAngle -= 90;
					break;
				case 39:
					yAngle += 90;
					break;
			};
			/*var $this = $('#experiment');
			$this.on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', function () {
			});*/
			document.getElementById('cube').style[prop] = "rotateX(" + xAngle + "deg) rotateY(" + yAngle + "deg)";
		});
	})();

	var ctor = function () {
		
		var self = this;
		self.tasksDueToday = new ToDoItems(),
		self.activate = activate;

		function activate(activationData) {
			if (activationData == null) {
				return;
			}
		}
		
	};
	return ctor;
});
