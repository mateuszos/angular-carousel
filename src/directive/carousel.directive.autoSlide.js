(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .directive('ctCarouselAutoSlide', ctCarouselAutoSlide);

        function ctCarouselAutoSlide($interval) {
          return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var stopAutoPlay = function() {
                    if (scope.autoSlider) {
                        $interval.cancel(scope.autoSlider);
                        scope.autoSlider = null;
                    }
                };
                var restartTimer = function() {
                    scope.autoSlide();
                };

                scope.$watch('carouselIndex', restartTimer);

                if (attrs.hasOwnProperty('ctCarouselPauseOnHover')){
                    element.on('mouseenter', stopAutoPlay);
                    element.on('mouseleave', restartTimer);
                }

                scope.$on('$destroy', function(){
                    stopAutoPlay();
                    element.off('mouseenter', stopAutoPlay);
                    element.off('mouseleave', restartTimer);
                });
            }
          };
        };
})();
