var activeView = '#home';
var activeViewSub = null;
var centerPoint = new google.maps.LatLng(41.38765942141657, 2.1694680888855373);
var marker;
var position;
var map;
var geocoder;
var vehicle;
var geolocation;
var statusBarVisible = true;
var statusBarDisappearsIn = 1000 * 5;
var statusBarIntervalId = null;
var statusLastUpdate = new Date().getTime();
var statusLastUpdate = null;
var vehicleDataAvailable = false;
var vehicleGeolocationAvailable = false;
var nearbyPois = null;
var currentMapBounds = new google.maps.LatLngBounds();
var currentMapMarkers = new Array();
var mapInitialized = false;
var mapVisible = false;
var currentTravelList = new Object();
//Little Helpers
var homeStarter;
$(document).ready(function () {
  wt.addLogListener(myStatusHandler);
  if (!updateReady) {
    sync.addUpdateReadyListener(function () {
      doUpdate();
    });
  } else {
    doUpdate();
  }
  sync.addSyncStatusListener(function (message) {
    //alert(message);
    if (!statusBarVisible) {
      $('#loadingbox').removeClass('disabled');
    }
    $('#loadingbox').html(message);
    statusLastUpdate = new Date().getTime();
  });
  sync.addUpdateCompletedListener(function () {
    wt.refreshData();
    updateNavigationTree();
  });
  if (connectedSystems.length >= 1) {
    bindToVehicleSystem(connectedSystems[0].serviceAddress);
  } else {
    wt.addWebinosReadyListener(function () {
      bindToVehicleSystem(connectedSystems[0].serviceAddress);
    });
  }
  $('#h-end').focus(function () {
    $('#l4').focus();
  });
  $(window).bind('hashchange', function () {
    handleHashChange();
  });
  $('#guidance').click(function () {
    requestGuidance();
  });
  $('#markreached').click(function () {
    markAsReached();
  });
  var options = {
    filter: {
      remoteServices: false
    }
  };
  var filters = {
    remoteServices: false
  }
  wt.log('detetecting current device');
  updateNavigationTree();
  statusBarIntervalId = setInterval('checkStatusBar()', statusBarDisappearsIn);
});
$(document).unload(function () {
  wt.saveDataToLocalStorage();
});

function checkStatusBar() {
  if (statusBarDisappearsIn > (new Date().getTime()) - statusLastUpdate) {
    hideStatusBar();
  }
}

function hideStatusBar() {
  statusBarVisible = false;
  $('#loadingbox').addClass('disabled');
}

function doAutomotiveUpdate() {
  doUpdate();
}

function bindToVehicleSystem(serviceAddress) {
  wt.log('binding to vehicle system at' + serviceAddress);
  webinos.discovery.findServices(new ServiceType("http://webinos.org/api/vehicle"), {
    onFound: function (service) {
      if (service.serviceAddress == serviceAddress) {
        vehicle = service;
        vehicle.bindService({
          onBind: function () {
            wt.log('Connected to vehicle service at ' + serviceAddress);
            bindToGeolocationSystem(serviceAddress);
            vehicleDataAvailable = true;
            vehicle.addEventListener('shift', handleGear, false);
          }
        });
      }
    },
    onError: function (error) {
      console.log("Error finding service: " + error.message + " (#" + error.code + ")");
    }
  });
}

function bindToGeolocationSystem(serviceAddress) {
  wt.log('connecting to geolocation at' + serviceAddress);
  webinos.discovery.findServices(new ServiceType("http://www.w3.org/ns/api-perms/geolocation"), {
    onFound: function (service) {
      if (service.serviceAddress == serviceAddress) {
        geolocation = service;
        geolocation.bindService({
          onBind: function () {
            wt.log('bound to geolocation provider');
            vehicleGeolocationAvailable = true;
            geolocation.getCurrentPosition(handlePosition, errorHandler);
            ps = geolocation.watchPosition(handlePosition, errorHandler);
          }
        });
      }
    },
    onError: function (error) {
      console.log("Error finding service: " + error.message + " (#" + error.code + ")");
    }
  });
}

function myStatusHandler(message) {
  $('#loadingbox').html(message);
  if (message == 'bound to geolocation provider') {
    $('#start').addClass('disabled');
    $('#home').removeClass('disabled');
    $('#home').removeClass('disabled');
    setTimeout('hideStatusBar()', 500);
    if (activeTravel != null) {
      $('#l0').focus();
    } else if (activePoi != null) {
      $('#l1').focus();
    } else {
      $('#l2').focus();
    }
    if (activeTravel != null) {
      homeStarter = $('#l0');
    } else if (activePoi != null) {
      homeStarter = $('#l1');
    } else {
      homeStarter = $('#l2');
    }
    $('#h-start').focus(function () {
      console.log(homeStarter);
      homeStarter.focus();
    });
    updateNavigationTree();
  }
}

