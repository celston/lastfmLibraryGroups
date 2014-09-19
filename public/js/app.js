Array.prototype.contains = function (item, callback) {
    if (typeof callback == 'undefined') {
        callback = function (a, b) {
            return a == b;
        }
    }

    for (var i = 0; i < this.length; i++) {
        if (callback(item, this[i])) {
            return true;
        }
    }

    return false;
}

var app = angular.module('lastfmLibraryGroupsApp', ['ui.bootstrap', 'http-throttler']);

app.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('httpThrottler');
}])

app.run(function (httpThrottler) {
    httpThrottler.setLimit(20);
})

app.controller('LastfmLibraryGroupsController', ['$scope', '$http', '$q', '$interval', '$timeout', 'httpThrottler', function ($scope, $http, $q, $interval, $timeout, httpThrottler) {
    var data = [];
    $scope.groups = [];
    $scope.numGroupsConsolidated = 0;
    $scope.running = false;
    $scope.recentTracksProgress = 0;
    $scope.progress = 0;
    $scope.similarDepth = 50;
    $scope.recentTrackDays = 1;
    $scope.similarMinMatch = 0.1;
    $scope.timer = 0;
    $scope.eta = 0;

    function consolidateGroups() {
        var groupsConsolidated = true;
        while (groupsConsolidated) {
            groupsConsolidated = false;

            for (var i = 0; i < $scope.groups.length; i++) {
                var group1 = $scope.groups[i];

                for (var j = i + 1; j < $scope.groups.length; j++) {
                    var group2 = $scope.groups[j];

                    var theseGroupsMatch = false;

                    angular.forEach(group1.tracks, function (group1Track) {
                        angular.forEach(group2.tracks, function (group2Track) {
                            if (!theseGroupsMatch && group1Track.artist == group2Track.artist && group1Track.name == group2Track.name) {
                                theseGroupsMatch = true;
                            }
                        })
                    })

                    if (theseGroupsMatch) {
                        group2.tracks.forEach(function (group2Track) {
                            var trackFound = false;
                            group1.tracks.forEach(function (group1Track) {
                                if (group1Track.artist == group2Track.artist && group1Track.name == group2Track.name) {
                                    trackFound = true;
                                }
                            })
                            if (!trackFound) {
                                group1.tracks.push(group2Track);
                            }
                        })

                        group1.similar = group1.similar.concat(group2.similar);
                        group2.tracks = [];
                        group2.similar = [];
                        groupsConsolidated = true;
                        $scope.numGroupsConsolidated++;
                    }
                }
            }
        }
    }

    function toHHMMSS(x) {
        var sec_num = parseInt(x, 10); // don't forget the second param
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        var time    = hours+':'+minutes+':'+seconds;
        return time;
    }

    function tracksAreEqual(a, b) {
        return a.name == b.name && a.artist == b.artist;
    }

    $scope.timerFormatted = function () {
        return toHHMMSS($scope.timer);
    }

    $scope.groupName = function (group) {
        var artists = {};
        angular.forEach(group.tracks, function (groupTrack) {
            if (!(groupTrack.artist in artists)) {
                artists[groupTrack.artist] = 0;
            }
            artists[groupTrack.artist]++;
        })

        var artistKeys = Object.keys(artists);
        artistKeys.sort(function (a, b) {
            return artists[a] == artists[b] ? 0 : artists[a] < artists[b] ? 1 : -1;
        })

        return artistKeys.slice(0, 3).join(', ');
    }

    $scope.totalTracks = function() {
        if ($scope.groups.length == 0) {
            return 0;
        }

        return $scope.groups
            .map(function (group) {
                return group.tracks.length;
            })
            .reduce(function (previous, current) {
                return previous + current;
            })
    }

    $scope.round = function (x) {
        return Math.round(100 * x) / 100;
    }

    $scope.getData = function () {
        data = [];
        $scope.groups = [];
        $scope.numGroupsConsolidated = 0;
        $scope.running = true;
        $scope.progress = 0;
        var recentTracksProgress = 0;
        var progress = 0;

        $scope.timer = 0;
        $scope.eta = 0;

        $http({
            method: 'GET',
            url: 'http://findgnosis.com/lastfm/user/recenttracks/celston/' + $scope.recentTrackDays
        }).success(function (recentTracksResponse) {
            var recentTracks = [];

            for (var artist in recentTracksResponse.result) {
                for (var name in recentTracksResponse.result[artist]) {
                    recentTracks.push({
                        artist: artist,
                        name: name.split(' - ')[0].split(' [')[0].split(' (')[0]
                    });
                }
            }
            delete recentTracksResponse;

            var promises = [];

            console.log(recentTracks);

            angular.forEach(recentTracks, function (recentTrack) {
                var recentTrackName = recentTrack.name;
                var recentTrackArtist = recentTrack.artist;

                var promise = $http({
                    method: 'GET',
                    url:  'http://findgnosis.com/proxy/lastfm/track.getsimilar',
                    params: {
                        track: recentTrackName,
                        artist: recentTrackArtist
                    }
                });

                promises.push(
                    promise
                        .then(function (getSimilarResponse) {
                            if (typeof getSimilarResponse.data.similartracks != 'undefined' && typeof getSimilarResponse.data.similartracks.track != 'undefined' && Array.isArray(getSimilarResponse.data.similartracks.track)) {
                                var temp2 = getSimilarResponse.data.similartracks.track
                                    .map(function (similarTrack) {
                                        return {
                                            artist: similarTrack.artist.name,
                                            name: similarTrack.name.split(' - ')[0].split(' [')[0].split(' (')[0],
                                            match: similarTrack.match
                                        }
                                    })
                                    .slice(0, 20);
                                var temp = {
                                    name: recentTrackName,
                                    artist: recentTrackArtist,
                                    similar: temp2
                                };
                                data.push(temp);
                            }
                            else {
                                console.log('ERROR: ' + recentTrackArtist + ' / ' + recentTrackName);
                            }

                            delete getSimilarResponse;

                            progress++;
                            $scope.progress = progress / recentTracks.length
                        })
                        .catch(function () {
                            progress++;
                            $scope.progress = progress / recentTracks.length
                        })
                );
            })

            $q.all(promises).then(function (foo) {
                $scope.running = false;
            })
        })
    }

    $scope.buildGroups = function () {
        $scope.groups = [];
        $scope.running = true;
        $scope.numGroupsConsolidated = 0;

        var deferred = $q.defer();

        $timeout(function () {
            angular.forEach(data, function (recentTrack) {
                $scope.groups.push({
                    name: recentTrack.artist + ' - ' + recentTrack.name,
                    tracks: [{
                        artist: recentTrack.artist,
                        name: recentTrack.name
                    }],
                    similar: [].concat(
                        recentTrack.similar
                            .filter(function (similarTrack) {
                                return similarTrack.match > $scope.similarMinMatch;
                            })
                            .slice(0, $scope.similarDepth)
                    )
                })
            })

            var groupsConsolidated = true;
            while (groupsConsolidated) {
                groupsConsolidated = false;

                for (var i = 0; i < $scope.groups.length - 1; i++) {
                    var group1 = $scope.groups[i];
                    for (var j = i + 1; j < $scope.groups.length; j++) {
                        var group2 = $scope.groups[j];
                        var theseGroupsMatch = false;

                        angular.forEach(group1.tracks, function (group1Track) {
                            if (group2.tracks.contains(group1Track, tracksAreEqual)) {
                                theseGroupsMatch = true;
                                return;
                            }
                            if (group2.similar.contains(group1Track, tracksAreEqual)) {
                                theseGroupsMatch = true;
                                return;
                            }
                        })
                        angular.forEach(group2.tracks, function (group2Track) {
                            if (group1.tracks.contains(group2Track, tracksAreEqual)) {
                                theseGroupsMatch = true;
                                return;
                            }
                            if (group1.similar.contains(group2Track, tracksAreEqual)) {
                                theseGroupsMatch = true;
                                return;
                            }
                        })

                        if (theseGroupsMatch) {
                            group1.tracks = group1.tracks.concat(
                                group2.tracks.filter(function (group2Track) {
                                    return !group1.tracks.contains(group2Track, tracksAreEqual);
                                })
                            );
                            group1.similar = group2.similar.concat(group2.tracks);
                            group2.tracks = [];
                            group2.similar = [];

                            groupsConsolidated = true;
                            $scope.numGroupsConsolidated++;

                        }
                    }
                }
            }

            $scope.groups = $scope.groups.filter(function (group) {
                return group.tracks.length > 1;
            })

            deferred.resolve();
        })

        deferred.promise.then(function () {
            $scope.running = false;
        })
    }
}]);