var syncInterval = 60000; // every 60 sec.
var isCycleClosed = true;

$(document).ready(function() {
	
	setTimeout(hideURLbar, 0);
	
	
	sync.addSyncStatusListener(function(message){
		$('#devicesyncstatus').html(message);
	});
	

	
	//sliding out profile menu
	$(".profilemenu > a").click(function() {
		$('#profilemenu').slideToggle('500');
		return false;
	});
	
	if($("header a[rel]").length != 0) {
		appendSyncOverlay();
	}
	
	$('#syncbutton').click(function(){
		// TODO Does not check if the travel-sync is ready
		if (updateReady) {
			doUpdate();		
		} else {
			sync.updateSyncStatus('Connection not ready yet! Try again!');
		}
	});

	
	
	if(connectedSystems.length >= 1){
		$('#devicelist').append('<p><b>' + wt.distillDeviceInfo(connectedSystems[0].serviceAddress).name +' (this)</b></p>');
	}

	if(connectedSystems.length > 1){
		for(var i = 1; i < connectedSystems.length; i++){
			$('#devicelist').append('<p>' + wt.distillDeviceInfo(connectedSystems[0].serviceAddress).name +'</p>');
		}
	}
	
	wt.addDeviceFoundListener(function(deviceName){
		$('#devicelist').append('<p>' +  deviceName +'</p>');
	});
	


});

/********************************************************
 * GENERAL FUNCTIONS
 */

 
/* Hide Address Bar */
function hideURLbar(){
	window.scrollTo(0,1);
}

var isLoggedIn = function() {
	if(localStorage.getItem("loggedin") == "aye") {
		//window.location = 'travel/index.html';
	} else { //faux log in action as a temp. solution
		localStorage.setItem("loggedin", "aye");
	}
}

function capitaliseFirstLetter(string) { //http://stackoverflow.com/questions/1026069/capitalize-the-first-letter-of-string-in-javascript
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var urlParams = {}; //http://stackoverflow.com/questions/901115/get-query-string-values-in-javascript
					// USAGE
					// 1) urlParams["variable"] -> stuff
					// 2) "variable" in urlParams -> true/false
(function () {
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q))
       urlParams[d(e[1])] = d(e[2]);
})();

function datesEqual(a, b) { //http://stackoverflow.com/questions/492994/compare-2-dates-with-javascript
	var res = (a-b);
	return (res >= -3600000 && res <= 3600000); //3600000 = 1hr of daylight saving that could occur
}

function htmlEscape(str) { //http://stackoverflow.com/questions/1219860/javascript-jquery-html-encoding
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}
function htmlUnescape(encodedStr) { //http://stackoverflow.com/questions/1147359/how-to-decode-html-entities-using-jquery
	return $("<div/>").html(encodedStr).text();
}

var appendSyncOverlay = function() {
	$('body').append('<div class="overlay" id="syncoverlay">\
		<h3>Sync Devices</h3>\
		<hr>\
		<button id="syncbutton">Sync now</button>\
		<p id="devicesyncstatus">Status</p>\
		<div class="deviceslist" id="devicelist">\
		</div>\
		<a class="button close">Close</a>\
	</div>');
	
	$("header a[rel]").overlay({
		top: 'center',
		close: "a.close",
		onLoad: function(){
			var ovrl = this.getOverlay();
			ovrl.css('height', ovrl.height());
		}
	});
}

/********************************************************
 * TRAVEL GENERAL/EDITOR
 */

var TravelGeneral = TravelGeneral || {};
var TravelEditor = TravelEditor || {};

TravelGeneral.layout = new Array;

TravelGeneral.PageInit = function() {
	TravelGeneral.layout[0] = new Array; //first element will hold orphaned POIs
	TravelGeneral.initializeLayoutVar();
}

TravelEditor.PageInit = function() {
	var datestartdiv = $('#datestart');
	var dateenddiv = $('#dateend');
	var dates = $( "#datestart , #dateend" ).datepicker({
		dateFormat: "yy-mm-dd",
		onSelect: function( selectedDate ) {
			var option = this.id == "datestart" ? "minDate" : "maxDate",
				instance = $( this ).data( "datepicker" ),
				date = $.datepicker.parseDate(
					instance.settings.dateFormat ||
					$.datepicker._defaults.dateFormat,
					selectedDate, instance.settings );
			dates.not( this ).datepicker( "option", option, date );
			if(datestartdiv.val() != '' && dateenddiv.val() != '') {
				$('#step2btn').show();
				var startDate = new Date(parseInt($("#datestarthid").val(),10));
				var endDate = new Date(parseInt($("#dateendhid").val(),10));
				
				TravelEditor.drawTravel(startDate, endDate);
			}
		}
	});
	datestartdiv.datepicker("option", {altField: "#datestarthid", altFormat: "@"});
	dateenddiv.datepicker("option", {altField: "#dateendhid", altFormat: "@"});
	
	if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) { //IF EDITING PREVIOUSLY SAVED TRAVEL
		TravelEditor.drawTravelById(urlParams['id']);
		//console.log(TravelGeneral.layout[1].date);
		datestartdiv.datepicker("setDate", TravelGeneral.layout[1].date);
		dateenddiv.datepicker("setDate", TravelGeneral.layout[TravelGeneral.layout.length-1].date);
		
		$('#trvlaction').text('Edit Travel');
		$('#submit').text('Update Travel'); //TODO: could be moved to html in 2 spans + css show/hide
	}
	
	// FORM SECTIONS - GENERAL
	//if(window.innerWidth < 1200) {
		//events for the buttons
		$('#step2btn').on("click", function() {
			$('#step2btn, #step1').hide('fast'); //+ #step3
			$('#step2, #step1btn, #submit').show('fast'); //+ #step3btn
			if(window.innerWidth < 1200) {
				$('.addtravelmap').show('fast', function() {
					google.maps.event.trigger(map, 'resize');
					tsearch.conductSearch(); //tsearch from addedit.html
				});
			}
		});
//		$('#step3btn').on("click", function() {
//			$('#step3btn, #step1, #step2').hide();
//			if(window.innerWidth < 1200) { $('#map-holder').hide(); };
//			$('#step3, #step1btn, #step2btn').show();
//		});
		$('#step1btn').on("click", function() {
			$('#step1btn, #step2').hide('fast'); //+ #step3
			if(window.innerWidth < 1200) { $('.addtravelmap').hide('fast'); };
			$('#step1, #step2btn').show('fast'); //+ #step3btn
		});
	//}
		// FORM SECTIONS - EDIT
		if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) {
			$('#step2btn, #step1').hide('fast'); //+ #step3
			$('#step2, #step1btn, #submit').show('fast'); //+ #step3btn
			if(window.innerWidth < 1200) {
				$('.addtravelmap').show('fast', function() {
					google.maps.event.trigger(map, 'resize');
					tsearch.conductSearch(); //tsearch from addedit.html
				});
			}
		}
	
	$('#submit').on("click", function() {
		var travelVerificationErrors = TravelEditor.verifyData();
		if(travelVerificationErrors) {
			alert("Travel cannot be saved. Please fix those issues:\n" + travelVerificationErrors);
			return false;
		}
		var travelSavingOutcome = TravelEditor.saveTravel();
		if(travelSavingOutcome) {
			alert("Travel saved!");
			document.location.href="travel.html?id="+travelSavingOutcome;
		} else {
			alert("Error while saving travel!");
		}
	});
