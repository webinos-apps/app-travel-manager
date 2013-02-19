//INITIAL DATA
var wt_travels = new Array();
var wt_pois = new Array();
var wt_poitravels = new Array();
var wt_deletiontasks = new Array();
var wt_update = null;
var wt_export = null;
var wt_remoteUpdates = null;


var connectedSystems = new Array();

var wt = wt || {}; //namespace to contain the general functions

var currentListedPoi = new Object(); /* POI WHICH IS DISPLAYED OR HAS BEEN DISPLAYED LAST RECENTLY */
var currentListedTravel = new Object(); /* TRAVEL WHICH IS DISPLAYED OR HAS BEEN DISPLAYED LAST RECENTLY */
var currentPoiList = wt_pois;

var poisNearBy = new Array();

var currentPosition = null;

var activeTravel = null; /* TRAVEL WHICH IS CURRENTLY ACTIVE - TIMEWISE*/
var activePoi = null; /* POI TO WHICH THE GUIDANCE IS ACTIVE */

var pastTravels = new Array();
var plannedTravels = new Array();


var wt_logListeners = new Array();
var wt_webinosReadyListeners = new Array();
var wt_deviceFoundListeners = new Array();


//THRESHOLDS
wt.range = 0.1 
wt.defaulRangeNearby = 50.0;

wt.defaults = new Object();
wt.defaults.rangeReached = 0.1; //kilometers
wt.defaults.rangeNearby = 30.0; //kilometers
wt.defaults.nextPlannedPois = 20; //days

currentListedPoi.id = null;
currentListedTravel.id = null;

wt.Travel = function(id, title, description, startDate, endDate, lastModified) {
	this.id = id;
	this.title = title;
	this.description = description;
	this.startDate = startDate;
	this.endDate = endDate;
	this.lastModified = lastModified;
}

wt.Poi = function(id, title, description, position, address){
	this.id = id;
	this.title = title;
	this.description = description;
	this.position = position;
	this.address = address;
	this.lastModified = new Date().getTime();
}

wt.PoiTravel = function(id, poiId, travelId, plannedVisit, order, notes){
	this.id = id;
	this.poiId = poiId;
	this.travelId = travelId;
	this.plannedVisit = plannedVisit;
	this.order = order;
	this.notes = notes;
	this.lastModified = new Date().getTime();
	this.visited = false;
	this.active = false;
}

wt.Coordinates = function(lat, lng){
	this.latitude = lat;
	this.longitude = lng;
	this.altitude = null;
}

wt.Address = function (street, streetnumber, postalcode, city, state, country){
	this.street = street;
	this.streetnumber = streetnumber;
	this.postalcode = postalcode;
	this.city = city;
	this.state = state;
	this.country = country;
}

wt.DeletionTask = function(id, type, objectId){
	this.id = id;
	this.type = type;
	this.objectId = objectId;
	this.timestamp = new Date().getTime();
}

