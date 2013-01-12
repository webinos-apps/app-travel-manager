/*  OSM
 
function init_map() {
	map = new OpenLayers.Map("map_canvas");
	var mapnik = new OpenLayers.Layer.OSM();
	map.addLayer(mapnik);
}

function show_position(p)
{
	var lonLat = new OpenLayers.LonLat( p.coords.longitude,p.coords.latitude )
    .transform(
      new OpenLayers.Projection("EPSG:4326"), // transform from WGS 1984
      map.getProjectionObject() // to Spherical Mercator Projection
    );
	
	var markers = new OpenLayers.Layer.Markers( "Markers" );
    map.addLayer(markers);
 
    markers.addMarker(new OpenLayers.Marker(lonLat));
 
    map.setCenter (lonLat, 12);

}
*/

/* GOOGLE MAPS CODE */
function init_map()
{
    var myOptions = {
	      zoom: 4,
	      mapTypeControl: false,
	      mapTypeControlOptions: {style: google.maps.MapTypeControlStyle.DROPDOWN_MENU},
	      navigationControl: true,
	      navigationControlOptions: {style: google.maps.NavigationControlStyle.SMALL},
	      mapTypeId: google.maps.MapTypeId.ROADMAP
	    }
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
}

function initialize_geolocation()
{
	try{
		if(currentPosition != null){
			show_position(currenPosition);
		}
		if(connectedSystems.length >= 1){
			bindToGeolocationSystem(connectedSystems[0].serviceAddress);
		}else{
			wt.addWebinosReadyListener(function(){
			bindToGeolocationSystem(connectedSystems[0].serviceAddress);
		});
		}
	}catch(e){
		errorHandler();
	}
	
	
}

function bindToGeolocationSystem(serviceAddress){
	webinos.discovery.findServices(new ServiceType("http://www.w3.org/ns/api-perms/geolocation"), {
			onFound: function (service) {
				if(service.serviceAddress == serviceAddress){
					geolocation = service;
					geolocation.bindService({
						onBind: function () {
							geolocation.getCurrentPosition(show_position, errorHandler);
						}
					});
				}
			},
			onError: function (error) {
				errorHandler();
			}
	});
}

function errorHandler(){
		if(geo_position_js.init()) {
			coordbox.innerHTML="Receiving...";
			geo_position_js.getCurrentPosition(show_position,function(){coordbox.innerHTML="Couldn't get location"},{enableHighAccuracy:true});
		} else {
			coordbox.innerHTML="Functionality not available";
		}

}

function show_position(p)
{
	//document.getElementById('current').innerHTML="latitude="+p.coords.latitude.toFixed(2)+" longitude="+p.coords.longitude.toFixed(2);
	var pos=new google.maps.LatLng(p.coords.latitude,p.coords.longitude);
	//var pos=new google.maps.LatLng(52.00,14.00);
	map.setCenter(pos);
	map.setZoom(14);
	//if(typeof currentPage !== "undefined") {
	//	if(currentPage == 'addEditTravel') {
	//		set_markerWinfobox(pos, wt_pois[2]);
	//	}
	//}
}

function set_markerWinfobox(pos, poi) {
	var boxText = document.createElement("div");
    boxText.className = "infoboxcontent";
    boxText.innerHTML = '<div class="mappoithumbs">\
				<img src="../../images/poi_nopic.png">\
				<div>\
					<h4>'+ poi.title +'</h4>\
					<p>'+ capitaliseFirstLetter(poi.address.city.toLowerCase()) +', '+ capitaliseFirstLetter(poi.address.street.toLowerCase()) +' '+ poi.address.streetnumber +'</p>\
    				<button id="addPOIbtn' +poi.id+ '" rel="#add">Add POI</button>\
				</div>\
		</div>';
            
    var boxOptions = {
		 content: boxText
		,disableAutoPan: false
		,maxWidth: 0
		,pixelOffset: new google.maps.Size(-130, 0)
		,zIndex: null
		,boxStyle: {
			opacity: 0.85
			,width: "260px" //TODO: make this dynamic (%s are out of question)
		}
		,closeBoxMargin: "10px 2px 2px 2px"
		,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
		,infoBoxClearance: new google.maps.Size(35, 30)
		,isHidden: false
		,pane: "floatPane"
		,enableEventPropagation: false
    };

    var ib = new InfoBox(boxOptions);

	//var infowindow = new google.maps.InfoBox({
	//    content: "<strong>yes</strong>"
	//});

	var marker = new google.maps.Marker({
	    position: pos,
	    map: map,
	    title: poi.title + "\n" + poi.description
	});

	google.maps.event.addListener(marker, 'click', function() {
		//infowindow.open(map,marker);
		//document.getElementById('poiId').innerHTML = poi.id;
		ib.open(map, marker);
	});
	google.maps.event.addListener(ib, 'domready', function() {
		thisib = this;
		$('#addPOIbtn' +poi.id).overlay({
			top: 'center',
			close: "a.close",
			onLoad: function(){
				var ovrl = this.getOverlay();
				ovrl.css('height', ovrl.height());
				thisib.close();
				map.panTo(pos);
			}
		});
		$('#addPOIlistbtn').off('click.addpoi');
		$('#addPOIlistbtn').on('click.addpoi', function() {TravelEditor.addPOIToTravel(poi.id)} );
	});

	return marker;
}

//no parameters = 100% of body - header - footer
//if first parameter set, then the above minus the amount of px
//if first null/undefined, and second value in px or % - set it that way
function setMapHeight(reservedHeight, definedHeight) {
	if (!definedHeight) {
		reservedHeight = reservedHeight || 0; //optional
		var mapBodyHeight = window.innerHeight - $("header").innerHeight() - $("footer").innerHeight() - reservedHeight;
	} else {
		if (definedHeight.indexOf('%') != '-1') {
			definedHeight = parseInt(definedHeight) / 100;
			mapBodyHeight = Math.floor(window.innerHeight * definedHeight);
		} else {
			mapBodyHeight = definedHeight;
		}
	}
	$('#map-holder').height(mapBodyHeight);
}

function setMapWidth() {
	var mapBodyWidth = window.innerWidth/2 - window.innerWidth * 0.03; //-3% margin to make it look good
	$('#map-holder').width(mapBodyWidth);
}