function errorHandler(error) {
  alert(error);
}

function handlePosition(position) {
  if (currentPosition != null) {
    if (wt.calculateDistance(position.coords, currentPosition.coords) > 20) {
      poisNearBy = wt.getPoisNearby(position, 50);
      if (window.location.hash == '#poiList-nearby') {
        currentPoiList = poisNearBy;
        updatePoiListView('Nearby (50.0 km)');
        updateMapView(currentPoiList);
      }
    }
  } else {
    poisNearBy = wt.getPoisNearby(position, 50);
  }
  currentPosition = position;
}

function updateNavigationTree() {
  if (activePoi == null) {
    $('#activePoiJumper').addClass('disabled');
    $('#activePoiJumper2').addClass('disabled');
  } else {
    $('#activePoiJumper').removeClass('disabled');
    $('#activePoiJumper2').removeClass('disabled');
    $('#l1').attr('href', '#poi-' + activePoi.id);
    $('#ppl1').attr('href', '#poi-' + activePoi.id);
  }
  if (activeTravel == null) {
    $('#currentTravelJumper').addClass('disabled');
    $('#currentTravelJumper2').addClass('disabled');
  } else {
    $('#currentTravelJumper').removeClass('disabled');
    $('#currentTravelJumper2').removeClass('disabled');
    $('#l0').attr('href', '#travel-' + activeTravel.id);
    $('#showCurrentTravel').attr('href', '#travel-' + activeTravel.id);
  }
}

function handleGear(data) {
  //Neutral 11, Parking 10;
  if (data.gear >= 10) {
    distance = wt.calculateDistance(currentPosition.coords, activePoi.position);
    //alert(distance);
    if (wt.range > distance) {
      wt.markPoiAsVisited(activePoi.id, activeTravel.id, true);
    }
  }
}

function updateAutomotiveView() {
  wt.refreshData();
  updateNavigationTree();
}

function updateTravelListView() {
  $('#v-travellist').empty();
  if (currentTravelList.length >= 1) {
    for (var i = 0; i < currentTravelList.length; i++) {
      addTravelToList(currentTravelList[i]);
    }
  } else {
    $('#v-travellist').html('<li>No POIs found.</li>');
  }
}

function updateTravelListViewHeader(header) {
  $('#travllisteType').html(header);
}

function addTravelToList(travel) {
  var innerText = '<li><a class="travellink" id="t_' + travel.id + '" href="#travel-' + travel.id + ' " tabindex="1">' + travel.title + '</a></li>';
  $('#v-travellist').append(innerText);
}