/*	
	// USER LIST FUNCTIONS -- FOR PHASE 2
	var people = [
		{
			id: "123",
			label: "Robert Babicz",
			photo: ""
		},
		{
			id: "124",
			label: "Jesse Somfay",
			photo: ""
		},
		{
			id: "415",
			label: "Henry Saiz",
			photo: "user_male_low.png"
		},
		{
			id: "245",
			label: "Anneke van Giersbergen",
			photo: ""
		},
		{
			id: "967",
			label: "Dominik Eulberg",
			photo: "user_offline_low.png"
		},
		{
			id: "6789",
			label: "Arthur Oskan",
			photo: "user_male_low.png"
		},
		{
			id: "478",
			label: "Axel Helios",
			photo: "user_low.png"
		}
	];
	$( "#friends" ).autocomplete({
		source: people,
		position: { my : "left bottom", at: "left top" },
		open: function(event, ui) {
			// open function is called before autocomplete menu is displayed, 
			// so use timeout of 0 trick to let autocomplete finish 
			setTimeout(function() { TravelEditor.AutocompleteAbsolute(); }, 0);
		},
		focus: function( event, ui ) {
			$( "#friends" ).val( ui.item.label );
			return false;
		},
		select: function( event, ui ) {
			$( "#friends" ).val( ui.item.label );
			$( "#friends-id" ).val( ui.item.id );
			$( "#friends-photo" ).val(ui.item.photo );
			return false;
		}
	}).data( "autocomplete" )._renderItem = function( ul, item ) {
		if (item.photo == '') {
			itemphoto = '../img/contact.png';
		} else {
			itemphoto = '../img/' + item.photo;
		}
		return $( "<li></li>" )
			.data( "item.autocomplete", item )
			.append( "<a><img src=" + itemphoto + ">" + item.label + "</a>" )
			.appendTo( ul );
	};

	$("#addfriend").click(function() {
		//check id here and go and add id somewhere + below or return false
		var docfrag = document.createDocumentFragment();
		//<li><img src="../img/contact.png"><h4>User Name</h4></li>
		var frli = document.createElement("li");
	    var frimg = document.createElement("img");
		var frimgsrc = $("#friends-photo").val();
		if (frimgsrc == '') {
			frimgsrc = '../img/contact.png';
		} else {
			frimgsrc = '../img/' + frimgsrc;
		}
		frimg.src = frimgsrc;
		frli.appendChild(frimg);
		var frh4 = document.createElement("h4");
		var frh4text = document.createTextNode($("#friends").val());
		frh4.appendChild(frh4text);
		frli.appendChild(frh4);
	    docfrag.appendChild(frli);
		frul = document.getElementById("friendslist");
		frul.appendChild(docfrag);
	});
*/
}

TravelGeneral.drawTravelByID = function(travelId) {//can take a second parameter ('editable') - see TravelEditor.drawTravelById
	var travelData = wt.getTravel(travelId);
	//var pois = wt.getPoisForTravel(travelId);
	TravelGeneral.createLayoutVar(new Date(travelData.startDate), new Date(travelData.endDate));
	TravelGeneral.travelLayoutVar(travelData.travelpois);
	
	//fill input name with travel.title here OR make a separate function
	if(arguments[1] == 'editable') {
		TravelGeneral.createTravelDays('edit');
		TravelGeneral.fillWithPOIs('edit');
		TravelGeneral.setTitle('edit', travelData.title);
	} else {
		TravelGeneral.createTravelDays('show');
		TravelGeneral.fillWithPOIs('show');
		TravelGeneral.setTitle('show', travelData.title);
	}
}

TravelEditor.drawTravelById = function(travelId) {
	TravelGeneral.drawTravelByID (travelId, 'editable');
}

TravelEditor.drawTravel = function(startDate, endDate) {
	if(typeof startDate === "undefined" || typeof endDate === "undefined") {
		var startDate, endDate;
		if(typeof TravelGeneral.layout === "undefined") {
			//possibly it would explode here anyway :)
			startDate = endDate = new Date();
		} else {
			startDate = TravelGeneral.layout[1].date;
			endDate = TravelGeneral.layout[TravelGeneral.layout.length-1].date;
		}
	} else {
		if(typeof TravelGeneral.layout === "undefined" || TravelGeneral.layout.length <= 1) { //fresh
			TravelGeneral.createLayoutVar(startDate, endDate);
		} else {
			TravelEditor.updateLayoutVar(startDate, endDate);
		}
	}
	
	TravelGeneral.createTravelDays('edit');
	TravelGeneral.fillWithPOIs('edit');
}

TravelGeneral.initializeLayoutVar = function() {
	var tmp = new Object();
	tmp.date = null;
	tmp.humanDate = 'unassigned';
	tmp.id = 'unassignedPOIS';
	tmp.pois = new Array;
	TravelGeneral.layout[0] = tmp;
}

TravelGeneral.createLayoutVar = function(startDate, endDate) {
	var iterationDate = startDate;
	while(iterationDate <= endDate) {
		var tmp = new Object();
		tmp.date = new Date(iterationDate);
		tmp.humanDate = iterationDate.getDate()+"."+(iterationDate.getMonth()+1)+"."+iterationDate.getFullYear();
		tmp.id = "d-"+iterationDate.getDate()+"-"+(iterationDate.getMonth()+1)+"-"+iterationDate.getFullYear();
		tmp.pois = new Array;
		TravelGeneral.layout.push(tmp);
		//next day
		iterationDate.setUTCDate(iterationDate.getUTCDate()+1);
	}
}

TravelGeneral.travelLayoutVar = function(travelPois) {
	var poidate, layoutdate, tmppoi, order;
	for(var i=0, iend=travelPois.length; i<iend; i++) {
		if(travelPois[i].plannedVisit != null) {
			poidate = new Date(travelPois[i].plannedVisit);
		} else {
			poidate = travelPois[i].plannedVisit; //unassigned
		}
//		console.log("+++++++++++++++++++");
//		console.log(poidate, poidate.getTime());
//		console.log("-------------------");
		for(var j=0, jend=TravelGeneral.layout.length; j<jend; j++) {
//			if(TravelGeneral.layout[j].date != null) {console.log(TravelGeneral.layout[j].date, TravelGeneral.layout[j].date.getTime());}
			layoutdate = TravelGeneral.layout[j].date;
			if(datesEqual(poidate, layoutdate)) { //or .getTime, but different date OBJECTS are NOT ==
				tmppoi = new Object();
				tmppoi.id = travelPois[i].id;
				tmppoi.poiId = travelPois[i].poiId;
				tmppoi.notes = travelPois[i].notes;
				order = travelPois[i].order;
				TravelGeneral.layout[j].pois[order] = tmppoi;
				break;
			}
		}
	}
}

