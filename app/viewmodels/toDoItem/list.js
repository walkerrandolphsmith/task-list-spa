define([
       "durandal/app",
		"models/TaskStatus",
		"viewmodels/toDoItem/toDoItem",
        "viewmodels/toDoItem/summary",
        "viewmodels/toDoItem/new"
], function (
        app,
		TaskStatus,
		ToDoItem,
        ToDoItemSummary,
        CreateToDoItem
) {
    "use strict";

    var ctor = function () {
    	var self = this;
	    self.status = ko.observable('all');
        self.items = ko.observableArray();
        self.newTask = ko.observable();
	   
	    self.numberOfTasks = ko.computed(function() {
	    	if (self.status() == 'all') {
	    		return self.items().length;
	    	} else {
	    		return self.items().filter(function (task) {
	    			return task.toDoItem().status() == self.status();
	    		}).length;
	    	}
	    });

	    self.filteredItems = ko.computed(function() {
		    if (self.status() == 'all') {
			    return self.items();
		    } else {
			    return self.items().filter(function(task) {
				    return task.toDoItem().status() == self.status();
			    });
		    }
	    });
	    

	    self.getItems = function (status) {
			if (status === 'all') {
				return self.items();
			}else return ko.utils.arrayFilter(self.items(), function (item) {
	    		var st = item.toDoItem().status();
	    		return (st === status);
	    	});
	    };
	    
	    self.getNumberOfItems = function (status) {
	    	if (status === 'all') {
	    		return self.items().length;
	    	} else return ko.utils.arrayFilter(self.items(), function (item) {
	    		var st = item.toDoItem().status();
	    		return (st === status);
	    	}).length;
	    };
	    
	    createNewTask();
        self.addTask = addTask;
        self.activate = activate;
	  
        function activate(activationData) {
            if (activationData == null) {
                return;
            }
            self.items(activationData.items);
        }

        function addTask(task) {
            if (task == null) {
                return;
            }
            var newTask = new ToDoItemSummary();
            newTask.activate({ toDoItem: task });
	        self.items.push(newTask);
	        createNewTask();
	        newTask.on("task:removed", removeTask);
        }

        function createNewTask() {
            var newTask = new CreateToDoItem();
            var newToDoItem = new ToDoItem();
            newToDoItem.activate({
	            status: TaskStatus.unstarted.label
            });
	        newTask.activate({
		        toDoItem: newToDoItem
	        });
	        self.newTask(newTask);
	        newTask.on("task:new:saved", addTask);
        }
	    
        function removeTask(task) {
	        var taskToRemove = ko.utils.arrayFilter(self.items(), function(item) {
				return (item.toDoItem === task);
	        })[0];
	        
			self.items.remove(taskToRemove);
        }

	    self.filterAll = function() {
		    self.status('all');
	    };
	    self.filterUnstarted = function() {
		    self.status(TaskStatus.unstarted.label);
	    };
	    self.filterStarted = function() {
		    self.status(TaskStatus.started.label);
	    };
	    self.filterComplete = function() {
		    self.status(TaskStatus.complete.label);
	    };
    };
    return ctor;
});