wt.initializeData = function(){
	wt_travels = JSON.parse(localStorage.getItem("wt_travels"));
	wt_pois = JSON.parse(localStorage.getItem("wt_pois"));
	wt_poitravels = JSON.parse(localStorage.getItem("wt_poitravels"));
	wt_deletiontasks = JSON.parse(localStorage.getItem("wt_deletiontasks"));
	wt_export = JSON.parse(localStorage.getItem("wt_export"));
	wt_update = JSON.parse(localStorage.getItem("wt_update"));
	try {
		wt_remoteUpdates = JSON.parse(localStorage.getItem("wt_remoteUpdates"));
	} catch (e) {
		console.log('Exception during reading wt_remoteUpdates from localStorage! Exception: ...');
		console.log(e);
		wt_remoteUpdates = new Array();
		localStorage.setItem("wt_remoteUpdates", JSON.stringify(wt_remoteUpdates));
		console.log('wt_remoteUpdates was re-initialized!');
	}
	
	// if (wt_remoteUpdates == null) {
		// var data = localStorage.getItem("wt_remoteUpdates");
		// if (data == null || data == "") {
			// wt_remoteUpdates = new Array();
			// wt_remoteUpdates = localStorage.setItem("wt_remoteUpdates", JSON.stringify(wt_remoteUpdates));
	// }
	
	if(wt_deletiontasks == null){
		wt_deletiontasks = new Array();
	}
	
	
	if(wt_travels == null){
		console.log('No data available');
		console.log('Creating dummy data');
		wt_travels = new Array();
		wt_pois = new Array();
		wt_poitravels = new Array();
		wt_deletiontasks = new Array();
		/*
		var t1 = new wt.Travel(1,'Krakau Calling', 'Webinos meeting in Krakau. Codefest', new Date(2012, 3, 10).getTime(), new Date(2012, 3, 15).getTime(), new Date().getTime());
		var t2 = new wt.Travel(2,'Krakau 2', 'Webinos meeting in Krakau. Codefest', new Date(2012, 2, 1).getTime(), new Date(2012, 2, 3).getTime(), new Date().getTime());

		var p1 = new wt.Poi(1, 'Radisson Blu', 'Hotel for the stay', new wt.Coordinates(50.06465009999999, 19.94497990000002), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p2 = new wt.Poi(2, 'Burg Wafel', 'Must see', new wt.Coordinates(50.05252729919239, 19.936911815283224), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p3 = new wt.Poi(3, 'Whatever Point...', 'Must see 2', new wt.Coordinates(50.05550317941623, 19.911505931494162), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p4 = new wt.Poi(4, 'Another Spot...', 'Must see 2', new wt.Coordinates(50.07456647688711, 19.910132640478537), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		//rog: test in Berlin
//		var p4 = new wt.Poi(4, 'Ronny - Test in Berlin', 'Must see 2', new wt.Coordinates(52.4815, 13.440567), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p5 = new wt.Poi(5, 'Hard Rock Cafe', 'Must see 2', new wt.Coordinates(50.07456647688711, 19.910132640478537), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p6 = new wt.Poi(6, 'Grand Central Station', 'Must see 2', new wt.Coordinates(50.06509087140172, 19.947383159277365), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));
		var p7 = new wt.Poi(7, 'Airport', 'Going for touchdown here', new wt.Coordinates(50.07588850555389, 19.786021464941427), new wt.Address('STRASZEWSKIEGO','17','','KRAKUAU','KLEINPOLEN','POLEN'));		
		var p8 = new wt.Poi(10, 'BMW Forschung & Technik', '', new wt.Coordinates(48.1448353, 11.558006699999964), new wt.Address('HANAUER STR.','46','','MÜNCHEN','BAYERN','DEUTSCHLAND'));
        
		wt_travels.push(t1);
		wt_travels.push(t2);
		
		wt_pois.push(p1);
		wt_pois.push(p2);
		wt_pois.push(p3);
		wt_pois.push(p4);
		wt_pois.push(p5);
		wt_pois.push(p6);
		wt_pois.push(p7);
		
		wt_pois.push(p8);
		
		wt_poitravels.push(new wt.PoiTravel(1,1,1, new Date(2012, 3, 10).getTime(), 1, "I shall make my nest here and lay some eggs in the following days"));
		wt_poitravels.push(new wt.PoiTravel(2,2,1, new Date(2012, 3, 10).getTime(), 0, ""));
		wt_poitravels.push(new wt.PoiTravel(3,3,1, new Date(2012, 3, 12).getTime(), 0, "I don't like it, but I'll visit it anyway"));
		wt_poitravels.push(new wt.PoiTravel(4,4,1, new Date(2012, 3, 14).getTime(), 0, "17:25-23:55. Something must happen."));
		wt_poitravels.push(new wt.PoiTravel(5,5,1, new Date(2012, 3, 13).getTime(), 0, "Let's devour here all night"));
		wt_poitravels.push(new wt.PoiTravel(6,6,1, new Date(2012, 3, 12).getTime(), 0, "She said meet me at the gates, don't be late."));
		wt_poitravels.push(new wt.PoiTravel(7,7,1, new Date(2012, 3, 15).getTime(), 0, "We will leave twin vapour trails in the air, white lines etched into these rocks."));		
		
		wt_poitravels.push(new wt.PoiTravel(8,1,2, new Date(2012, 2, 1).getTime(), 0, "Danish dessert pie chocolate bar chocolate bar lemon drops tootsie roll topping. Chocolate bar lemon drops toffee wafer topping tootsie roll fruitcake topping. Candy bonbon bear claw faworki gummi bears jelly powder sesame snaps. Gummi bears sugar plum donut cookie chocolate bar brownie faworki. Halvah muffin lollipop bear claw jelly beans chocolate cake pudding toffee cupcake."));
		wt_poitravels.push(new wt.PoiTravel(9,2,2, new Date(2012, 2, 2).getTime(), 0, "Wafer candy oat cake chocolate bar cake macaroon tootsie roll lollipop donut."));
		wt_poitravels.push(new wt.PoiTravel(10,5,2, new Date(2012, 2, 3).getTime(), 0, "Donut pastry chupa chups croissant tiramisu. Croissant tart cupcake."));
		
		
		*/
		wt.saveDataToLocalStorage();
	}
	
	activeTravel = wt.getActiveTravel();
	activePoi = wt.getActivePoi();
	wt.getPastTravels();
	wt.getPlannedTravels();
}

