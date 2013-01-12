var directionDisplay;
var directionsService = new google.maps.DirectionsService();
var wpid = false, op, prev_lat, prev_long, min_speed = 0, max_speed = 0, min_altitude = 0, max_altitude = 0, distance_travelled = 0, min_accuracy = 150;
var activePoiCoords, activePoiId, activeTravelId, geolocation, poiPosition;
var nearbyRange = 1;
var showStopGuidance = false;

// first: find webinos geolocation service via webinos servicediscovery
$(document).ready(function() {
	if (connectedSystems.length >= 1) {
		findGeolocationService(connectedSystems[0].serviceAddress);
	} else {
		wt.addWebinosReadyListener(function() {
			findGeolocationService(connectedSystems[0].serviceAddress);
		});
	}
	setMapHeight();
});

// stop geolocation watchposition
$(window).unload(function() {
	stopGeolocationWatchPosition();
});

function findGeolocationService(serviceAddress) {
	webinos.discovery.findServices(new ServiceType(
			"http://www.w3.org/ns/api-perms/geolocation"), {
		onFound : function(service) {
			if (service.serviceAddress == serviceAddress) {
				geolocation = service;
				geolocation.bindService({
					onBind : function() {
						// init geolocationservice directly after binding
						initialize_geolocation();
						// init Gmaps Layer
						init_map();
					}
				});
			}
		},
		onError : function(error) {
			console.log("Error finding service: " + error.message + " (#"
					+ error.code + ")");
		}
	});

}

// get geolocation from service and show position on map
function initialize_geolocation() {
	if (geolocation != null) {
		geolocation.getCurrentPosition(show_position, function() {
		}, {
			enableHighAccuracy : true
		});
	} else {
		// console.log('geolocation object is null');
	}
}

