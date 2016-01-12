(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .factory('ApplyTransformations', ApplyTransformations);

        function ApplyTransformations(GetDeviceFeatures) {
            
            return {
                createStyleAttributeValue: createStyleAttributeValue,
                createAnimationStyle: createAnimationStyle
            };

            function createStyleAttributeValue(object) {
                var styles = [];
                angular.forEach(object, function(value, key) {
                    styles.push(key + ':' + value);
                });
                return styles.join(';');
            };

            function createAnimationStyle(slideIndex, offset, transitionType) {
                var style = {
                        display: 'inline-block'
                    },
                    opacity,
                    absoluteLeft = (slideIndex * 100) + offset,
                    slideTransformValue = GetDeviceFeatures.has3d ? 'translate3d(' + absoluteLeft + '%, 0, 0)' : 'translate3d(' + absoluteLeft + '%, 0)',
                    distance = ((100 - Math.abs(absoluteLeft)) / 100);

                if (!GetDeviceFeatures.transformProperty) {
                    // fallback to default slide if transformProperty is not available
                    style['margin-left'] = absoluteLeft + '%';
                } else {
                    if (transitionType == 'fadeAndSlide') {
                        style[GetDeviceFeatures.transformProperty] = slideTransformValue;
                        opacity = 0;
                        if (Math.abs(absoluteLeft) < 100) {
                            opacity = 0.3 + distance * 0.7;
                        }
                        style.opacity = opacity;
                    } else if (transitionType == 'tiles') {
                        var transformFrom = 100,
                            degrees = 0,
                            maxDegrees = 60 * (distance - 1);

                        transformFrom = offset < (slideIndex * -100) ? 100 : 0;
                        degrees = offset < (slideIndex * -100) ? maxDegrees : -maxDegrees;
                        style[GetDeviceFeatures.transformProperty] = slideTransformValue;
                        style['transform-origin'] = transformFrom + '% 50%';
                    } else if (transitionType == 'zoom') {
                        style[GetDeviceFeatures.transformProperty] = slideTransformValue;
                        var scale = 1;
                        if (Math.abs(absoluteLeft) < 100) {
                            scale = 1 + ((1 - distance) * 2);
                        }
                        style[GetDeviceFeatures.transformProperty] += ' scale(' + scale + ')';
                        style['transform-origin'] = '50% 50%';
                        opacity = 0;
                        if (Math.abs(absoluteLeft) < 100) {
                            opacity = 0.3 + distance * 0.7;
                        }
                        style.opacity = opacity;
                    } else {
                        style[GetDeviceFeatures.transformProperty] = slideTransformValue;
                    }
                }

                return createStyleAttributeValue(style);
            };
        };
})();
