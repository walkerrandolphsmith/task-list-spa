define([
        "knockout",
        "durandal/events"
], function (
        ko,
        Events
    ) {
    "use strict";

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
        self.save = function() {
            self.trigger("task:edit:saved", self.toDoItem);
        };
    };

    return ctor;
});
