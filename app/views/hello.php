<!doctype html>
<html lang="en" ng-app="lastfmLibraryGroupsApp">
<head>
	<meta charset="UTF-8">
	<title>Last.fm Library Groups</title>
    <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.0-rc.1/angular.min.js"></script>
    <script src="js/ui-bootstrap-tpls-0.11.0.min.js"></script>
    <script src="js/app.js"></script>
    <script src="js/http-throttler.js"></script>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.2.0/css/bootstrap.min.css">
</head>
<body>
	<div class="container" ng-controller="LastfmLibraryGroupsController">
        <h1>Last.fm Library Groups</h1>

        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label>Recent Track Days</label>
                    <input type="number" ng-model="recentTrackDays" ng-disabled="running" class="form-control" />
                </div>
            </div>
        </div>

        <progressbar ng-show="running" max="1" value="recentTracksProgress">{{round(recentTracksProgress * 100)}}%</progressbar>
        <progressbar ng-show="running" max="1" value="progress">{{round(progress * 100)}}%</progressbar>

        <p><button class="btn btn-primary" ng-disabled="running" ng-click="getData()">Get Data</button></p>

        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label>Similar Depth</label>
                    <input type="number" ng-model="similarDepth" ng-disabled="running" class="form-control" />
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>Similar Min Match</label>
                    <input type="number" ng-model="similarMinMatch" ng-disabled="running" class="form-control" />
                </div>
            </div>

        </div>

        <p><button class="btn btn-primary" ng-disabled="running" ng-click="buildGroups()">Build Groups</button></p>



        <p>Number of Groups: {{groups.length}}</p>
        <p>Total Tracks: {{totalTracks()}}</p>
        <p>Number of Groups Consolidated: {{numGroupsConsolidated}}</p>

        <div ng-repeat="group in groups | orderBy : 'tracks.length' : true">
            <h2>{{groupName(group)}} ({{group.tracks.length}})</h2>

            <ul>
                <li ng-repeat="track in group.tracks | orderBy : ['artist', 'name']">
                    {{track.artist}} - {{track.name}}
                </li>
            </ul>
        </div>
	</div>
</body>
</html>
