(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .factory('GetDeviceFeatures', function() {

            return {
                has3d: detect3dSupport(),
                transformProperty: detectTransformProperty()
            };

            // detect supported CSS property
            function detectTransformProperty() {
                var transformProperty = 'transform';
                if (typeof document.body.style[transformProperty] !== 'undefined') {
                    ['webkit', 'moz', 'o', 'ms'].every(function (prefix) {
                        var e = '-' + prefix + '-transform';
                        if (typeof document.body.style[e] !== 'undefined') {
                            transformProperty = e;
                            return false;
                        }
                        return true;
                    });
                } else {
                    transformProperty = undefined;
                }
                return transformProperty;
            }

            //Detect support of translate3d
            function detect3dSupport() {
                var el = document.createElement('p'),
                    has3d,
                    transforms = {
                        'webkitTransform': '-webkit-transform',
                        'msTransform': '-ms-transform',
                        'transform': 'transform'
                    };
                // Add it to the body to get the computed style
                document.body.insertBefore(el, null);
                for (var t in transforms) {
                    if (el.style[t] !== undefined) {
                        el.style[t] = 'translate3d(1px,1px,1px)';
                        has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
                    }
                }
                document.body.removeChild(el);
                return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
            }

        });
})();
