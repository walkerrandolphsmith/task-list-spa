define([	
    ], function() {
        "use strict";

        var ctor = function() {
            var self = this;
            self.heading = ko.observable();
            self.body = ko.observable();
            self.activate = activate;
            
            function activate(activationData) {
                self.heading(activationData.heading);
                self.body(activationData.body);
            }
        };

        return ctor;
    });