function handleHashChange() {
  $(activeView).addClass('disabled');
  newLocation = window.location.hash.split('-', 2);
  if (window.location.hash == '') {
    activeView = '#home';
  } else {
    activeView = newLocation[0];
  }
  if (newLocation.length > 1) {
    activeViewSub = newLocation[1];
  } else {
    activeViewSub = null;
  }
  $(activeView).removeClass('disabled');
  if (activeView != '#home') {
    if (!mapVisible) {
      $('#mapcanvas').removeClass('disabled');
      mapVisible = true;
    }
    if (!mapInitialized) {
      initializeMap();
      mapInitialized = true;
    }
  } else {
    $('#mapcanvas').addClass('disabled');
    mapVisible = false;
    $('#l0').focus(); //active Travel
    if (activeTravel != null) {
      homeStarter = $('#l0');
    } else if (activePoi != null) {
      homeStarter = $('#l1');
    } else {
      homeStarter = $('#l2');
    }
    $('#h-start').focus(function () {
      console.log(homeStarter);
      homeStarter.focus();
    });
    homeStarter.focus();
  }
  if (activeView == '#travel') {
    if (newLocation.length == 1) {
      updateTravelView(activeTravel.id);
    } else {
      updateTravelView(newLocation[1]);
    }
    if (currentPoiList.length > 1) {
      $('#tp_' + currentPoiList[0].id).focus();
      $('#tp-start').focus(function () {
        $('#tp_' + currentPoiList[0].id).focus();
      });
      $('#tp-end').focus(function () {
        $('#tp_' + currentPoiList[currentPoiList.length - 1].id).focus();
      });
    }
  } else if (activeView == '#poi') {
    if (activePoi != null && newLocation.length == 1) {
      updatePoiView(activePoi.id);
    } else {
      updatePoiView(newLocation[1]);
    }
    $('#guidance').focus();
    $('#pf-start').focus(function () {
      $('#guidance').focus();
    });
    $('#pf-end').focus(function () {
      $('#markreached').focus();
    });
  } else if (activeView == '#poiList') {
    currentListedTravel = new Object();
    currentListedTravel.id = null;
    var type;
    if (newLocation[1] == 'nearby') {
      currentPoiList = poisNearBy;
      type = 'nearby (50.0 km)';
    } else if (newLocation[1] == 'planned') {
      currentPoiList = wt.getPoisPlanned(460);
      type = 'planned (next 10 days)';
    } else if (newLocation[1] == 'visited') {
      currentPoiList = wt.getPoisVisited();
      type = 'visited';
    } else {
      currentPoiList = wt_pois;
      type = 'all';
    }
    updatePoiListView(type);
    if (currentPoiList.length >= 1) {
      $('#p_' + currentPoiList[0].id).focus();
      $('#pl-start').focus(function () {
        $('#p_' + currentPoiList[0].id).focus();
      });
      $('#pl-end').focus(function () {
        $('#p_' + currentPoiList[currentPoiList.length - 1].id).focus();
      });
    }
  } else if (activeView == '#travelList') {
    if (newLocation.length == 1) {
      currentTravelList = wt_travels;
      updateTravelListViewHeader('all');
    } else {
      if (newLocation[1] == 'past') {
        currentTravelList = pastTravels;
        updateTravelListViewHeader('past');
      } else if (newLocation[1] == 'planned') {
        currentTravelList = plannedTravels;
        updateTravelListViewHeader('planned');
      } else {
        currentTravelList = wt_travels;
        updateTravelListViewHeader('all');
      }
    }
    updateTravelListView();
    if (currentTravelList.length >= 1) {
      var focusId = '#t_' + currentTravelList[0].id;
      $(focusId).focus();
      $('#tl-start').focus(function () {
        $('#t_' + currentTravelList[0].id).focus();
      });
      $('#tl-end').focus(function () {
        //alert(wt_travels.length);
        //console.log(currentTravelList[wt_travels.length-1]);
        $('#t_' + currentTravelList[currentTravelList.length - 1].id).focus();
      });
    }
  } else if (activeView == '#travelPreList') {
    var travelListStart;
    if (activeTravel == null) {
      travelListStart = $('#showPlannedTravels');
    } else {
      travelListStart = $('#showCurrentTravel');
    }
    travelListStart.focus();
    $('#tpl-start').focus(function () {
      travelListStart.focus();
    });
    $('#tpl-end').focus(function () {
      $('#showAllTravels').focus();
    });
    updateMapView(wt_pois);
  } else if (activeView == '#poiPreList') {
    var starter;
    if (activePoi != null) {
      starter = $('#ppl1');
    } else {
      starter = $('#ppl2');
    }
    starter.focus()
    $('#ppl-start').focus(function () {
      starter.focus();
    });
    $('#ppl-end').focus(function () {
      $('#ppl5').focus();
    });
    updateMapView(wt_pois);
  }
}

function updateTravelView(travelId) {
  if (currentListedTravel.id != travelId) {
    currentListedTravel = wt.getTravel(travelId);
    $('#travelTitle').html(currentListedTravel.title);
    $('#travelTitle-2').html(currentListedTravel.title);
    $('#travelNotes').html(currentListedTravel.description);
    $('#travelStart').html(getDateString(currentListedTravel.startDate));
    $('#travelEnd').html(getDateString(currentListedTravel.endDate));
    $('#travel-poi-list').empty();
    for (var i = 0; i < currentListedTravel.pois.length; i++) {
      createTravelPoiListEntry(currentListedTravel.pois[i]);
    }
  }
  currentPoiList = currentListedTravel.pois
  updateMapView(currentPoiList);
}

function getDateString(timestamp) {
  var temp = new Date(timestamp);
  return temp.getDate() + '.' + (temp.getMonth() + 1) + '.' + temp.getFullYear();
}

function updateMapView(pois) {
  for (var i = 0; i < currentMapMarkers.length; i++) {
    currentMapMarkers[i].setMap(null);
  }
  currentMapMarkers = new Array();
  currentMapBounds = new google.maps.LatLngBounds();
  for (var i = 0; i < pois.length; i++) {
    var markerPoint = new google.maps.LatLng(pois[i].position.latitude, pois[i].position.longitude);
    currentMapBounds = currentMapBounds.extend(markerPoint);
    var marker = new google.maps.Marker({
      position: markerPoint
    });
    currentMapMarkers.push(marker);
    marker.setMap(map);
  }
  if (pois.length > 1) {
    map.fitBounds(currentMapBounds);
  } else if (pois.length == 1) {
    map.setCenter(markerPoint);
    map.setZoom(14);
  } else {
    var point = new google.maps.LatLng(currentPosition.coords.latitude, currentPosition.coords.longitude);
    map.setCenter(point);
    map.setZoom(12);
  }
}

