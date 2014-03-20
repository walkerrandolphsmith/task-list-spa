define([
        "knockout",
        "durandal/events"
], function (
        ko,
        Events
    ) {
	"use strict";
	
	ko.bindingHandlers.enterKey = {
		init: function (element, valueAccessor) {
			var value = valueAccessor();
			$(element).keypress(function (event) {
				var keyCode = (event.which ? event.which : event.keyCode);
				if (keyCode === 13) {
					value.call(ko.dataFor(this));
					return false;
				}
				return true;
			});
		}
	};
	
    var ctor = function () {
        var self = this;
        Events.includeIn(self);
	    self.toDoItem = ko.observable();
        self.activate = function (activationData) {
            if (activationData == null) {
                return;
            }
            self.toDoItem(activationData.toDoItem);
        };
        self.canDeactivate = function () {
            return true;
        };
	    self.save = function() {
		    self.trigger("task:new:saved", self.toDoItem());
	    };
    };
    ko.applyBindings(self);
    return ctor;
});