TravelEditor.updateLayoutVar = function(startDate, endDate) {
	var iterationDate, iterationEndDate, scenario, where;
	var layFirstDay = TravelGeneral.layout[1];
	var layArrLength = TravelGeneral.layout.length;
	var layLastDay = TravelGeneral.layout[layArrLength-1];

	//new days
	if(startDate < layFirstDay.date) {//at the beginning
		scenario = 'addDays'; where = 'start';
		iterationDate = startDate;
		iterationEndDate = layFirstDay.date;
	} else if (endDate > layLastDay.date) {//at the end
		scenario = 'addDays'; where = 'end';
		iterationDate = layLastDay.date;
		iterationEndDate = endDate;
	//less days (mind the } )
	} else if (startDate > layFirstDay.date) {//at the beginning
		scenario = 'removeDays'; where = 'start';
	} else if (endDate < layLastDay.date) {//at the end
		scenario = 'removeDays'; where = 'end';
	}
	
	if(scenario == 'addDays') {//create days in temp. array
		var tmpArr = new Array;
		var firstDaySkipped = false;
		while(iterationDate <= iterationEndDate) {
			if(firstDaySkipped == false && where == 'end') {
				firstDaySkipped = true;
				iterationDate.setUTCDate(iterationDate.getUTCDate()+1);
				continue;
			}
			var tmp = new Object();
			tmp.date = new Date(iterationDate);
			tmp.humanDate = iterationDate.getDate()+"."+(iterationDate.getMonth()+1)+"."+iterationDate.getFullYear();
			tmp.id = "d-"+iterationDate.getDate()+"-"+(iterationDate.getMonth()+1)+"-"+iterationDate.getFullYear();
			tmp.pois = new Array;
			tmpArr.push(tmp);
			//next day
			iterationDate.setUTCDate(iterationDate.getUTCDate()+1);
		}
		//finish adding days by adding the new temp. array
		if(where == "start") {
			TravelGeneral.layout = TravelGeneral.layout.splice(0, 1).concat(tmpArr, TravelGeneral.layout.splice(1));
		} else if(where == "end") {
			TravelGeneral.layout = TravelGeneral.layout.concat(tmpArr);
		}
	}
	
	if(scenario == 'removeDays') {//gather pois and move them to unassigned, remove days
		if(where == "start") {
			while(TravelGeneral.layout[1].date < startDate) {
				TravelGeneral.layout[0].pois = TravelGeneral.layout[0].pois.concat(TravelGeneral.layout[1].pois);
				TravelGeneral.layout.splice(1, 1);
			}
		} else if (where == "end") {
			while(TravelGeneral.layout[TravelGeneral.layout.length-1].date > endDate) { //dynamic length
				TravelGeneral.layout[0].pois = TravelGeneral.layout[0].pois.concat(TravelGeneral.layout[TravelGeneral.layout.length-1].pois);
				TravelGeneral.layout.splice(TravelGeneral.layout.length-1, 1);
			}
		}
	}
}

TravelGeneral.createTravelDays = function(action) {
	var frul = document.getElementById('poilist');
	frul.innerHTML = ''; //clearing it
	
	if(action == 'edit') {
		var listul = document.getElementById('poicheck');
		listul.innerHTML = ''; //also clearing it
	}
	
	var docfrag = document.createDocumentFragment();
	var docfrag2 = document.createDocumentFragment();
	
	var i, j;
	if(TravelGeneral.layout[0].pois.length == 0) {
		i = 1;
	} else {
		i = 0;
	}
	for(i,j=TravelGeneral.layout.length; i < j; i++) {
		//filling up the content list fragment
		var frli = document.createElement("li");
		frli.id = TravelGeneral.layout[i].id
		var frh4 = document.createElement("h4");
		frh4.className = "date";
		var frh4text = document.createTextNode(TravelGeneral.layout[i].humanDate);
		var frh4textcopy = frh4text.cloneNode(true); //used below; TODO: don't add if "unassigned"/i=0?
		frh4.appendChild(frh4text);
		frli.appendChild(frh4);
		docfrag.appendChild(frli);
		
		if(action == 'edit') {
			//filling up pop up list fragment
			var listli = document.createElement("li");
			var listspan = document.createElement("span");
			listspan.appendChild(frh4textcopy);
			listli.appendChild(listspan);
			var listinp = document.createElement("input");
			listinp.type = 'radio';
			listinp.name = 'addpoi';
			listinp.value = frli.id;
			
			listli.appendChild(listinp);
			docfrag2.appendChild(listli);
		}
	}
	//console.log(layout); TODO: use this to fix dates? [GMT issues]
	frul.appendChild(docfrag);
	if(action == 'edit') {
		listul.appendChild(docfrag2);
	}
}

TravelEditor.addPOIToTravel = function(poiId) {
	var liDayId = $('input[name=addpoi]:checked').val();
	//push new POI id to the layout var and redraw
	for(var i = 0, j = TravelGeneral.layout.length; i < j; i++){
		if(TravelGeneral.layout[i].id == liDayId){
			var poi = new Object();
			poi.id = null;
			poi.poiId = poiId;
			poi.notes = '';
			TravelGeneral.layout[i].pois.push(poi);
		}
	}
	TravelEditor.drawTravel();
}