function isPoiPartOfTravel(poiId, travelId) {
  for (i = 0; i < wt_poitravels.length; i++) {
    if (wt_poitravels[i].poiId == poiId && wt_poitravels[i].travelId == travelId) {
      return true;
    } else {
      return false;
    }
  }
}

function createTravelPoiListEntry(poi) {
  var innerText = '<li><a class="poilink" id="tp_' + poi.id + '" href="#poi-' + poi.id + '" tabindex="1">' + poi.title + '</a></li>';
  $('#travel-poi-list').append(innerText);
}

function createPoiListEntry(poi) {
  var innerText = '<li><a class="poilink" id="p_' + poi.id + '" href="#poi-' + poi.id + '" tabindex="1">' + poi.title + '</a></li>';
  $('#poi-list').append(innerText);
}

function updatePoiView(poiId) {
  if (currentListedPoi.id != poiId) {
    currentListedPoi = wt.getPoiDetails(poiId);
    var addtionalPoiData = null;
    if (activeTravel != null) {
      addtionalPoiData = wt.getPoiTravelDetails(poiId, activeTravel.id);
    }
    if (addtionalPoiData == null && currentListedTravel != null) {
      addtionalPoiData = wt.getPoiTravelDetails(poiId, currentListedTravel.id);
    }
    if (addtionalPoiData == null) {
      addtionalPoiData = wt.getPoiTravelDetails(poiId, 0);
    }
    $('#poiTitle').html(currentListedPoi.title);
    $('#poiDescription').html(currentListedPoi.description);
    if (addtionalPoiData !== null) {
      if (addtionalPoiData.notes != null) {
        $('#poiNotes').removeClass('disabled');
        $('#poiNotesText').html(addtionalPoiData.notes);
      } else {
        $('#poiNotes').addClass('disabled');
      }
      console.log(addtionalPoiData);
      if (addtionalPoiData.plannedVisit != null && !addtionalPoiData.visited) {
        $('#poiTiming').removeClass('disabled');
        $('#poiTimingDesc').html('visitig @');
        $('#poiTimingText').html(getDateString(addtionalPoiData.plannedVisit));
        $('#markreached').html('Mark as visited');
      } else if (addtionalPoiData.visited) {
        $('#poiTiming').removeClass('disabled');
        $('#poiTimingDesc').html('visited @');
        $('#poiTimingText').html(getDateString(addtionalPoiData.lastModified));
        $('#markreached').html('Mark as unvisited');
      } else {
        $('#poiTimig').addClass('disabled');
      }
    } else {
      $('#poiTiming').addClass('disabled');
      $('#poiNotes').addClass('disabled');
    }
    $('#guidance').attr('href', '#poi-' + currentListedPoi.id);
    $('#markreached').attr('href', '#poi-' + currentListedPoi.id);
  }
  if (activePoi != null) {
    if (activePoi.id == poiId) {
      $('#guidance').html('Stop guidance');
    } else {
      $('#guidance').html('Start guidance');
    }
  } else {
    $('#guidance').html('Start guidance');
  }
  var pois = new Array();
  pois.push(currentListedPoi);
  updateMapView(pois);
}

function updatePoiListView(type) {
  $('#pl-header').html(type);
  $('#poi-list').empty();
  for (var i = 0; i < currentPoiList.length; i++) {
    createPoiListEntry(currentPoiList[i]);
  }
  if (currentPoiList.length == 0) {
    $('#poi-list').html('<li>No POIs found.</li>');
  }
  updateMapView(currentPoiList);
}

function requestGuidance() {
  var tId = wt.determineTravelForPoi(currentListedPoi.id);
  status = true;
  if ($('#guidance').html() == 'Stop guidance') {
    status = false;
    $('#guidance').html('Start guidance');
  } else {
    $('#guidance').html('Stop guidance');
  }
  wt.setPoiActive(currentListedPoi.id, tId, status);
  updateNavigationTree();
  doExport();
}

function markAsReached() {
  var tId = wt.determineTravelForPoi(currentListedPoi.id);
  var status = true;
  if ($('#markreached').html() == 'Mark as unvisited') {
    status = false;
    $('#markreached').html('Mark as visited');
  } else {
    $('#markreached').html('Mark as unvisited');
  }
  wt.markPoiAsVisited(currentListedPoi.id, tId, status);
  updateNavigationTree();
  doExport();
}

function initializeMap() {
  var mapOptions = {
    zoom: 15,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: centerPoint,
    scaleControl: false,
    streetViewControl: false,
    navigationControl: false,
    mapTypeControl: false
  };
  map = new google.maps.Map(document.getElementById("mapcanvas"), mapOptions);
  geocoder = new google.maps.Geocoder();
}