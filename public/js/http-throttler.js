/**
 * @license HTTP Throttler Module for AngularJS
 * (c) 2013 Mike Pugh
 * License: MIT
 */


(function() {
  "use strict";  angular.module('http-throttler', ['http-interceptor-buffer']).factory("httpThrottler", [
    '$q', '$log', 'httpBuffer', function($q, $log, httpBuffer) {
      var reqCount, service;

      reqCount = 0;

            service = new function () {
                var limit = 10;
                var debug = false;

                this.request = function(config) {
                    var deferred;

                    if (debug) {
                        $log.info("Incoming Request - current count = " + reqCount);
                    }
                    if (reqCount >= limit) {
                        if (debug) {
                            $log.warn("Too many requests");
                        }
                        deferred = $q.defer();
                        httpBuffer.append(config, deferred);
                        return deferred.promise;
                    } else {
                        reqCount++;
                        return config || $q.when(config);
                    }
                }

                this.response = function(response) {
                    if (debug) {
                        $log.info("Response received from server");
                    }
                    reqCount--;
                    httpBuffer.retryOne();
                    return response || $q.when(response);
                }

                this.setLimit = function(newLimit) {
                    limit = newLimit;
                }

                this.setDebug = function (newDebug) {
                    debug = newDebug;
                }
            }

      return service;
    }
  ]);

  angular.module('http-interceptor-buffer', []).factory('httpBuffer', [
    '$log', function($log) {
      var buffer, retryHttpRequest, service;

      buffer = [];
      retryHttpRequest = function(config, deferred) {
        if (config != null) {
            //$log.info("Resolving config promise");
          return deferred.resolve(config);
        }
      };
      service = {
        append: function(config, deferred) {
          return buffer.push({
            config: config,
            deferred: deferred
          });
        },
        retryOne: function() {
          var req;

          if (buffer.length > 0) {
            req = buffer.pop();
            return retryHttpRequest(req.config, req.deferred);
          }
        }
      };
      return service;
    }
  ]);

}).call(this);