// init Gmaps Layer with DirectionDisplay for walking route
function init_map() {
	directionsDisplay = new google.maps.DirectionsRenderer();
	var myOptions = {
		zoom : 4,
		mapTypeControl : false,
		mapTypeControlOptions : {
			style : google.maps.MapTypeControlStyle.DROPDOWN_MENU
		},
		navigationControl : true,
		navigationControlOptions : {
			style : google.maps.NavigationControlStyle.SMALL
		},
		mapTypeId : google.maps.MapTypeId.ROADMAP
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	directionsDisplay.setMap(map);
}

// show current position on map
function show_position(p) {
	var pos = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
	map.setCenter(pos);
	map.setZoom(15);
	// set marker for current position
	setMarkerForCurrentPosition(p);
	// if an active Poi is available calculate the route, otherwise show only
	// the current position
	if (wt.getActivePoi() != null) {
		// get GPS coordinates for active poi as LatLng object
		activePoiCoords = getActivePoi();
		// check, if we already nearby activePoi
		checkNearActivePoi(p);
		// calculate walking route and display
		calcRouteVersion1(pos);
	} else {
		// If there is no active Poi show me the Pois around my current position
		// (1km)
		showPoisNearby(p);
	}
	// start watch the position
	startGeolocationWatchPosition();
}
// shows the Pois around my current position (1km)
function showPoisNearby(pos) {
	var pois = wt.getPoisNearby(pos, nearbyRange);
	if (pois != null) {
		for ( var int = 0; int < pois.length; int++) {
			var poi = pois[int];
			setMarkerForNearbyPoi(poi);
		}
		// var bounds = new google.maps.LatLngBounds();
		// for (index in markers) {
		// var data = markers[index];
		// bounds.extend(new google.maps.LatLng(data.lat, data.lng));
		// }
		// map.fitBounds(bounds);
	}
}
// set the marker for nearby pois
function setMarkerForNearbyPoi(poi) {
	var position = new google.maps.LatLng(poi.position.latitude,
			poi.position.longitude);
	set_markerWinfobox(position, poi);
}
// custom version of infobox for laststeps
function set_markerWinfobox(pos, poi) {
	var boxText = document.createElement("div");
	boxText.className = "infoboxcontent";
	poiPosition = poi.position;
	boxText.innerHTML = '<h4>'
			+ poi.title
			+ '</h4>\
					<p>'
			+ capitaliseFirstLetter(poi.address.city.toLowerCase())
			+ ', '
			+ capitaliseFirstLetter(poi.address.street.toLowerCase())
			+ ' '
			+ poi.address.streetnumber
			+ '</p>\
					<br>\
					<p><a href="javascript:navigateToNearbyPoi('
			+ poi.id
			+ ')">Navigate to this POI</a></p>\
				</div>\
		</div>';

	var boxOptions = {
		content : boxText,
		disableAutoPan : false,
		maxWidth : 0,
		pixelOffset : new google.maps.Size(-130, 0),
		zIndex : null,
		boxStyle : {
			opacity : 0.85,
			width : "260px" // TODO: make this dynamic (%s are out of question)
		},
		closeBoxMargin : "10px 2px 2px 2px",
		closeBoxURL : "http://www.google.com/intl/en_us/mapfiles/close.gif",
		infoBoxClearance : new google.maps.Size(35, 30),
		isHidden : false,
		pane : "floatPane",
		enableEventPropagation : false
	};

	var ib = new InfoBox(boxOptions);

	// var infowindow = new google.maps.InfoBox({
	// content: "<strong>yes</strong>"
	// });

	var marker = new google.maps.Marker({
		position : pos,
		map : map,
		title : poi.title
	// TODO
	});

	google.maps.event.addListener(marker, 'click', function() {
		// infowindow.open(map,marker);
		// document.getElementById('poiId').innerHTML = poi.id;
		ib.open(map, marker);
	});
	// google.maps.event.addListener(ib, 'domready', function() {
	// $('#addPOIbtn' +poi.id).overlay({
	// top: 'center',
	// close: "a.close"
	// });
	// $('#addPOIlistbtn').off('click.addpoi');
	// $('#addPOIlistbtn').on('click.addpoi', function()
	// {TravelEditor.addPOIToTravel(poi.id)} );
	// });

	// return marker;
}

// navigate to Poi without an active Travel or active poi
function navigateToNearbyPoi(poiId) {
	// var poi = wt.getPoiDetails(poiId);
	// calcRouteVersion2(poi.position);
	// var pos = new google.maps.LatLng(activePoiId.position.latitude,
	// activePoiId.position.longitude);
	var travelId = wt.determineTravelForPoi(poiId);
	var myBool = wt.setPoiActive(poiId, travelId);
	activePoiCoords = getActivePoi();
	calcRouteVersion1(markerCurrentPosition.getPosition());
}

// set a marker with icon for current position
function setMarkerForCurrentPosition(pos) {
	markerCurrentPosition = new google.maps.Marker({
		position : new google.maps.LatLng(pos.coords.latitude,
				pos.coords.longitude),
		map : map,
		icon : '../../images/man.png'
	});
	circleCurrentPosition = new google.maps.Circle({
		center : new google.maps.LatLng(pos.coords.latitude,
				pos.coords.longitude),
		radius : pos.coords.accuracy,
		map : map,// your map,
		fillColor : '#008595',// color,
		fillOpacity : '0.10',// opacity from 0.0 to 1.0,
		strokeColor : '#003535',// stroke color,
		strokeOpacity : '0.3',// opacity from 0.0 to 1.0
		strokeWeight : '0.5'
	});
}

// get activePoi, returns an LatLng object
function getActivePoi() {

	activePoiId = wt.getActivePoi();
	// get also activeTravelId (necessary for marAsVisited)
	activeTravelId = wt.getActiveTravel();

	if (activePoiId != null) {
		var activePoi = new google.maps.LatLng(activePoiId.position.latitude,
				activePoiId.position.longitude);
		return activePoi;
	}
}

// calculate route and display on Gmaps with an active Poi
function calcRouteVersion1(pos) {
	var request = {
		origin : pos,
		destination : activePoiCoords,
		// Note that Javascript allows us to access the constant
		// using square brackets and a string value as its
		// "property."
		travelMode : google.maps.TravelMode['WALKING']
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setMap(map);
			directionsDisplay.setDirections(response);
		}
	});
}
// calculate route and display on Gmaps without set an Poi active
function calcRouteVersion2(destination) {
	var request = {
		origin : markerCurrentPosition.getPosition(),
		destination : new google.maps.LatLng(destination.latitude,
				destination.longitude),
		// Note that Javascript allows us to access the constant
		// using square brackets and a string value as its
		// "property."
		travelMode : google.maps.TravelMode['WALKING']
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setMap(map);
			directionsDisplay.setDirections(response);
		}
	});
}