wt.refreshData = function(){
	activeTravel = wt.getActiveTravel();
	activePoi = wt.getActivePoi();
	wt.getPastTravels();
	wt.getPlannedTravels();
}



wt.saveDataToLocalStorage = function(){
	localStorage.setItem("wt_travels", JSON.stringify(wt_travels));
	localStorage.setItem("wt_pois", JSON.stringify(wt_pois));
	localStorage.setItem("wt_poitravels", JSON.stringify(wt_poitravels));
	localStorage.setItem("wt_deletiontasks", JSON.stringify(wt_deletiontasks));
	localStorage.setItem("wt_export", JSON.stringify(wt_export));
	localStorage.setItem("wt_update", JSON.stringify(wt_update));	
	localStorage.setItem("wt_remoteUpdates", JSON.stringify(wt_remoteUpdates));
	console.log('all data saved in local storage objects');
}

wt.newId = function(el){
	if(el.length == 0){
		return 1;
	}else{
		return el[el.length-1].id + 1;
	}
}

wt.getTravel = function(id){
	var travelData = null;
	var tmp;
	for(var i = 0; i < wt_travels.length; i++){
		if(wt_travels[i].id == id){
			travelData = wt_travels[i];
			tmp = wt.getPoisForTravel(wt_travels[i].id);
			travelData.pois = tmp.pois;
			travelData.travelpois = tmp.travelpois;
			return travelData;
		}
	}
}

wt.getPoisForTravel = function(id){
	var travelpois = new Array();
	var poiIds = new Array();
	for(var i = 0, iend = wt_poitravels.length; i < iend; i++){
		if(wt_poitravels[i].travelId == id){
			travelpois.push(wt_poitravels[i]);
			poiIds.push(wt_poitravels[i].poiId);
		}
	}
	var pois = new Array();
	for(var i = 0, iend = wt_pois.length; i < iend; i++){
		if(poiIds.indexOf(wt_pois[i].id) != -1){
			pois.push(wt_pois[i]);
		}
	}
	return {
		'pois': pois,
		'travelpois': travelpois
	};
}

wt.getTravelPois = function(id){
	var travelpois = new Array();
	for(var i = 0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].travelId == id){
			travelpois.push(wt_poitravels[i]);
		}
	}
	return travelpois;
}

wt.getPoiDetails = function(poiId){
	for(var i = 0; i < wt_pois.length; i++){
		if(wt_pois[i].id == poiId){
			return wt_pois[i];
		}
	}
}

