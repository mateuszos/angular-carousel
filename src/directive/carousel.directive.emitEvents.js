(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .directive('ctCarouselEmitEvents', ctCarouselEmitEvents);

        function ctCarouselEmitEvents() {
          	return {
          	    restrict: 'A',
          	    link: function(scope, element, attrs){
            		if (scope.$first || scope.$last){
            		    scope.$emit('ctRepeatReady', element);
            		}
          	    }
          	};
        }
})();
