(function() {
    'use strict';

    angular
        .module('app.angularCarousel')
        .directive('ctCarousel', ctCarousel);

        function ctCarousel($swipe, $window, $document, $parse, $compile, $timeout, $interval, ApplyTransformations, Tweenable, $ionicScrollDelegate) {
            // internal ids to allow multiple instances
            var carouselId = 0,
                // in absolute pixels, at which distance the slide stick to the edge on release
                rubberTreshold = 3;

            var requestAnimationFrame = $window.requestAnimationFrame || $window.webkitRequestAnimationFrame || $window.mozRequestAnimationFrame;

            return {
                restrict: 'A',
                scope: true,
                compile: function(tElement, tAttributes) {
                    // use the compile phase to customize the DOM
                    var firstChild = tElement[0].querySelector('li'),
                        firstChildAttributes = (firstChild) ? firstChild.attributes : [],
                        isRepeatBased = false,
                        isBuffered = false,
                        repeatItem,
                        repeatCollection;

            		    // check if looping is specified
            		    var loop = angular.isDefined(tAttributes['ctCarouselLoop']);
                        tElement.delegateHandle = _.uniqueId('CarouselView');

                    // try to find an ngRepeat expression
                    // at this point, the attributes are not yet normalized so we need to try various syntax
                    ['ng-repeat', 'data-ng-repeat', 'ng:repeat', 'x-ng-repeat'].every(function(attr) {
                        var repeatAttribute = firstChildAttributes[attr];
                        if (angular.isDefined(repeatAttribute)) {
                            // ngRepeat regexp extracted from angular 1.2.7 src
                            var exprMatch = repeatAttribute.value.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/),
                                trackProperty = exprMatch[3];

                            repeatItem = exprMatch[1];
                            repeatCollection = exprMatch[2];

                            if (repeatItem) {
                                if (angular.isDefined(tAttributes['ctCarouselBuffered'])) {
                                    // update the current ngRepeat expression and add a slice operator if buffered
                                    isBuffered = true;
                                    loop = false; //disable looping if buffering
                                    repeatAttribute.value = repeatItem + ' in ' + repeatCollection + '|carouselSlice:carouselBufferIndex:carouselBufferSize';
                                    if (trackProperty) {
                                        repeatAttribute.value += ' track by ' + trackProperty;
                                    }
                                }
                                isRepeatBased = true;
                                if (loop) {
                                    angular.element(firstChild).attr('ct-carousel-emit-events', '');
                                }
                                return false;
                            }
                        }
                        return true;
                    });

                    return function(vm, iElement, iAttributes, containerCtrl) {

              			carouselId++;
              			iElement[0].id = 'carousel' + carouselId;

                        function produceVirtualSlides(event, element){
                            //head true if we are removing front-most clone
                            var head = event.targetScope.$last ? true : false;
                            var tail = event.targetScope.$first ? true : false;
                            var eleToRemove, copy;
                            if (head) {
                                eleToRemove = document.querySelectorAll('#' + iElement[0].id + ' .ct-carousel-virtual-slide-head')[0];
                                copy = element.clone();
                                copy.addClass('ct-carousel-virtual-slide-head');
                                if (eleToRemove ) {
                                    iElement[0].replaceChild(copy[0], eleToRemove);
                                } else {
                                    iElement.prepend(copy);
                                }
                            }
                            if (tail){
                                eleToRemove = document.querySelectorAll('#'+ iElement[0].id + ' .ct-carousel-virtual-slide-tail')[0];
                                copy = element.clone();
                                copy.addClass('ct-carousel-virtual-slide-tail');
                                if (eleToRemove) {
                                    iElement[0].replaceChild(copy[0], eleToRemove);
                                } else {
                                    var controlsNode = document.querySelectorAll('#' + iElement[0].id + ' .ct-carousel-controls');
                                    iElement[0].insertBefore(copy[0], controlsNode[0]);
                                }
                            }
                            event.stopPropagation();
                        }

                  			// add virtual slides for looping
                  			if (loop){
                			    if (!isRepeatBased) {
                    				var children = document.querySelectorAll('#' + iElement[0].id + '> li');
                    				var firstCopy = angular.element(children[0]).clone();
                    				var lastCopy = angular.element(children[children.length-1]).clone();
                    				iElement.prepend(lastCopy);
                                    var controlsNode = document.querySelectorAll('#' + iElement[0].id + ' .ct-carousel-controls');
                                    iElement[0].insertBefore(firstCopy[0], controlsNode[0]);

                			    } else {
                    				// this eliminates flicker caused by using $timeout
                    				vm.$on('ctRepeatReady', function(event, element) {
                    				    vm.$evalAsync(function() {
                                            produceVirtualSlides(event, element);
                    				    });
                    				});
                			    }
                  			}

                  			//for displaying carousel controls
                  			vm.loop = loop;

                        var defaultOptions = {
                            transitionType: iAttributes.ctCarouselTransition || 'slide',
                            transitionEasing: 'easeTo',
                            transitionDuration: 300,
                            /* do touchend trigger next slide automatically */
                            isSequential: true,
                            autoSlideDuration: 3,
                            bufferSize: 5,
                            /* in container % how much we need to drag to trigger the slide change */
                            moveTreshold: 0.1
                        };

                        // TODO
                        var options = angular.extend({}, defaultOptions);

                        var pressed,
                            startX,
                            isIndexBound = false,
                            offset = 0,
                            destination,
                            swipeMoved = false,
                            //animOnIndexChange = true,
                            currentSlides,
                            elWidth = null,
                            elX = null,
                            animateTransitions = true,
                            intialState = true,
                            animating = false,
                            locked = false;

                        if(iAttributes.ctCarouselControls!==undefined) {
                            // dont use a directive for this
                            var tpl = '<div class="ct-carousel-controls">\n' +
                                '  <span class="ct-carousel-control ct-carousel-control-prev ion-chevron-left" ng-click="prevSlide()" ng-if="carouselIndex > 0 || loop"></span>\n' +
                                '  <span class="ct-carousel-control ct-carousel-control-next ion-chevron-right" ng-click="nextSlide()" ng-if="carouselIndex < ' + repeatCollection + '.length - 1 || loop"></span>\n' +
                                '</div>';
                            iElement.append($compile(angular.element(tpl))(vm));
                        }

                        $swipe.bind(iElement, {
                            start: swipeStart,
                            move: swipeMove,
                            end: swipeEnd,
                            cancel: function(event) {
                                swipeEnd({}, event);
                            }
                        });

                        function getSlidesDOM() {
                            return iElement[0].querySelectorAll('[ct-carousel] > li');
                        }

                        function documentMouseUpEvent(event) {
                            // in case we click outside the carousel, trigger a fake swipeEnd
                            swipeMoved = true;
                            swipeEnd({
                                x: event.clientX,
                                y: event.clientY
                            }, event);
                        }

                        function updateSlidesPosition(offset) {
                            // manually apply transformation to carousel childrens
                  			    // todo : optim : apply only to visible items
                            var x = vm.carouselBufferIndex * 100 + offset;

              			    if (loop) {
              			    	x -= 100;
              			    }
                            angular.forEach(getSlidesDOM(), function(child, index) {
                                child.style.cssText = ApplyTransformations.createAnimationStyle(index, x, options.transitionType);
                            });
                        }

                        function addActiveClass(element) {
                            if (!element.hasClass('active')) {
                                element.addClass('active');
                            }
                        }

                        function removeActiveClass(element) {
                            element.removeClass('active');
                        }

                        vm.nextSlide = function(slideOptions) {
                            var index = vm.carouselIndex + 1;
                            if (index > currentSlides.length - 1 && !loop) {
                                index = 0;
                            }
                            if (!locked) {
                                goToSlide(index, slideOptions);
                            }
                        };

                        vm.prevSlide = function(slideOptions) {
                            var index = vm.carouselIndex - 1;
                            if (index < 0 && !loop) {
                                index = currentSlides.length - 1;
                            }
                            if (!locked) {
                              goToSlide(index, slideOptions);
                            }
                        };

                        function goToSlide(index, slideOptions, looped) {
                            // move a to the given slide index
                            if (index === undefined) {
                                index = vm.carouselIndex;
                            }

                            slideOptions = slideOptions || {};
                            if (slideOptions.animate === false || options.transitionType === 'none') {
                                locked = false;
                                offset = index * -100;
                                vm.carouselIndex = index;
                                updateBufferIndex();
                                return;
                            }

                            locked = true;
                            removeActiveClass(iElement.children());
                            var tweenable = new Tweenable();
                            tweenable.tween({
                                from: {
                                    'x': offset
                                },
                                to: {
                                    'x': index * -100
                                },
                                duration: options.transitionDuration,
                                easing: options.transitionEasing,
                                start: function() {
                                    // LHS slides
                                    if (loop && index === -1) {
                                        index = currentSlides.length -1;
                                        goToSlide(index, {animate: false}, 'looped');
                                        addActiveClass(iElement.children().eq(index + 1));
                                    }

                                    // RHS slides
                                    if (loop && index === currentSlides.length) {
                                        index = 0;
                                        goToSlide(index, {animate: false}, 'looped');
                                        addActiveClass(iElement.children().eq(index + 1));
                                    }
                                },
                                step: function(state) {
                                    updateSlidesPosition(state.x);
                                    addActiveClass(iElement.children().eq(index + 1));
                                },
                                finish: function() {
                                    locked = false;
                                    vm.$apply(function() {
                                        vm.carouselIndex = index;
                                        offset = index * -100;
                                        updateBufferIndex();
                                    });
                                }
                            });
                        }

                        function getContainerWidth() {
                            var rect = iElement[0].getBoundingClientRect();
                            return rect.width ? rect.width : rect.right - rect.left;
                        }

                        function updateContainerWidth() {
                            elWidth = getContainerWidth();
                        }

                        function swipeStart(coords, event) {
                            // console.log('swipeStart', coords, event);
                            $document.bind('mouseup', documentMouseUpEvent);
                            updateContainerWidth();
                            elX = iElement[0].querySelector('li').getBoundingClientRect().left;
                            pressed = true;
                            startX = coords.x;
                            return false;
                        }

                        function swipeMove(coords, event) {
                            //console.log('swipeMove', coords, event);
                            if (locked) {
                                return;
                            }
                            var x, delta;
                            if (pressed) {
                                x = coords.x;
                                delta = startX - x;
                                if (delta > 2 || delta < -2) {
                                    swipeMoved = true;
                                    var moveOffset = offset + (-delta * 100 / elWidth);
                                    updateSlidesPosition(moveOffset);
                                }
                            }
                            return false;
                        }

                        var init = true;
                        vm.carouselIndex = 0;

                        if (!isRepeatBased) {
                            // fake array when no ng-repeat
                            currentSlides = [];
                            angular.forEach(getSlidesDOM(), function(node, index) {
                                currentSlides.push({id: index});
                            });

              			    if (loop) {
                                currentSlides.length -= 2;
              			    }
                        }

                        var autoSlider;
                        if (iAttributes.ctCarouselAutoSlide) {
                            var duration = parseInt(iAttributes.autoSlide, 10) || options.autoSlideDuration;
                            autoSlider = $interval(function() {
                                if (!locked && !pressed) {
                                    vm.nextSlide();
                                }
                            }, duration * 1000);
                        }

                        if (iAttributes.ctCarouselLocked) {
                            vm.$watch(iAttributes.ctCarouselLocked, function(newValue, oldValue) {
                                // only bind swipe when it's not switched off
                                if(newValue === true) {
                                    locked = true;
                                } else {
                                    locked = false;
                                }
                            });
                        }

                        if (isRepeatBased) {
                            vm.$watchCollection(repeatCollection, function(newValue, oldValue) {
                                currentSlides = newValue;
                                goToSlide(vm.carouselIndex);
                            });
                        }

                        function swipeEnd(coords, event, forceAnimation) {
                            // Prevent clicks on buttons inside slider to trigger "swipeEnd" event on touchend/mouseup
                            if (event && !swipeMoved) {
                                return;
                            }

                            $document.unbind('mouseup', documentMouseUpEvent);
                            pressed = false;
                            swipeMoved = false;
                            destination = startX - coords.x;
                            if (destination === 0) {
                                return;
                            }
                            if (locked) {
                                return;
                            }
                            offset += (-destination * 100 / elWidth);
                            if (options.isSequential) {
                                var minMove = options.moveTreshold * elWidth,
                                    absMove = -destination,
                                    slidesMove = -Math[absMove >= 0 ? 'ceil' : 'floor'](absMove / elWidth),
                                    shouldMove = Math.abs(absMove) > minMove;

                                if (currentSlides && (slidesMove + vm.carouselIndex) >= currentSlides.length && !loop) {
                                    slidesMove = currentSlides.length - 1 - vm.carouselIndex;
                                }
                                if ((slidesMove + vm.carouselIndex) < 0 && !loop) {
                                    slidesMove = -vm.carouselIndex;
                                }
                                var moveOffset = shouldMove ? slidesMove : 0;

                                destination = (vm.carouselIndex + moveOffset);

                                goToSlide(destination);
                            } else {
                                vm.$apply(function() {
                                    vm.carouselIndex = parseInt(-offset / 100, 10);
                                    updateBufferIndex();
                                });
                            }
                        }

                        vm.$on('$destroy', function() {
                            $document.unbind('mouseup', documentMouseUpEvent);
                        });

                        vm.carouselBufferIndex = 0;
                        vm.carouselBufferSize = options.bufferSize;

                        function updateBufferIndex() {
                            // update and cap te buffer index
                            var bufferIndex = 0;
                            var bufferEdgeSize = (vm.carouselBufferSize - 1) / 2;
                            if (isBuffered) {
                                if (vm.carouselIndex <= bufferEdgeSize) {
                                    // first buffer part
                                    bufferIndex = 0;
                                } else if (currentSlides && currentSlides.length < vm.carouselBufferSize) {
                                    // smaller than buffer
                                    bufferIndex = 0;
                                } else if (currentSlides && vm.carouselIndex > currentSlides.length - vm.carouselBufferSize) {
                                    // last buffer part
                                    bufferIndex = currentSlides.length - vm.carouselBufferSize;
                                } else {
                                    // compute buffer start
                                    bufferIndex = vm.carouselIndex - bufferEdgeSize;
                                }

                                vm.carouselBufferIndex = bufferIndex;
                                $timeout(function() {
                                    updateSlidesPosition(offset);
                                }, 0, false);
                            } else {
                                $timeout(function() {
                                    updateSlidesPosition(offset);
                                }, 0, false);
                            }
                        }

                        function onOrientationChange() {
                            updateContainerWidth();
                            goToSlide();
                        }

                        // handle orientation change
                        var windowElement = angular.element($window);
                        windowElement.bind('orientationchange', onOrientationChange);
                        windowElement.bind('resize', onOrientationChange);

                        vm.$on('$destroy', function() {
                            $document.unbind('mouseup', documentMouseUpEvent);
                            windowElement.unbind('orientationchange', onOrientationChange);
                            windowElement.unbind('resize', onOrientationChange);
                        });
                    };
                }
            };
        }
})();