wt.getPoiTravelDetails = function(poiId, travelId){
	for(var i=0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].poiId == poiId && wt_poitravels[i].travelId == travelId){
			return wt_poitravels[i];
		}
	}
	return null;
}

//for saving existing entities
wt.getTravelIndex = function(id) {
	for(var i = 0, iend = wt_travels.length; i < iend; i++){
		if(wt_travels[i].id == id){
			return i;
		}
	}
}
wt.getPoiTravelIndex = function(id) {
	for(var i = 0, iend = wt_poitravels.length; i < iend; i++){
		if(wt_poitravels[i].id == id){
			return i;
		}
	}
}

/**
 * It marks all the POIs on the map; as we don't have many of them now it's not a problem,
 * but later that should probably be changed to get only POIs from an area close to the current location
 * and get more only if map is scrolled enough.
*/
//var currentMapBounds;
//var currentMapMarkers = new Array();
//function updateMapView(pois){
wt.getAllPOIs = function() {
	//for(var i = 0; i < currentMapMarkers.length; i++){
	//	currentMapMarkers[i].setMap(null);
	//}
	//currentMapMarkers = new Array();
	//currentMapBounds = new google.maps.LatLngBounds();
	
	for(var i = 0; i < wt_pois.length; i ++){
		var markerPoint = new google.maps.LatLng(wt_pois[i].position.latitude, wt_pois[i].position.longitude);
		mrksPoi.push(set_markerWinfobox(markerPoint, wt_pois[i]));
		//currentMapBounds = currentMapBounds.extend(markerPoint);
		//currentMapMarkers.push(marker); //that should be moved to set_markerWinfobox, or the marker returned by it
	}
	//map.fitBounds(currentMapBounds);
}

/**
* Detemines the current active poi and returns it
* @returns POI object of the current active POI
*/
wt.getActivePoi = function(){
	for(var i=0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].active == 'true' || wt_poitravels[i].active == true){
			for(var j = 0; j < wt_pois.length; j++){
				if(wt_pois[j].id == wt_poitravels[i].poiId){
					return wt_pois[j];
				}
			}
		}
	}
	
	return null;
}

/**
* Sets a POI as active for guidance.
*/
wt.setPoiActive = function(poiId, travelId, status){
	if(status == null){
		status = true;
	}
	
	var activated = false;
	for(var i= 0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].poiId == poiId && travelId == wt_poitravels[i].travelId){
			wt_poitravels[i].active = status;
			wt_poitravels[i].lastModified = new Date().getTime();
			activated = true;
		}else if(wt_poitravels[i].active) {
			//deactivate all the other POIs.
			wt_poitravels[i].active = false;
			wt_poitravels[i].lastModified = new Date().getTime();
		}
	}
	
	//JUST FOR TESTS
	wt.saveDataToLocalStorage();
	activePoi = wt.getActivePoi();
	return activated;
}

/**
* Marks a given POI as visited.
*/
wt.markPoiAsVisited = function(poiId, travelId, status){
	
	if(status == null){
		status = false;
	}

	for(var i= 0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].poiId == poiId && travelId == wt_poitravels[i].travelId){
			wt_poitravels[i].visited = status;
			wt_poitravels[i].active = false;
			wt_poitravels[i].lastModified = new Date().getTime();
			wt.saveDataToLocalStorage();
			activePoi = null;
			return true;
		}
	}
	
	return false;
}


wt.getActiveTravel = function(){
	var currentTime = new Date().getTime();
	for(var i=0; i < wt_travels.length; i++){
		if(wt_travels[i].startDate <= currentTime && wt_travels[i].endDate >= currentTime){
			return wt_travels[i];
		}
	}
	return null;
}

wt.getPastTravels = function(){
    pastTravels = new Array();
	var currentTime = new Date().getTime();
	for(var i=0; i < wt_travels.length; i++){
		if(wt_travels[i].endDate <= currentTime){
			pastTravels.push(wt_travels[i]);
		}
	}
}