function stopGeolocationWatchPosition() {
	if (wpid) // If we already have a wpid which is the ID returned by
	// navigator.geolocation.watchPosition()
	{
		// navigator.geolocation.clearWatch(wpid);
		geolocation.clearWatch(wpid);
		wpid = false;
	}
}

// Set up a watchPosition to constantly monitor the geo location
function startGeolocationWatchPosition() {
	if (geolocation != null)
		wpid = geolocation.watchPosition(geo_success, geo_error);
}

// This is the function which is called each time the Geo location position is
// updated
function geo_success(position) {

	// Check that the accuracy of our Geo location is sufficient for our needs
	if (position.coords.accuracy <= min_accuracy) {
		// We don't want to action anything if our position hasn't changed - we
		// need this because on IPhone Safari at least, we get repeated readings
		// of the same location with
		// different accuracy which seems to count as a different reading -
		// maybe it's just a very slightly different reading or maybe altitude,
		// accuracy etc has changed

		if (prev_lat != position.coords.latitude
				|| prev_long != position.coords.longitude) {

			prev_lat = position.coords.latitude;
			prev_long = position.coords.longitude;

			// delete old marker and circle
			markerCurrentPosition.setMap(null);
			circleCurrentPosition.setMap(null);
			// set new marker
			setMarkerForCurrentPosition(position);
			// center the new position
			map.setCenter(markerCurrentPosition.getPosition());
			if (wt.getActivePoi() != null) {
				// check if we are nearby the activePoi
				checkNearActivePoi(position);
			}
		}
	}
}

// This function is called each time geolocation.watchPosition()
// generates an error (i.e. cannot get a Geo location reading)
function geo_error(error) {
	console.log('geolocation error code: ' + error);
}

// check, if we are nearby the activePoi
function checkNearActivePoi(position) {
	var pos = new google.maps.LatLng(position.coords.latitude,
			position.coords.longitude);
	var distance = calculateDistance(pos, activePoiCoords);
	// mark activePoi as visited if we are under 0.1 km
	if (distance < 0.1) {
		console
				.log('Last Step Navigation: We are nearby the activePoi. Mark as visited.');
		var success = wt.setPoiActive(activePoiId.id, wt
				.determineTravelForPoi(activePoiId.id), false);
		if (success) {
			alert('You have reached ' + activePoiId.title
					+ '. The POI has been marked as visited.');
			clearAfterFinishVisit();
		} else {
			alert('You have reached '
					+ activePoiId.title
					+ '. But an error occcured and it could not be marked as visited.');
			clearAfterFinishVisit();
		}
	}
}

function clearAfterFinishVisit(){
	markerCurrentPosition.setMap(null);
	circleCurrentPosition.setMap(null);
	directionsDisplay.setMap(null);
	//set active Poi to null
	activePoiId = null;
	// show curreent position
	initialize_geolocation();
}

// Stop Guidance
function stopGuidance() {
	if (activePoiId != null) {
		var success = wt.setPoiActive(activePoiId.id, wt
				.determineTravelForPoi(activePoiId.id), false);
		if (success) {
			showStopGuidance = false;
			alert('Stop guidance for ' + activePoiId.title
					+ '. The POI has been marked as visited.');
			clearAfterFinishVisit();
		} else {
			alert('Stop guidance for '
					+ activePoiId.title
					+ '. But an error occcured and it could not be marked as visited.');
		}
	} else {
		alert('Currently no active POI available. Guidance can not be stopped');
	}
}

// calculates the distance between two points
function calculateDistance(a, b) {
	var R = 6371; // km

	if (typeof (Number.prototype.toRad) === "undefined") {
		Number.prototype.toRad = function() {
			return this * Math.PI / 180;
		};
	}
	var dLat = (b.lat() - a.lat()).toRad();
	var dLon = (b.lng() - a.lng()).toRad();
	var lat1 = a.lat().toRad();
	var lat2 = b.lat().toRad();

	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2)
			* Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}
