define(["durandal/app", "durandal/events", "models/TaskStatus", "viewmodels/toDoItem/edit"], function (app, Events, taskStatus, EditTask) {
    "use strict";


    var ctor = function () {
        var self = this;
        Events.includeIn(self);
        self.toDoItem = ko.observable();
        self.taskEdit = ko.observable({ name: function () { } });
        var isInEditMode = ko.observable();
        self.isInEditMode = ko.computed(function () {
            return isInEditMode();
        });
        self.edit = edit;
        self.activate = activate;
	    self.remove = remove;

        function activate(activationData) {
            if (activationData == null) {
                return;
            }
            self.toDoItem(activationData.toDoItem);
        }
 	    
		function remove() {
		    self.trigger("task:removed", self.toDoItem);
	    }

        function edit() {
            var editTask = new EditTask();
            editTask.on("task:edit:saved", editSaved);
            editTask.on("task:edit:canceled", editCanceled);
            editTask.activate({
                toDoItem: self.toDoItem()
            });
            self.taskEdit(editTask);
            isInEditMode(true);
        }

        function editSaved(updatedTask) {
            isInEditMode(false);
        }

        function editCanceled() {
            self.taskEdit({
                name: function () {
                }
            });
            isInEditMode(false);
        }
    };
    return ctor;
});
