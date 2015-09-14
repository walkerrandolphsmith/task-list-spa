define([
        "knockout",
        "durandal/app",
        "viewmodels/toDoItem/list",
		    "viewmodels/toDoItem/cube"
], function (
        ko,
        app,
        ToDoItems,
		    tasksCube
    ) {
	"use strict";

	var isList = ko.observable("list");
	var obj = {
		tasksDueToday: new ToDoItems(),
		tasksDueTomorrow: new ToDoItems(),
		tasksCube: new tasksCube(),
		isList: ko.computed(function () {
			return isList() == "list";
		})
};

    obj.activate = function () {
        
    };

	obj.list = function() {
		isList("list");
	};

	obj.cube = function () {
		isList("cube");
	};

    return obj;
});
