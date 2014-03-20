define([
      'plugins/router',
      'durandal/app'
],
    function (
        router,
        app
    ) {
        "use strict";

        $.backstretch("/content/images/background.jpg");

        var obj = {
            router: router,
            activate: function () {
                router.map([
                    { route: '', title: 'To Do Home', moduleId: 'viewmodels/home', nav: true },
                    { route: 'flickr', moduleId: 'viewmodels/flickr', nav: true }
                ]).buildNavigationModel();

                return router.activate();
            }
        };

        return obj;
    });