wt.getPlannedTravels = function(){
	var currentTime = new Date().getTime();
	plannedTravels = new Array();
	for(var i=0; i < wt_travels.length; i++){
		if(wt_travels[i].startDate > currentTime){
			plannedTravels.push(wt_travels[i]);
		}
	}
}

wt.getConflictingActiveTravels = function(){
	var currentTime = new Date().getTime();
	var conflictingTravels = new Array;
	for(var i=0; i < wt_travels.length; i++){
		if(wt_travels[i].startDate <= currentTime && wt_travels[i].endDate >= currentTime){
			conflictingTravels.push(wt_travels[i]);
		}
	}
	return conflictingTravels;
}

wt.getAllNonPastTravels = function(){
	var currentTime = new Date().getTime();
	var nonpasttravels = new Array;
	for(var i=0; i < wt_travels.length; i++){
		if(wt_travels[i].endDate >= currentTime){
			nonpasttravels.push(wt_travels[i]);
		}
	}
	return nonpasttravels;
}

wt.getPoisNearby = function(position, range){
	if(range == null){
		range = wt.defaults.rangeNearby;
	}
	var pois = new Array();
	for(var i = 0; i < wt_pois.length; i++){
		if(wt.calculateDistance(position.coords, wt_pois[i].position) <= range)
			pois.push(wt_pois[i]);
	}
	return pois;
}

wt.calculateDistance = function (a, b){
	var R = 6371; // km
	if (typeof(Number.prototype.toRad) === "undefined") {
 		Number.prototype.toRad = function() {
    		return this * Math.PI / 180;
  		}
	}	
	var dLat = (b.latitude-a.latitude).toRad();
	var dLon = (b.longitude-a.longitude).toRad();
	var lat1 = parseFloat(a.latitude).toRad();
	var lat2 = parseFloat(b.latitude).toRad();
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
	return R * c;
}

wt.getPoisPlanned = function(daysInAdvance){
	if(daysInAdvance == null){
		daysInAdvance = nextPlannedPois;
	}
	var now = new Date().getTime()
	var threshold = now + daysInAdvance*24*60*60*1000;
	var poiIds = new Array()
	var pois = new Array();
	for(var i=0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].plannedVisit > now && wt_poitravels[i].plannedVisit <=  threshold && !wt_poitravels[i].visited){
			poiIds.push(wt_poitravels[i].poiId);
		}
	}
	for(var i=0; i < wt_pois.length; i++){
		if( poiIds.indexOf(wt_pois[i].id) != -1){
			pois.push(wt_pois[i]);
		}
	}
	return pois;
}

wt.getPoisVisited = function(){
	var poiIds = new Array()
	var pois = new Array();
	for(var i=0; i < wt_poitravels.length; i++){
		if(wt_poitravels[i].visited){
			poiIds.push(wt_poitravels[i].poiId);
		}
	}
	for(var i=0; i < wt_pois.length; i++){
		if( poiIds.indexOf(wt_pois[i].id) != -1){
			pois.push(wt_pois[i]);
		}
	}
	return pois;
}

wt.determineTravelForPoi = function(poiId){
	//Check if currentlisted travel id exist
	if(currentListedTravel.id != null){
		return currentListedTravel.id;
	//Check if there is an active travel
    }else if(activeTravel != null){

		//CHECK IF POI IS PART OF ANY TRAVEL
		if(activeTravel.id != null){
			if(!wt.isPoiPartOfTravel(poiId, activeTravel.id)){
				wt_poitravels.push(new wt.PoiTravel(new Date().getTime(), poiId, activeTravel.id, null, null, null));
				return activeTravel.id;
			}else{
				return activeTravel.id;
			}
		}else{
			//CHECK IF POI IS PART OF ANY TRAVEL
			if(!wt.isPoiPartOfTravel(poiId, 0)){
				wt_poitravels.push(new wt.PoiTravel(new Date().getTime(), poiId, 0, null, null, null));
			}
			return 0;
		}	
	}else{
		//CHECK IF POI IS PART OF ANY TRAVEL
		if(!wt.isPoiPartOfTravel(poiId, 0)){
			wt_poitravels.push(new wt.PoiTravel(new Date().getTime(), poiId, 0, null, null, null));
		}
		return 0;
	}
}