TravelGeneral.fillWithPOIs = function(action) {
	var i, iend;
	if(TravelGeneral.layout[0].pois.length == 0) {
		i = 1;
	} else {
		i = 0;
	}
	for(i, iend=TravelGeneral.layout.length; i < iend; i++){
		var layoutDay = TravelGeneral.layout[i];
		var liDay = document.getElementById(layoutDay.id);
		for(var j=0, jend=layoutDay.pois.length; j < jend; j++){
			var poi = wt.getPoiDetails(layoutDay.pois[j].poiId);
			if(poi == undefined) {
				poi = new wt.Poi('deleted', 'DELETED', null, null, null);
			}
			var frli = document.createElement("li");
			if(action == 'edit') {
				frli.id = 'poi_'+poi.id+'-'+i+'-'+j;
			}
			if(action == 'show') {
				var fra = document.createElement("a");
				if(poi.id != 'deleted') {
					fra.href = "../poi/poi.html?id="+poi.id;
				}
			}
			var frimg = document.createElement("img");
			if(poi.id != 'deleted') {
				frimg.src = "../../images/poi_nopic.png";
			} else {
				frimg.src = "../../images/poi_deleted.png";
			}
			
			if(action == 'edit') {
				var froutdiv = document.createElement("div");
				
				var frardiv = document.createElement("div");
				frardiv.className = "datearrows";
				var frdel = document.createElement("p");
				frdel.className = "ardelete";
				var frdeltext = document.createTextNode("X");
				frdel.onclick = (function(a, b, elid) {
				    return function() {
				    	if(confirm("sure?")) {
							var el = $('#'+elid);
							el.hide('slow', function(){ el.remove(); });
							TravelEditor.removePoiFromLayout(a, b);
				    	}
					};
				})(i, j, frli.id);
				frdel.appendChild(frdeltext);
				frardiv.appendChild(frdel);
				
				if(poi.id != 'deleted') {
					var frupar = document.createElement("p");
					frupar.className = "arup";
					var frupartext = document.createTextNode("\u2191"); //&uarr;
					frupar.onclick = (function(a, b, dir) {
					    return function() {
					    	TravelEditor.movePOI(a, b, dir);
					    };
					})(i, j, 'up');
					frupar.appendChild(frupartext);
					
					var frdoar = document.createElement("p");
					frdoar.className = "ardown";
					frdoar.onclick = (function(a, b, dir) {
					    return function() {
					    	TravelEditor.movePOI(a, b, dir);
					    };
					})(i, j, 'down');
					var frdoartext = document.createTextNode("\u2193"); //&darr;
					frdoar.appendChild(frdoartext);
					
					frardiv.appendChild(frupar); frardiv.appendChild(frdoar);
				}
			}
			
			var frdatadiv = document.createElement("div");
			var frh4 = document.createElement("h4");
			var frh4text = document.createTextNode(poi.title);
			frh4.appendChild(frh4text);
			var frp = document.createElement("p");
			if(poi.id != 'deleted') {
				var frptext = document.createTextNode(capitaliseFirstLetter(poi.address.city.toLowerCase()) +', '+ capitaliseFirstLetter(poi.address.street.toLowerCase()) +' '+ poi.address.streetnumber);
			} else {
				var frptext = document.createTextNode('This POI was deleted from the database and can be removed from the Travel.');
				frp.className = "deletedpoi";
			}
			frp.appendChild(frptext);
			if(action == 'edit') {
				var frnotes = document.createElement("textarea");
				if(poi.id == 'deleted') {
					frnotes.disabled = true;
				}
				if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) {
					var frnotestext = document.createTextNode(htmlUnescape(layoutDay.pois[j].notes));
					frnotes.appendChild(frnotestext);
				}
				frnotes.onchange = (function(a, b) {
				    return function() {
				    	TravelGeneral.layout[a].pois[b].notes = this.value;
				    };
				})(i, j);
			}
			if(action == 'show') {
				var frnotes = document.createElement("p");
				frnotes.className = "notes";
				var frnotestext = document.createTextNode(htmlUnescape(layoutDay.pois[j].notes));
				frnotes.appendChild(frnotestext);
			}
			frdatadiv.appendChild(frh4); frdatadiv.appendChild(frp); frdatadiv.appendChild(frnotes);
		
			if(action == 'edit') {
				frli.appendChild(frimg);
				froutdiv.appendChild(frardiv);
				froutdiv.appendChild(frdatadiv);
				frli.appendChild(froutdiv);
			}
			if(action == 'show') {
				fra.appendChild(frimg);
				fra.appendChild(frdatadiv);
				fra.appendChild(frdatadiv);
				frli.appendChild(fra);
			}
			
			liDay.appendChild(frli);
		}
	}
}

TravelGeneral.setTitle = function(action, title) {
	var titleEl = document.getElementById('travelname');
	if(action == 'edit') {
		titleEl.value = htmlUnescape(title);
	}
	if(action == 'show') {
		if(titleEl.tagName.toLowerCase() == 'a') {
			titleEl.href = 'travel.html?id=' + activeTravel.id;
		}
		titleEl.innerHTML = title;
	}
}

TravelGeneral.drawTravelList = function(list) {
	var container, travels, listtype;
	switch(list) {
		case "next":
			container = document.getElementById("nexttravels");
			travels = plannedTravels; //global var from travel-general.js
			listtype = 'anchors';
			break;
		case "past":
			container = document.getElementById("pasttravels");
			travels = pastTravels;//global var from travel-general.js
			listtype = 'anchors';
			break;
		case "addpoi":
			container = document.getElementById("poicheck");
			travels = wt.getConflictingActiveTravels();
			listtype = 'inputs';
			break;
		case "conftravels":
			container = document.getElementById("conftravels");
			travels = wt.getConflictingActiveTravels();
			listtype = 'anchors';
			if(travels.length > 1) { //1 = active travel
				$('#conftravelscontainer').removeClass('hidden');
			}
			break;
		default:
			console.log('bad travel list var?');
			return false;
	}

	if(travels.length != 0) {
		container.innerHTML = '';
	} else {
		if(list == "addpoi") {
			$('#addPOIlistbtn').hide();
			$('#add a').removeClass('inline');
		}
	}
	for(var i=0, iend=travels.length; i < iend; i++){
		var trlsli = document.createElement("li");
		var trlsdate = document.createElement("h5");
		
		var iterationDateStart = new Date(travels[i].startDate);
		var iterationDateEnd = new Date(travels[i].endDate);
		var humanDateStart = iterationDateStart.getDate()+"."+(iterationDateStart.getMonth()+1)+"."+iterationDateStart.getFullYear();
		var humanDateEnd = iterationDateEnd.getDate()+"."+(iterationDateEnd.getMonth()+1)+"."+iterationDateEnd.getFullYear();
		var humanDateToPaste;
		if(humanDateStart == humanDateEnd) {
			humanDateToPaste = humanDateStart;
		} else {
			humanDateToPaste = humanDateStart +' \u2014 ' + humanDateEnd; //&mdash;
		}
		
		var trlsdatetext = document.createTextNode(humanDateToPaste);
		trlsdate.appendChild(trlsdatetext);
		if(listtype == 'anchors') {
			var trlstitle = document.createElement("a");
			trlstitle.href = "travel.html?id="+travels[i].id
			var trlstitletext = document.createTextNode(htmlUnescape(travels[i].title));
			trlstitle.appendChild(trlstitletext);
		} else if (listtype == 'inputs') {
			var trlstitle = document.createElement("label");
			var trlstitletext = document.createTextNode(htmlUnescape(travels[i].title));
			var trlsinp = document.createElement("input");
			trlsinp.type = "radio";
			trlsinp.name = "addpoi";
			trlsinp.value = "tr-id_"+travels[i].id;
			trlstitle.appendChild(trlsinp); trlstitle.appendChild(trlstitletext);
		}
		trlsli.appendChild(trlsdate); trlsli.appendChild(trlstitle);
		container.appendChild(trlsli);
	}
}

//move POI up and down the travel list
TravelEditor.movePOI = function(dayArrayIndex, POIarrayIndex, direction) {
	//set up variables, functions
	var dayBoundary, POIboundary, changeDay;
	var tmp = TravelGeneral.layout[dayArrayIndex].pois[POIarrayIndex];
	var cutPOI = function() { TravelGeneral.layout[dayArrayIndex].pois.splice(POIarrayIndex, 1); }
	
	if(direction == "up") {
		dayBoundary = 1; //0-unassigned
		POIboundary = 0;
		changeDay = function() { TravelGeneral.layout[dayArrayIndex-1].pois.push(tmp); }
		nudgePOI = function() { TravelGeneral.layout[dayArrayIndex].pois.splice(POIarrayIndex-1, 0, tmp); }
	} else if(direction == "down") {
		dayBoundary = TravelGeneral.layout.length-1;
		POIboundary = TravelGeneral.layout[dayArrayIndex].pois.length-1;
		changeDay = function() { TravelGeneral.layout[dayArrayIndex+1].pois.splice(0, 0, tmp); }
		nudgePOI = function() { TravelGeneral.layout[dayArrayIndex].pois.splice(POIarrayIndex+1, 0, tmp); }
	}
	
	//do the moving
	if(POIarrayIndex == POIboundary) {
		if(dayArrayIndex == dayBoundary) {
			return;
		} else {
			cutPOI();
			changeDay();
		}
	} else {
		cutPOI();
		nudgePOI();
	}
	
	TravelEditor.drawTravel();
}

