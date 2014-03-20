define([
        "durandal/app",
        "viewmodels/toDoItem/new"
], function (
        app,
        newTask
) {
    "use strict";

    var ctor = function () {
        var self = this;
        self.newTask = createNewTask;

        function createNewTask() {
            app.trigger("task:new");
        }
    };

    return ctor;
});
