define([
        "knockout",
        "durandal/app",
		"models/TaskStatus"
], function (
        ko,
        app,
		taskStatus
    ) {
    "use strict";

    var ctor = function () {
        var self = this;
        self.id = null;
	    
        self.name = ko.observable();
        self.status = ko.observable();
	    
        self.statusCss = ko.computed(function () {
        	if (self.status() === taskStatus.unstarted.label) {
        		return "alert-info";
        	} else if (self.status() === taskStatus.started.label) {
        		return "alert-danger";
        	} else if (self.status() === taskStatus.complete.label) {
        		return "alert-success";
        	} else {
        		return "";
        	}
        });

	    self.activate = function(activationData) {
	    	self.id = activationData.id;
	    	self.name(activationData.name);
		    self.status(activationData.status);
	    };
    };

    return ctor;
});