TravelEditor.removePoiFromLayout = function(dayArrayIndex, POIarrayIndex) {
	var poiTravelId = TravelGeneral.layout[dayArrayIndex].pois[POIarrayIndex].id;
	if(poiTravelId != null) { //a travelpoi that was already saved
		var index = wt.getPoiTravelIndex(poiTravelId);
		wt_poitravels.splice(index, 1);
		wt_deletiontasks.push(new wt.DeletionTask(wt.newId(wt_deletiontasks), 'poitravel', poiTravelId));
	}
	TravelGeneral.layout[dayArrayIndex].pois.splice(POIarrayIndex, 1);
	//TODO: still acts a bit wonky when deleting pois after moving
}

TravelEditor.verifyData = function() {
	var errors = "";
	if($('#travelname').val() == "") {
		errors += "Travel name cannot be empty\n";
	}
	return errors;
}

TravelEditor.saveTravel = function() {
	try {
		//notify somewhere here that (if) unassigned POIs are present, but allow to save with them anyway
		var newTravel = true;
		if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) { //IF EDITING PREVIOUSLY SAVED TRAVEL)
			newTravel = false;
		}
		
		if(newTravel) {
			travelId = wt.newId(wt_travels);
		} else {
			travelId = parseInt(urlParams['id'], 10);
		}
		var travelTitle = htmlEscape($('#travelname').val());
		//var travelDescription = htmlstrip($('#traveldescription').val()); //TODO? or out
		var travelStart = parseInt($('#datestarthid').val(),10);
		var travelEnd = parseInt($('#dateendhid').val(),10);
		if(new Date(travelEnd).getMinutes() != 59) {
			travelEnd += 86399999; //86399999 = 23:59:59:999
		}
		var trvl = new wt.Travel(travelId,travelTitle, '', travelStart, travelEnd, new Date().getTime());
		
		if(newTravel) {
			wt_travels.push(trvl);
		} else {
			var index = wt.getTravelIndex(travelId);
			wt_travels[index] = trvl;
		}
		
		//push TravelPoi - in loop on gatheredPOIs from above?
		var poiDate, id, poiId, plannedVisit, poiOrder, poiNotes, poitrvl;
		for(var i=0, iend=TravelGeneral.layout.length; i < iend; i++){
			var iterDay = TravelGeneral.layout[i];
			poiDate = iterDay.date;
			for(j=0, jend=iterDay.pois.length; j < jend; j++){
				var newPoiTravel = true;
				if(iterDay.pois[j].id != null) { //existing poitravel
					newPoiTravel = false;
				}
				if(newPoiTravel) {
					id = wt.newId(wt_poitravels);
				} else {
					id = iterDay.pois[j].id;
				}
				poiId = iterDay.pois[j].poiId;
				if(iterDay.date != null) {
					plannedVisit = iterDay.date.getTime();
				} else {
					plannedVisit = iterDay.date; //null
				}
				poiOrder = j;
				poiNotes = htmlEscape(iterDay.pois[j].notes);
				poitrvl = new wt.PoiTravel(id, poiId, travelId, plannedVisit, poiOrder, poiNotes);
				if(newPoiTravel) {
					wt_poitravels.push(poitrvl);
				} else {
					var index = wt.getPoiTravelIndex(id);
					wt_poitravels[index] = poitrvl;
				}
			}
		}
		wt.saveDataToLocalStorage();
		return travelId;
	} catch(err) {
		console.log("error while saving: " + err);
		return false;
	}
}

TravelGeneral.removeTravel = function(id) {
	try {
		for(var i = 0, iend = wt_travels.length; i < iend; i++){
			if(wt_travels[i].id == id){
				wt_deletiontasks.push(new wt.DeletionTask(wt.newId(wt_deletiontasks), 'travel', wt_travels[i].id));
				wt_travels.splice(i, 1);
				break;
			}
		}
		for(var i = 0, iend = wt_poitravels.length; i < iend; i++){
			if(wt_poitravels[i].travelId == id){
				wt_deletiontasks.push(new wt.DeletionTask(wt.newId(wt_deletiontasks), 'poitravel', wt_poitravels[i].id));
				wt_poitravels.splice(i, 1);
				i--;
				iend--;
			}
		}
		wt.saveDataToLocalStorage();
		console.log("travel id="+id+" removed along with it's pois");
		return true;
	} catch (err) {
		console.log("error while removing: " + err);
		return false;
	}
}

TravelGeneral.addPOIToTravelById = function(poiId, travelId) {
	try {
		var travelpois = wt.getTravelPois(travelId);
		var order = -1;
		for (var i=0, iend = travelpois.length; i < iend; i++) {
			if(travelpois[i].plannedVisit == null) { //unassigned
				if(travelpois[i].order > order) {
					order = travelpois[i].order;
				}
			}
		}
		order++; //new entry
		wt_poitravels.push(new wt.PoiTravel(wt.newId(wt_poitravels),parseInt(poiId, 10),parseInt(travelId, 10), null, order, ""));
		return true;
	} catch (err) {
		console.log("error while adding new POI: " + err);
		return false;
	}
}

TravelEditor.AutocompleteAbsolute = function() {
	var acInput = $("#friends");
	var acList = $('.ui-autocomplete');
	//acList.css('top', (acInput.offset().top + acInput.height()) + 'px');
	acList.css('width', acInput.width());
}

/********************************************************
 * TRAVEL INDEX
 */

var TravelIndex = TravelIndex || {};
TravelIndex.PageInit = function() {
	if(typeof activeTravel === "undefined") {
		activeTravel = wt.getActiveTravel();
	}
	if(activeTravel != null) {
		$("#acttredit, #travelname").removeClass('hidden');
		$("#acttredit").attr('href', 'addedit.html?id=' + activeTravel.id);
		
		TravelGeneral.drawTravelByID(activeTravel.id);
	}

	TravelGeneral.drawTravelList('past');
	TravelGeneral.drawTravelList('next');
	TravelGeneral.drawTravelList('conftravels');
}

/********************************************************
 * TRAVEL DETAILS
 */

var TravelDetails = TravelDetails || {};
TravelDetails.PageInit = function() {
	TravelGeneral.drawTravelByID(urlParams['id']); //urlParams - function/variable defined at the top
	if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) {
		$("#trvledit, #submenu_trvledit").attr('href', 'addedit.html?id=' + urlParams['id']);
		$("#submenu_trvldelete").on('click', function() {
			if (confirm('Are you sure to remove this Travel?')) {
				if(TravelGeneral.removeTravel(urlParams['id'])) {
					alert('Travel removed succesfully!');
					location.href = "index.html";
				} else {
					alert('An error occurred, Travel was not removed :(');
				}
			}
			return false;
		});
	}
}

