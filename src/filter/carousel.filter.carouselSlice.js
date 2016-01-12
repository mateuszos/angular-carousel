(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .filter('carouselSlice', carouselSliceFilter);

        function carouselSliceFilter() {
            return function(collection, start, size) {
                if (angular.isArray(collection)) {
                    return collection.slice(start, start + size);
                } else if (angular.isObject(collection)) {
                    // dont try to slice collections :)
                    return collection;
                }
            };
        }
})();
