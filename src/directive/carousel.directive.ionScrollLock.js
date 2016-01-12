(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .directive('ctCarouselIonScrollLock', ctCarouselIonScrollLock);

        function ctCarouselIonScrollLock($ionicScrollDelegate) {
            return {
                restrict: 'A',
                compile: function(tElement) {
                    tElement.on('dragleft dragright', function(event) {
                        $ionicScrollDelegate.getScrollView().options.scrollingY = false;
                    });
                    tElement.on('dragup dragdown', function(event) {
                        $ionicScrollDelegate.getScrollView().options.scrollingY = true;
                    });
                }
            };
        };

})();