/********************************************************
 * LOGBOOK
 */

var PageInit_logbook = function() {
	var logbookPois = $(".arrtime");
	var logbookPoisPoints = logbookPois.children("a");
	var selectedPoi = false;
	logbookPois.each(function() {
		$(this).on('click', function(e) {
			logbookPoisPoints.removeClass('selected');
			$(this).children("p").addClass('selected');
			
			PoiUl = $('ul.poithumbs');
			POIs = PoiUl.children('li');
			if(!selectedPoi) {
				$("#POIs").removeClass('hidden');
				$("#poideselect").removeClass('hidden');
				$("#poiactive").removeClass('hidden');
				$("#poiinactive").addClass('hidden');
				$("#POIplaceholder").addClass('hidden');
				selectedPoi = true;
			}
			POIs.hide();
			
			PoiID = $(this).attr('id');
			PoiID = PoiID.substring(0,PoiID.length-1);
			$('#'+PoiID).show();
			//console.log(PoiID);
			return false;
		});
	});
	$('#poideselect').on('click', function(e) {
		logbookPoisPoints.removeClass('selected');
		$("#POIs").addClass('hidden');
		$("#poideselect").addClass('hidden');
		$("#poiinactive").removeClass('hidden');
		$("#poiactive").addClass('hidden');
		$("#POIplaceholder").removeClass('hidden');
		selectedPoi = false;
	});
	
	$("footer a[rel]").overlay({
		top: 'center',
		close: "a.close"
	});
}

/********************************************************
 * POI
 */