wt.isPoiPartOfTravel = function(poiId, travelId){
	for(i=0; i<wt_poitravels.length; i++){
		if(wt_poitravels[i].poiId == poiId && wt_poitravels[i].travelId == travelId){
			return true;
		}
	}
	return false;
}

wt.addLogListener = function(callback){
	 wt_logListeners.push(callback);
}

wt.addWebinosReadyListener = function(callback){
	wt_webinosReadyListeners.push(callback);
}

wt.webinosReady = function(){
	for(var i=0;  i < wt_webinosReadyListeners.length; i++){
		wt_webinosReadyListeners[i]();
	}
}


wt.addDeviceFoundListener = function(callback){
	
	wt_deviceFoundListeners.push(callback);
}

wt.newDeviceFound = function(deviceName){
	for(var i=0;  i < wt_deviceFoundListeners.length; i++){
		wt_deviceFoundListeners[i](deviceName);
	}
}


wt.log = function(message){
	for(var i=0;  i < wt_logListeners.length; i++){
		wt_logListeners[i](message);
	}
}

wt.connectToWebinos = function(){
	var myDevice = wt.distillDeviceInfo(webinos.session.getPZPId());
	wt.log("Your device: " + myDevice.name);
	wt.newDeviceFound(myDevice.name + ' (This device)');
	
	connectedSystems.push(webinos.session.getPZPId());
	var otherDevices = webinos.session.getOtherPZP();
	for(var i =0; i < otherDevices.length; i++){
		connectedSystems.push(otherDevices[i]);
		wt.newDeviceFound(wt.distillDeviceInfo(otherDevices[i]).name);
	}
	console.log(otherDevices);
	wt.webinosReady();

};

wt.init = function(){
	// Ensures that the doUpdate is triggered in case that the travel-sync was already initialized and we missed the callback
	// prevents from adding a redundant listener
	if(updateReady){
		doUpdate();
		wt.startSyncInterval();
	} else {
		sync.addUpdateReadyListener(function(){
			doUpdate();
			wt.startSyncInterval();
		});
	}
}

wt.defaultInterval = 1000*60*1.5 // 90 seconds
wt.syncIntervalId = null;

wt.startSyncInterval = function(){
	wt.syncIntervalId = setInterval('wt.intervalSync()',wt.defaultInterval);
}

//Currently not used
wt.stopSyncInterval = function(){
	clearInterval(wt.syncIntervalId);
}

wt.intervalSync= function(){
	doUpdate();
}

wt.distillDeviceInfo = function(serviceAddress){
    var hubIp = serviceAddress.substring(0,serviceAddress.indexOf('_'));
    var zoneId = serviceAddress.substring(serviceAddress.indexOf('_')+1, serviceAddress.indexOf('/')); //user
    var hostPzp = serviceAddress.substring(serviceAddress.indexOf('/')+1); //device
    return new WebinosDevice(hostPzp, zoneId);
};



$(document).ready(function() {
	wt.initializeData();
	try{
		webinos.session.addListener('registeredBrowser', function () {
			wt.addWebinosReadyListener(wt.init);
			wt.connectToWebinos();
		});

		
		
	}catch(e){
		alert('webinos not available. Using locally');
		console.log(e);

	}
	sync.addUpdateCompletedListener(function(){
		doExport();
	});
});

$(document).unload(function(){
	wt.saveDataToLocalStorage();
});

function WebinosDevice(name, user){ 
        this.name=name;
        this.user=user;
};
