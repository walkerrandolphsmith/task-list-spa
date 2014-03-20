define([
        "knockout",
        "durandal/app",
        "viewmodels/modalMessage",
        "viewmodels/toDoItem/list",
		"viewmodels/toDoItem/cube"
], function (
        ko,
        app,
        ModalMessage,
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
        var readMe = new ModalMessage();
        app.showDialog(readMe, {
            heading: "Read Me",
            body: "Read me body"
        });
    };

	obj.list = function() {
		isList("list");
	};
	
	obj.cube = function () {
		isList("cube");
	};

    return obj;
});