var PageInit_poi = function() {
	
	poie = new POIEditor();
	mypoi=poie.getPOIById(poie.getId());
	$('#POIDescription').text(mypoi.description);
	$('#POIBigName').text(mypoi.title);
	$('#POISmallName').text(mypoi.title);
	$('#POIAddress').text(mypoi.address.country+ ', '+ mypoi.address.postalcode+ ' '+ mypoi.address.city + ', '+ mypoi.address.street + ' ' +mypoi.address.streetnumber);
	$('#editpoi').attr('href', 'addedit.html?id='+poie.getId());
	$('#deletepoi').on('click', function () {
		if (confirm('Are you sure to remove POI?')) {
			if(poie.removeById(poie.getId())) {
				alert('POI removed succesfully!');
				window.location.href='index.html';
			} else {
				alert('An error occurred, POI was not removed :(');
			}
		}
		return false;
	});
	
	var coords=new google.maps.LatLng(mypoi.position.latitude, mypoi.position.longitude);
	mrk=new google.maps.Marker({position: coords, map: map});
	map.setCenter(coords);
	map.setZoom(14);
	
	TravelGeneral.drawTravelList('addpoi'); //onbeforeload below?
	$("footer a[rel]").overlay({
		top: 'center',
		close: "a.close",
		onLoad: function(){
			var ovrl = this.getOverlay();
			ovrl.css('height', ovrl.height());
		}
	});
	if(typeof urlParams !== "undefined" && !isNaN(parseInt(urlParams['id']))) {
		$('#addPOIlistbtn').on('click', function() {
			var liTravelId = $('input[name=addpoi]:checked').val().substr(6);
			if (TravelGeneral.addPOIToTravelById(urlParams['id'], liTravelId)) {
				alert('POI added successfully to the travel!');
				wt.saveDataToLocalStorage();
			} else {
				alert('Error, POI was not added :(');
			}
			
		});
	}
	
	/* GALLERY */
	function prevstop(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	var jwind = $(window);
	var jbod = $(document.body);
	var pictdiv = $("#picture");
	var pictimg = $("#picture img");
	var oldScroll = 0;
	var picorigbtn = $('#picorig');
	var picfitbtn = $('#picfit');
	pictimg.draggable({ disabled: true });
	var pictimgwidth = 0,
		pictimgheight = 0,
		jwindwidth = jwind.width(),
		jwindheight = jwind.height();
	
	/* picture overlay */
	$('.thumbs img').each(function() {
		$(this).bind('click', function(e) {
			jbod.css('overflow', 'hidden');
			oldScroll = jwind.scrollTop();
			pictdiv.css('top', jwind.scrollTop()+'px');
			var picsrc = $(this).attr('src');
			var fullpicsrc = picsrc.substring(0, picsrc.lastIndexOf("/")) + "/full" + picsrc.substring(picsrc.lastIndexOf("/"));
			setupForDraggableConstraints(fullpicsrc);
			pictimg.attr('src', fullpicsrc);
			jbod.bind('scroll', prevstop);
			pictdiv.show("fade", {}, 500, function() {
				window.scrollTo(0,1); /*fix for weird android scroll behavior when overflow:hidden*/
				pictdiv.css('top',0);
			});
		});
	});
	/* picture overlay close button */
	$('#picture .close').bind('click', function(e) {
		jbod.css('overflow', 'visible');
		jbod.unbind('scroll', prevstop);
		jwind.scrollTop(oldScroll);
		pictdiv.css('top',oldScroll); /*for the animation*/
		pictdiv.hide("fade", {}, 500);
	});
	/* show original size button*/
	picorigbtn.bind('click', function(e) {
		picorigbtn.addClass('hidden');
		picfitbtn.removeClass('hidden');
		pictimg.css('max-width', 'none');
		pictimg.css('max-height', 'none');
		pictimg.draggable("option", "disabled", false);
	});
	/* fit screen button*/
	picfitbtn.bind('click', function(e) {
		picfitbtn.addClass('hidden');
		picorigbtn.removeClass('hidden');
		pictimg.css('max-width', '100%');
		pictimg.css('max-height', '100%');
		pictimg.css('left', '0');
		pictimg.draggable( "option", "disabled", true );
	});
	
	function setupForDraggableConstraints(fullpicsrc) {
		var newimg = new Image();
		newimg.onload = function() {
			pictimgwidth = this.width;
			pictimgheight = this.height;
			var e = document.createEvent('Events');
			e.initEvent('imgLoaded', true, true);
			document.dispatchEvent(e);
		}
		newimg.src = fullpicsrc;
	}
	document.addEventListener('imgLoaded', function(){
   		setDraggableConstraints();
   	});
	
	function setDraggableConstraints() {
		pictimg.css('left', '0');
		pictimg.css('top', '0'); //reset

		pictimg.draggable({ containment: [-(pictimgwidth-jwindwidth), -(pictimgheight-jwindheight), 0, 0] });
		//console.log("pw"+pictimgwidth+":bw"+jwindwidth+"  :  ph"+pictimgheight+":bh"+jwindheight);
		
		if(pictimgwidth > jwindwidth && pictimgheight > jwindheight) {
			pictimg.draggable( "option", "axis", false );
		} else if(pictimgwidth > jwindwidth) {
			pictimg.draggable( "option", "axis", 'x' );
		} else if(pictimgheight > jwindheight) {
			pictimg.draggable( "option", "axis", 'y' );
		} else if(pictimgheight != '0' && pictimgwidth != '0'){ //pic too small (but not 0 [occasional bug?]), let's disable it
			pictimg.draggable( "option", "disabled", true );
		}
	}
}


var POIHelper = function () {
	//if somebody will ever stumble here - you could try to use the urlParams from the top of this file :)
	var get = {};
	document.location.search.replace(/\??(?:([^=]+)=([^&]*)&?)/g, function () {
	    function decode(s) {
		return decodeURIComponent(s.split("+").join(" "));
	    }

	    get[decode(arguments[1])] = decode(arguments[2]);
	});

	this.getParam = function (key) {
		return get[key];
	}
}

var POIEditor = function() {
	var ph=new POIHelper();
	var mode=null;
	var id=ph.getParam('id');
	id!=undefined?mode='edit':mode='add';
	var mrk=null;
	var that=this;
	var location = null;
	var name = null;
	var description = null;
	var street = null;
	var streetnumber = null;
	var city = null;
	var postcode = null;
	var country = null;

	this.getId = function () {
		return id;
	}

	this.getMode = function () {
		return mode;
	}
	
	this.add = function () {
	   that.name=$("#poiname").val();
	   that.description=$("#poidescription").val();
	   that.street=$("#poistreet").val();
	   that.streetnumber=$("#poistreetnumber").val();
	   that.city=$("#poicity").val();
	   that.postcode=$("#poipostcode").val();
	   that.state=$("#poistate").val();
	   that.country=$("#poicountry").val();

	   var adding=true;
	   if(that.getId()==undefined) {
	   	var newDate = new Date;
	   	var id = newDate.getTime();
		//alert('add');
	   }
	   else {
		adding=false;
		var id = that.getId();
		//alert('edit'+id);
	   }
	   // this fragment should assume that wt_pois are initialized

	   //console.log(point);
	  
	   if ( that.validatePOI() ) {
	      	   if (adding) {
			   var point = new wt.Poi(id, that.name, that.description, new wt.Coordinates(that.location.lat(), that.location.lng()), new wt.Address(that.street,that.streetnumber,that.postcode,that.city,that.state,that.country));
			   wt_pois.push(point);
			   wt.saveDataToLocalStorage();
		      	   alert ('POI added'); window.location.href='index.html';
		   } else {
			//editing existing POI
			   var point = new wt.Poi(id, that.name, that.description, new wt.Coordinates(that.location.lat(), that.location.lng()), new wt.Address(that.street,that.streetnumber,that.postcode,that.city,that.state,that.country));
			   that.replaceById(id,point);
			   alert ('POI saved'); window.location.href='index.html';
			   wt.saveDataToLocalStorage();   
		   }
		  
	   } else {
	      alert ('Please fill the form');
	   }
	}
	this.replaceById = function (id,poi) {
		for (key in wt_pois) {
			if (wt_pois[key].id==id) { 
					wt_pois[key]=poi; 				 
			}
		}
	}
	this.removeById = function (id) {			
		for (key in wt_pois) {
			if (wt_pois[key].id==id) {
				try {
					wt_pois.splice(key, 1); 
					wt_deletiontasks.push(new wt.DeletionTask(wt.newId(wt_deletiontasks), 'poi', id));
					wt.saveDataToLocalStorage();
					return true;
				} catch(err) {
					console.log("error while removing POI: " + err);
					return false;
				}
			}
		}
	}

	this.getPOIById = function (id) {
		for (key in wt_pois) {
			if (wt_pois[key].id==id) return wt_pois[key];
		}
	}

	this.validatePOI = function () {
	  if ( (that.name == null || that.name == '') || (that.description == null || that.description == '' ) || typeof(that.location)=='undefined' ) 
	  	return false;
	  else
	  	return true;
	}
	
	this.initClickListener = function () {
	  
	      google.maps.event.addListener(map, 'click', function(event) { 
	      //console.log(that);
	      that.location=event.latLng;
	      that.putCoords('o',event.latLng);
	      //console.log(event.latLng.lat()); console.log(event.latLng.lng()); 
	  });
	}
	
	this.putCoords = function (field,coordObj) {
	  
	  if (mrk) {
	    mrk.setMap(null);
	  }
	  mrk = new google.maps.Marker({
	      position: coordObj,
	      map: map,
	      title: "Marker coordinates: \nLat: "+coordObj.lat().toString() + "\nLng: " + coordObj.lng().toString()
	  });
	  $("#poilocation").val(coordObj);
	  
	  //reverse geolocation

	  var geocoder = new google.maps.Geocoder(); 
	  loc = new google.maps.LatLng(coordObj.lat(), coordObj.lng()); 

	  geocoder.geocode({location: loc}, function (res,stat) { 
		if (stat == 'OK') {
			a=res[0].address_components;
			var streetno = null;
	  		var street = null;
			var city = null;
			var postalcode = null;
			var state = null;
			var country = null;
			for (key in a) {
				f=a[key];
				ftype=f.types[0];
				switch(ftype)
				{
					case 'street_number':
					  streetno=f.long_name;
					  break;
					case 'route':
					  street=f.long_name;
					  break;
					case 'locality':
					  city=f.long_name;
					  break;
					case 'postal_code':
					  postalcode=f.long_name;
					  break;
					case 'administrative_area_level_1':
					  state=f.long_name;
					  break;
					case 'country':
					  country=f.long_name;
					  break;
					
				}
				//console.log(f);
			}
			//console.log(street, streetno, postalcode, city, state, country); 
			$("#poistreet").val(street);
			$("#poistreetno").val(streetno);
			$("#poicity").val(city);
			$("#poipostcode").val(postalcode);
			$("#poistate").val(state);
			$("#poicountry").val(country);
		}
	   });

	}

	this.prepareForm = function () {
		//prepares form for adding/editing - depending which mode is activated
		
		if (this.getPOIById(id)!=undefined) {
			//edit existing
			var poi=this.getPOIById(id);
			//console.log(poi);
			var coords=new google.maps.LatLng(poi.position.latitude, poi.position.longitude);
			//console.log(poi.position);
			mrk=new google.maps.Marker({position: coords, map: map});
			//console.log(mrk.getPosition());
			//console.log(map);
			//map.setCenter(coords);
			$("#poilocation").val(coords);
			$('#poiname').val(poi.title);
			$('#poidescription').val(poi.description);
			$("#poistreet").val(poi.address.street);
			$("#poistreetnumber").val(poi.address.streetnumber);
			$("#poicity").val(poi.address.city);
			$("#poipostcode").val(poi.address.postalcode);
			$("#poistate").val(poi.address.state);
			$("#poicountry").val(poi.address.country);
			that.location=coords;
			google.maps.event.addListenerOnce(map, 'idle', function(){
			    map.panTo(coords);
			});

		}
		else {
			//add new
		}
	}
}

var TravelSearch = function (paramFieldId) {
	// assumes global table mrksPoi is already created and stores map marks which are created on the 'map'
	var ALL='';
	this.setFieldId = function (field) {
		fieldId=field;
		that=this;
		$('#'+fieldId).bind({
			keyup: function (event) {
				that.setFilter($('#'+fieldId).val());
				that.conductSearch();
			},		
		});
	}

	this.setFilter = function (filter) {
		$('#'+fieldId).val(filter);
		console.log($('#'+fieldId).val());
	}

	this.conductSearch = function () {
		kw=this.getFilter().toUpperCase();
		var result=new Array();

		var southMost = null;
		var northMost = null;
		var westMost = null;
		var eastMost = null;
		var safetyMargin = 0.001;

		for (key in wt_pois) {
			found=false;
			if (
				(wt_pois[key].title.toUpperCase().indexOf(kw) != -1) || 
				(wt_pois[key].description.toUpperCase().indexOf(kw) != -1)

			) {
				console.log('|'+wt_pois[key].title);
				found=true;
			} else {
				for (akey in wt_pois[key].address) {
					if (wt_pois[key].address.hasOwnProperty(akey) && wt_pois[key].address[akey].toUpperCase().indexOf(kw) != -1) {
						console.log('*'+wt_pois[key].address[akey]);
						found=true;
						break;
					}
				}
			}
			if (found) {
				result.push(key);
				mrksPoi[key].setMap(map);
			}
			 else {
				mrksPoi[key].setMap(null);
			}
		}

		for (k in result) {
			var lat=wt_pois[ result[k] ].position.latitude;
			var lng=wt_pois[ result[k] ].position.longitude;
			if(lat < westMost || westMost==null) westMost = lat;
			if(lat > eastMost || eastMost==null) eastMost = lat;
			if(lng < southMost || southMost==null) southMost = lng;
			if(lng > northMost || northMost==null) northMost = lng;
		}
		
		if ( westMost==null ) {
			// no pois found
			var southMost = -90;
			var northMost = 90;
			var westMost = -180;
			var eastMost = 180;	
		}
		//console.log(southMost+' '+northMost+' '+westMost+' '+eastMost);
	    	map.fitBounds(
			new google.maps.LatLngBounds(
				new google.maps.LatLng(westMost-safetyMargin,southMost-safetyMargin), 
				new google.maps.LatLng(eastMost+safetyMargin,northMost+safetyMargin)
			)
		);
		//console.log('*');


	}
	this.getFilter = function () {
		return $('#'+paramFieldId).val();
	}

	this.setFieldId(paramFieldId);
	this.setFilter(ALL);
	this.conductSearch();
}

var POISearch = function(paramFieldId,paramPoiSourceId,paramPoiNotFoundId) {
	var fieldId;
	var poiSource;
	var poiNotFoundId;
	var ALL='';
	mrksArray= new Array();
	//draw all poi initially
	for (k in wt_pois) {
		mrk = new google.maps.Marker({
				      position: new google.maps.LatLng(wt_pois[k].position.latitude, wt_pois[k].position.longitude),
				      map: map,
				      title: wt_pois[k].title + "\n" + wt_pois[k].description
		 });
		google.maps.event.addListener(mrk, 'click', function () {document.location.href='poi.html?id='+wt_pois[k].id;} );
		mrksArray.push(mrk);
	}

	this.hideNotFound = function (id) {
		$('#'+id).hide();		
	}
	this.showNotFound = function (id) {
		$('#'+id).show();		
	}
	this.retrieveAndHideFound = function (id) {
		poiSource=$('#'+id).clone();
		poiSource.removeAttr('id');
		//console.log(poiSource);
		$('#'+id).hide();		
	}
	this.conductSearch = function () {
		kw=this.getFilter().toUpperCase();
		that=this;
		//clears the poi list
		$('.poithumbs .poires').remove();
		//console.log(poiSource);
		

		
		var result=new Array();
		for (key in wt_pois) {
			found=false;
			if (
				(wt_pois[key].title.toUpperCase().indexOf(kw) != -1) || 
				(wt_pois[key].description.toUpperCase().indexOf(kw) != -1)

			) {
				console.log('|'+wt_pois[key].title);
				found=true;
			} else {
				for (akey in wt_pois[key].address) {
					if (wt_pois[key].address.hasOwnProperty(akey) && wt_pois[key].address[akey].toUpperCase().indexOf(kw) != -1) {
						console.log('*'+wt_pois[key].address[akey]);
						found=true;
						break;
					}
				}
			}
			if (found) {
				result.push(key);
				mrksArray[key].setMap(map);
			}
			 else {
				mrksArray[key].setMap(null);
			}
		}
		if (result.length>0) {
			
			this.hideNotFound(paramPoiNotFoundId);
			var southMost = null;
			var northMost = null;
			var westMost = null;
			var eastMost = null;
			var safetyMargin = 0.001;
			for (k in result) {
				node=poiSource.clone();
				node.find("h4"+":contains('$description')").replaceWith("<h4>"+wt_pois[ result[k] ].title+"</h4>");
				node.find("p"+":contains('$name')").replaceWith("<p>"+wt_pois[ result[k] ].description+"</p>");
				node.find('a[href="$url"]').attr('href', 'poi.html?id='+(wt_pois[ result[k] ].id));
				$('.poithumbs').append(node);
				var lat=wt_pois[ result[k] ].position.latitude;
				var lng=wt_pois[ result[k] ].position.longitude;
				if(lat < westMost || westMost==null) westMost = lat;
				if(lat > eastMost || eastMost==null) eastMost = lat;
				if(lng < southMost || southMost==null) southMost = lng;
				if(lng > northMost || northMost==null) northMost = lng;
			}
			
			if ( westMost==null ) {
				// no pois found
				var southMost = -90;
				var northMost = 90;
				var westMost = -180;
				var eastMost = 180;	
			}
			//console.log(southMost+' '+northMost+' '+westMost+' '+eastMost);
		    	map.fitBounds(
				new google.maps.LatLngBounds(
					new google.maps.LatLng(westMost-safetyMargin,southMost-safetyMargin), 
					new google.maps.LatLng(eastMost+safetyMargin,northMost+safetyMargin)
				)
			);
			//console.log('*');

		}
		else {
			this.showNotFound(paramPoiNotFoundId);
			//console.log('*');
		}
	}
	this.getFieldId = function () {
		return fieldId;		
	}
	this.setFieldId = function (field) {
		fieldId=field;
		that=this;
		$('#'+fieldId).bind({
			keyup: function (event) {
				//key up
				//console.log(event);
				//console.log($('#'+fieldId).val());
				that.setFilter($('#'+fieldId).val());
				that.conductSearch();
			},		
		});
	}
	this.setFilter = function (filter) {
		$('#'+fieldId).val(filter);
		console.log($('#'+fieldId).val());
	}
	this.getFilter = function () {
		return $('#'+fieldId).val();
	}
	this.setFieldId(paramFieldId);
	this.setFilter(ALL);
	//this.hideNotFound(paramPoiNotFoundId);
	this.retrieveAndHideFound(paramPoiSourceId);
	this.conductSearch();
}

$("#addpoi").click(function() {
    poie.add();
});

