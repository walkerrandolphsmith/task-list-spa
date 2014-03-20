define([
], function () {
    "use strict";

    var id = 0;

    var obj = {
        generate: function () {
            var output = id;
            id++;
            return output;
        }
    };

    return obj;
});