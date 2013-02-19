var fileServices = new Array();
var updateFileServices = new Array();
var exportFileHandles = new Array();
var remoteDirectoryEntries = new Array();
var localFileHandle = null;
var reader;
var directory;
var PRE = ' ######### ';

/**
* This datastructure contains only export files. It is a two-dimensional array. 
* The first dimension represents the remoteService the second dimension the index of the export file of this remoteService.
* Only export-files are stored which are qualified by their wt_remoteUpdates[remoteService] update time.
* Export-files with a greater timestamp are qualified.
*/
var remoteEntryRegister;

var sync = sync || {}; //namespace to contain the general functions


updateReady = false;

sync.initializeSyncing = function(){
		webinos.discovery.findServices(new ServiceType("http://webinos.org/api/file"), {
		onFound: function (service) {
			//alert('file service at ' + service.serviceAddress);
			if(service.serviceAddress == connectedSystems[0]){
				// LOCAL FILE SYSTEM
				service.bindService({
					onBind: function () {
						console.log(connectedSystems[0]);
						//alert(connectedSystems[0].serviceAddress);
						service.requestFileSystem(1, 1024, function (filesystem) {					
							console.log('address of local file service ');							
							updateFileServices.push(filesystem); //do we still need this?
							initFs(filesystem);
						}, function (error) {
							alert("Error requesting filesystem (#" + error.code + ")");
						});
					}
				});
			} else {
				// REMOTE FILE SYSTEM
				service.bindService({
						onBind: function () {
							service.requestFileSystem(1, 1024, function (filesystem) {
								console.log('address of remote file service ');
								initFsForExport(filesystem);
							}, function (error) {
								alert("Error requesting remote filesystem (#" + error.code + ")");
							});
							
						}
				});
			}
		},
		onError: function (error) {
			alert("Error finding service: " + error.message + " (#" + error.code + ")");
		}
	});

	//REGISTERS CALLBACK FOR THE UPDATE THROUGH EXPORT-FILES
	sync.addFileReaderReadyListener(function(){
		var TAG = ' - INIT-addFileReaderReadyListener() - ';
		
		// TODO Delete
		console.log(PRE + TAG + ' called! - all files were read! => executeChronologicalUpdate() ');	

		executeChronologicalUpdates();
	});
	
	console.log('travel-sync initialized!');
}

//INIT FOR REMOTE SYSTEMS
function initFsForExport(fs){ 
	fs.root.getDirectory('/travel/updates', { create: false, exclusive: false }, handleExportFiles, handleErrors);
}

//INIT FOR LOCAL SYSTEM
function initFs(fs){
	fs.root.getDirectory('/travel/exports', { create: false }, handleFiles, handleErrors);
}

function handleExportFiles(entry){
	var TAG = ' - handleExportFiles(entry) - ';
	
    // stores all directory-handles of remote filesystems
    //alert(entry.filesystem._service.serviceAddress);
	exportFileHandles.push(entry);
	console.log(PRE + TAG + 'New remote directory pushed!');
	
	if(!updateReady){
		sync.updateReady();
	}
}

/**
* This function exports the latest modifications of the database to every remote filesystem which was found by the servicediscovery
*/
function doExport() {
	var TAG = ' - doExport() - ';
	
	//alert('do export');
	// TODO DELETE
	console.log(PRE + TAG + 'called!');
	
	sync.updateSyncStatus('Initializing exports');
	// create the Export-JSONObject once and serialize it
	sync.updateSyncStatus('Export file created');
	
	var currentExportJSONFile = createExportDatabase();
	
	// TODO DELETE
	console.log(PRE + TAG + 'Export from local Storage:');
	console.log(currentExportJSONFile);
	
	if (!isExportEmpty(currentExportJSONFile)) {
		var exportFile = JSON.stringify(currentExportJSONFile);
		
		// TODO DELETE
		//console.log(PRE + TAG + "Writes export/update file with content: START FILE CONTENT");
		//console.log(exportFile);
		//console.log(PRE + TAG + 'END FILE CONTENT');
		
		//WRITE TO LOCAL
		createExportFile(directory, exportFile, 'export');
		//WRITE TO REMOTE
		
		/*
		if (exportFileHandles.length != 0)  {		
			
			console.log('Modifications found! Creation of export files starts now!');
			
			sync.updateSyncStatus('Pushing  updates to ' + exportFileHandles.length + ' devices.');
			// write Export-JSONObject to every remote filesystem
			for (var i=0; i < exportFileHandles.length; i++) {
				sync.updateSyncStatus('Pushing  updates to ' + exportFileHandles[i].filesystem._service.serviceAddress);
				createExportFile(exportFileHandles[i], exportFile, 'update');
			}	
	
			sync.updateSyncStatus('Export finished');
		} else {
			// TODO Try to initialize the export file handles again.
			sync.initializeSyncing();
			console.log('No export possible. ExportFileHandles missing!');
		}
		*/
	} else {
		// TODO DELETE
		console.log(PRE + TAG + 'No modifications found! Skipped creation of empty export files!');
		
		sync.updateSyncStatus('No modifications found! Skipped creation of empty export files!');
	}
}

function handleFiles(entry){
	directory = entry;
	console.log(entry);
	
	// Because the remote Update uses remote filesystems it is neccessary to wait for the remote services before declaring the update as ready.
	// Added a redundant call of update if a remote service was bound
	
	if(!updateReady){
		sync.updateReady();
	}
}

/**
* This function updates the local database by searching the local filesystem for update-files.<br>
* update-files will be deleted.<br>
* Furthermore export files from remote services are read. These files won't be deleted.<br>
* The local update-files will be executed after the remote export-files.<br>
* Precondition: export-files have to be read by the filereader in chronological order.
* NOTE: Updates take place asynchronously therefore see function executeChronologicalUpdates() which is the actual callback-function for the update.
*/
function doUpdate() {
	var TAG = ' - doUpdate() - ';
	sync.updateSyncStatus('Initializing Update');
	
	// Read the localStorage-Entry wt_remoteUpdates
	try {
		wt_remoteUpdates = JSON.parse(localStorage.getItem("wt_remoteUpdates"));
		
		// TODO DElete
		console.log(PRE + TAG + 'wt_remoteUpdates = ');
		console.log(wt_remoteUpdates);
		
	} catch (e) {
		console.log(e);
	}	
	
	// Initialize wt_remoteUpdates if necessary
	if (wt_remoteUpdates == null) {
		console.log(PRE + TAG + ' wt_remoteUpdates was previously null => init and stored to localStorage!');
		wt_remoteUpdates = new Array();
		localStorage.setItem('wt_remoteUpdates',JSON.stringify(wt_remoteUpdates));
	}
	
	// re-init the datastructure for the update
	remoteEntryRegister = new Array();
	// re-init the datastructure to determine if all file-reader of export files have finished their job
	remoteFileReaderToFinish = new Array();
		
	// Update the local database, by remote export-files
	if (exportFileHandles.length != 0)  {
		//alert('export');
		// TODO Delete
		console.log(PRE + TAG + 'ExportFileHandles (length=' + exportFileHandles.length + '):');
		console.log(exportFileHandles);
		
		remoteDirectoryEntries = new Array(exportFileHandles.length);
		//alert(exportFileHandles.length);
			sync.updateSyncStatus('Pulling updates from ' + exportFileHandles.length + ' device(s).');
			// read Export-JSONObject of every remote filesystem, order them by their timestamps in a datastructure
			for (var i=0; i < exportFileHandles.length; i++) {
				serviceName = exportFileHandles[i].filesystem._service.serviceAddress;
				sync.updateSyncStatus('Pulling updates of ' + serviceName);
				remoteDirectoryEntries[i] = exportFileHandles[i].createReader();
				remoteDirectoryEntries[i].readEntries(handleRemoteReadEntry);					
			}
	} else {
		console.log(PRE + TAG + 'ExportFileHandles missing. No export-file read on update!');
		// Start the creation of the update file immediately
		executeChronologicalUpdates();
	} 	
}

/**
* Executes export files in chronological order. In the last step the update via update files in the local directory is triggered.
*/
function executeChronologicalUpdates(){
	
	var TAG = ' - executeChronologicalUpdates() - ';
	
	// TODO Delete
	console.log(PRE + TAG + ' called!');
	
	// init the pointer-datastructure which stores the current indices of the different devices
	var pointers = new Array();
	for (var i = 0; i < remoteEntryRegister.length; i++) {
		pointers[i] = 0; // start iteration for every device at index zero
	}
	
	// Iteration over the found and visible devices(export files) and check if they are qualified for the update-process
	if (remoteEntryRegister.length != 0) {	
		var doBreak = false;
		var currentDeviceIndex = 0; // start with the first remote service
		
		// TODO Delete
		console.log(PRE + TAG + ' at least one file qualified for remote update with export file!');
		console.log(PRE + TAG + ' remoteEntryRegister:');
		console.log(remoteEntryRegister);
		
		// iterate dynamically over the files of the different remote services, the ordering depends on the timestamps of the files
		// find the minimum of the currently referenced(pointers) export-files in one iteration
		while(!doBreak){
			var minimalTimestampDeviceIndex = 0;
			var lastDeviceIndex = 0;
			for (var j = 0; j < pointers.length; j++) {
				var nextSibling = (lastDeviceIndex + 1) % pointers.length;
				
				if (lastDeviceIndex != nextSibling) {
					// The current device is not the only remoteService with files. No trivial minimum.
					if (lastDeviceIndex > nextSibling) {
						// was already compared, comparation in with this configuration complete!
						break;
					}
				
					var currentMinimalFile = remoteEntryRegister[minimalTimestampDeviceIndex][pointers[minimalTimestampDeviceIndex]];
					var nextFile = remoteEntryRegister[nextSibling][pointers[nextSibling]];
				
					// Check if any pointer has no destination
					if (currentMinimalFile == null) {
						// This column/remoteService has no files left for the minimum check and can be left out.				
						if (nextFile != null) {
							// nextSibling is the current minimum
							minimalTimestampDeviceIndex = nextSibling;
						}
					} else {
						// if both are not null, decide which one is minimal
						if (nextFile != null) {
							if (nextFile.creationStamp < currentMinimalFile.creationStamp) {
								// the current sibling has currently the minimal timestamp (new minimum)
								minimalTimestampDeviceIndex = nextSibling;
							}
						}	
					}						
					lastDeviceIndex = nextSibling;
				}
				
			}
			// Invariant: minimalTimestampDeviceIndex is the index of the device with the minimal timestamp for this step
			
			// 1.) update local database by using the file with the currently minimal timestamp
			var content = remoteEntryRegister[minimalTimestampDeviceIndex][pointers[minimalTimestampDeviceIndex]];
			
			// TODO Delete
			console.log(PRE + TAG + ' current Content for Update ->  remoteEntryRegister[minimalTimestampDeviceIndex][pointers[minimalTimestampDeviceIndex]]:');	
			console.log(content);
			console.log(PRE + TAG + ' minimalTimestampDeviceIndex = ' + minimalTimestampDeviceIndex);	
			console.log(PRE + TAG + ' pointers[minimalTimestampDeviceIndex]:');
			console.log(pointers[minimalTimestampDeviceIndex]);
			console.log(PRE + TAG + ' the current remoteEntryRegister for verification:');	
			console.log(remoteEntryRegister);
			
			if (typeof(remoteEntryRegister) == 'undefined' || typeof(content) == 'undefined') {
				
				console.log(PRE + TAG + ' END OF UPDATE VIA EXPORT-FILES!');
				break;
			}
			
			if (content != null) {
				try{
					// updates the local database
					createUpdateDatabase(content);
					console.log('Update by export file, service=' + content.exportingDevice + ', time=' + content.creationStamp);
					
					
					// TODO REFRESH DARF NICHT MIT DER CREATION STAMP ERFOLGEN SONDERN MIT DEM LASTMODIFIED AUS DEM UPDATE
					
					// refreshes the timestamp which indicates when the last update trough export-files was made for a certain device/remoteService
					refreshRemoteUpdateVar(content.exportingDevice, content.creationStamp);
				}catch(e){
					console.log(content);
					console.log('... is not a valid export file');								
				}
						
				// 2.) search for the next minimum, step forward
				pointers[minimalTimestampDeviceIndex]++;
			}
			
			// Termination-Condition: if every file was checked => terminate
			doBreak = true; // assume that we are done
			for (var i = 0; i < remoteEntryRegister.length; i++) {
				// Checks if every remoteService (Device) has read its last file (pointers reference the last file in the array)
				
				// lastIndex is -1 if there is no export file qualified for this remoteService
				var lastIndex = (remoteEntryRegister[i].length - 1);
				doBreak = doBreak && ((lastIndex == -1) || (lastIndex == (pointers[i]-1)));
				// if not every file was concidered do not stop, so leave with doBreak=false the inner loop early
				if (!doBreak) break;
			}
		}
		
		// TODO Delete
		console.log(PRE + TAG + ' left iteration over the qualified/ordered export files!');	
	}
	
	// TODO The update-files are probably not used anymore! This is because every modification is done by the export-files which are complete unlike the update files.
	// Update through update-files is done anyway!
	
	// Update the local database, by local update-files
	if(directory != null){
		sync.updateCompleted();
		//directoryEntries = directory.createReader();
		//directoryEntries.readEntries(handleReadEntry);	
	}else{
		sync.updateSyncStatus('Update failed. No access to file systems');
	}
}


/**
* This function creates a ordered datastructure of export-files from remote filesystems to get old updates.
*/
function handleRemoteReadEntry(entries){
	var TAG = ' - handleRemoteReadEntry(entries) - ';
	
	// TODO Delete
	console.log(PRE + TAG + 'Called!');
	console.log(entries);
	
	var bAtLeastOneExportFile = false;
	var bIsLastFile = false;
	var tLastUpdate = 0; // 0, indicates that this device was never visible before	
	if(entries.length > 0){
		
		// Get last update time for the current device and its name
		var currentDeviceName = entries[0].filesystem._service.serviceAddress;
		sync.updateSyncStatus('Parsing ' + entries.length + ' files of ' + currentDeviceName);
		//alert('Parsing ' + entries.length + ' files of ' + currentDeviceName);
		
		var initialRemoteFs = true;
		
		for (var j=0; j < wt_remoteUpdates.length; j++) {
				if (wt_remoteUpdates[j].serviceAddress == currentDeviceName) {
					// Export-file is qualified for the current update, we only read export-files which we did not read until now
					tLastUpdate = wt_remoteUpdates[j].timestamp;
					sync.updateSyncStatus('Parsing only files newer than ' + tLastUpdate);
					//alert('Parsing only files newer than ' + tLastUpdate);
					initialRemoteFs = false;
				}
		}
		
		if(initialRemoteFs){
			//alert('New Device...');
			tLastUpdate = 0;
		}
		
		// Extend the current datastructure with the current service
		var newDevice = new Array();
		remoteEntryRegister.push(newDevice);
		var indexCurrentDevice = remoteEntryRegister.length - 1;	
		var fileCounter = 0;
	
		// #1 - Get the amount of qualified export files to determine if all export file were already read.
		for(var i = 0; i < entries.length; i++){
			if ((entries[i].isFile) && (entries[i].name.indexOf('export_', 0)!= -1) && (entries[i].name.indexOf('.json', 0)!= -1)){
				var updateDate = entries[i].name.substring(7, entries[i].name.indexOf('.json', 0));
				if(parseInt(updateDate) > tLastUpdate){
					fileCounter++;
				}
			}
		}
		
		//alert('File to be considered: ' + fileCounter++);
		// stores the amount of files which have to be read before proceeding
		remoteFileReaderToFinish.push(fileCounter);
		
		// #2 - Call the file readers for the export-files
		for(var i = 0; i < entries.length; i++){
			if( (i==(entries.length-1)) && (exportFileHandles.length == remoteEntryRegister.length)){
					bIsLastFile = true;
			}
			if (entries[i].isFile){
				
				if(entries[i].name.indexOf('export_', 0)!= -1 && entries[i].name.indexOf('.json', 0)!= -1){
					// Checking date of remote export file
					// important variable for the order of the modifications in the database
					var updateDate = entries[i].name.substring(7, entries[i].name.indexOf('.json', 0));
					// only remember files that we have not read already
					if(parseInt(updateDate) > tLastUpdate){
						bAtLeastOneExportFile = true;
						
						// TODO Delete
						console.log(PRE + TAG + ' file qualified for export-file update!');
						console.log(entries[i]);
						
						fileReaderRemote(entries[i], indexCurrentDevice);
					}
	
				}else if( i== (entries.length-1)){
					// sync.updateCompleted(true); This is done later in the update-process with update-files
					sync.updateSyncStatus('Sync export collection created.');
				}
			}
			// else if(bIsLastFile){
				// sync.addFileReaderReadyListener(function(){
					// // sync.updateCompleted(true); This is done later in the update-process with update-files
					// sync.updateSyncStatus('Sync export collection created.');
				// }
			// }

		}
		
		// in case that there is no export file we have to start the creation of the export and update files right here.
		if (!bAtLeastOneExportFile) {
			// sync.addFileReaderReadyListener(function(){
				// executeChronologicalUpdates();
			// }
			
			sync.fileReadersReady();
			
		} 
		
		// Is handled via the fileReaderRemote-Callback()!
		// else {
									
			// sync.addFileReaderReadyListener(function(){
				// sync.updateSyncStatus('Sync export collection finalized!');

				// // TODO Delete
				// console.log(PRE + TAG + ' last File added! Complete remoteEntryRegister = ');
				// console.log(remoteEntryRegister);
				
				// // if the last export file was read, we can start the iteration over this collection of export-files in the executeChronologicalUpdates()-function
				// // update of the system via export files in chronological order
				// executeChronologicalUpdates();
				
				// // sync.updateCompleted(true);
				// sync.updateSyncStatus('Update through export-files done.');
			// });		
		// }
		
	}else{
		// alert('no files');
		// sync.updateCompleted(true); This is done later in the update-process with update-files
		// sync.updateSyncStatus('Sync done.');
	
		// If there are no export-files we have to proceed with the update-files
		// executeChronologicalUpdates();
	
		sync.fileReadersReady();
	
		// TODO Delete
		console.log(PRE + TAG + 'No export files in the directory!');
		
	}
		
}

function fileReaderRemote(entry,index){
	var TAG = ' - fileReaderRemote(entry,bIsLastFile,index) - ';

	// TODO Delete
	console.log(PRE + TAG + 'Called!');
	
//	alert('now read file');
	
	var reader	= new webinos.file.FileReader(entry.filesystem);
	entry.file(function(f){ reader.readAsText(f) }, handleErrors);
	reader.onload = function (evt) {
		// TODO Delete
		console.log(PRE + TAG + ' reader.onload Callback - called!');
//		alert(evt.target.result);
		sync.updateSyncStatus('parsing export file');
		try{
			var content = JSON.parse(evt.target.result);
			try{
				// add the current JSON-File to the datastructure
				remoteEntryRegister[index].push(content);
				
				// TODO delete
				console.log(PRE + TAG + ' new JSON File pushed to remoteEntryRegister!');
				console.log(content);
				console.log(PRE + TAG + ' => Resulting remoteEntryRegister:');
				console.log(remoteEntryRegister);
				
				remoteFileReaderToFinish[index]--;
				// TODO delete
				console.log(PRE + TAG + ' file reader of device[' + index + '] finished! Rest = ' + remoteFileReaderToFinish[index]);
				
				var readyForCallback = true;
				
				for(var i = 0; i < exportFileHandles.length; i++) {
					if (remoteFileReaderToFinish[i] != 0) {
						// All files of this device are read
						readyForCallback = false;
					}
				}
				//alert(readyForCallback);
				if (readyForCallback) {
					// TODO delete
					console.log(PRE + TAG + ' remoteFileReaderToFinish Counter reached zero! => fileReadersReady()!');
					sync.fileReadersReady();
				}
			}catch(e){
				sync.updateSyncStatus('export file is corrupted: ' + e);								
			}
		}catch(e){
			sync.updateSyncStatus('file cannot be parsed:' + e);
		}
	};
	

}

/**
* Reads local update-files for an update of the local database.
*/
function handleReadEntry(entries){
//TODO: needs optimization: updateCompleted is triggered to early
	var last = false;
	sync.updateSyncStatus('Parsing ' + entries.length + ' files for update files');
	if(entries.length > 0){
		for(var i = 0; i < entries.length; i++){
			if( i== (entries.length-1)){
					last = true;
			}
			if (entries[i].isFile){
				
				if(entries[i].name.indexOf('update_', 0)!= -1 && entries[i].name.indexOf('.json', 0)!= -1){
					
					//Checking date of update file
					sync.updateSyncStatus('unpacking: ' + entries[i].name);
					var updateDate = entries[i].name.substring(7, entries[i].name.indexOf('.json', 0));
					if(parseInt(updateDate) > wt_update){
						fileReader(entries[i], last);
					}else{
						entries[i].remove(handleRemoveSuccess, handleRemoveError);
					}
	
				}else if( i== (entries.length-1)){
					sync.updateCompleted(true);
					sync.updateSyncStatus('Sync done.');
				}
			}else if(last){
				sync.updateCompleted(true);
				sync.updateSyncStatus('Sync done.');
			}

		}
	}else{
		sync.updateCompleted(true);
		sync.updateSyncStatus('No files.');
		sync.updateSyncStatus('Sync done.');
	}
	
}

function fileReader(entry,last){
	var reader	= new webinos.file.FileReader(entry.filesystem);
	entry.file(function(f){ reader.readAsText(f) }, handleErrors);
	reader.onload = function (evt) {
		sync.updateSyncStatus('parsing  file');
		try{
			var content = JSON.parse(evt.target.result);
			try{
				createUpdateDatabase(content);
			}catch(e){
				sync.updateSyncStatus('upddate file is corrupted: ' + e);								
			}
		}catch(e){
			sync.updateSyncStatus('file cannot be parsed:' + e);
		}
		if(last){
			
			sync.updateCompleted(true);
			sync.updateSyncStatus('Update done.');
		}
	};
}


function handleErrors(error){
	console.log(error);
	//alert('nope does not work...');
}

function handleRemoveSuccess() {
	console.log(Event);
	//this is a void callback and does not handover any file or entery obejct
	sync.updateSyncStatus('update file deleted');
}

function handleRemoveError(error) {
	console.log('FileHandler was not able to delete update file!');
	console.log(error);
}

function createExportFile(entry, jsonobject, prefix){
	var TAG = ' - createExportFile(entry, jsonobject, prefix) - ';
	
	var name = prefix + '_' + new Date().getTime() + '.json';
	
	// TODO Delete
	console.log(PRE + TAG + 'new file is created - ' + prefix + '-file for the JSON-object:');
	console.log(jsonobject);
	


	
	entry.getFile(name, {
				create: true,
				exclusive: true
			}, function (entry) {
				//success Callback
				entry.createWriter(function (writer) {
					var written = false;

					writer.onerror = function (evt) {
				
						alert("Error writing file (#" + evt.target.error.name + ")");
					}

					writer.onwrite = function (evt) {
						if (!written) {
							written = true;

							writer.write(new Blob([jsonobject]));
						} else { 

						}
					}

					writer.truncate(0);
				}, function (error) {
					editor.dialog("close");

					alert("Error retrieving file writer (#" + error.name + ")");
				});
			}, function (error) {
				//errror callback for get file
				console.log(error);
			});
}

/**
* Searches for update-files in the local storage and for export-files in the remote storages.
* These files represent the history of the modifications in the databases.
*/
function createUpdateDatabase(updateObjects) {
	var TAG = ' - createUpdateDatabase(updateObjects) - ';
	// TODO Delete start
	console.log(PRE + TAG + ' called!');
	if (wt_update != null) {
		console.log(PRE + TAG + ' wt_update = ' + wt_update);
		console.log(PRE + TAG + ' updateObjects.creationStamp = ' + updateObjects.creationStamp);
	} else {
		console.log(PRE + TAG + ' wt_update == null');		
	}
	// TODO Delete end
	
	sync.updateSyncStatus('Update database...');

	var bLocalTravelsChanged = false;
	var bLocalPoisChanged = false;
	var bLocalPoiTravelsChanged = false;
	var bLocalDeletionTasksChanged = false;
	
	if (wt_update == null || updateObjects.creationStamp > wt_update) {

			// updates or adds travels of the update log file

			// TODO Delete
			console.log(PRE + TAG + ' updateObjects qualified for the update! Now the every category is checked for updates (travel/pois/poitravels/deletiontasks)');		
			
			
			for (var i = 0; i < updateObjects.travels.length; i++) {
				var currentTravel = updateObjects.travels[i];
			 	sync.updateSyncStatus(currentTravel.id);
			  // search for the travel for an update operation, time complexity is O(n)
			  var travelFound = false;
			  for(var j = 0; j < wt_travels.length; j++) {
				  if (wt_travels[j].id == currentTravel.id) {
					  travelFound = true;
					  // checks if the travel information of the update file is the latest information.
					  if (currentTravel.lastModified > wt_travels[j].lastModified) {
						  // update this travel
						  wt_travels.splice(j,1,currentTravel);
					  } else {
						  console.log('travelid=' + currentTravel.id + ': travel update was discarded - date expired.');
					  }
                      break;
				  }
			  }
			  if (!travelFound) {
				  // add the travel to the list
				  wt_travels.push(currentTravel);
			  }
			  bLocalTravelsChanged = true;
			}

			// updates or adds pois of the update log file
			for (var i = 0; i < updateObjects.pois.length; i++) {
			  var currentPoi = updateObjects.pois[i];
			  // search for the poi for an update operation, time complexity is O(n)
			  var poiFound = false;
			  for(var j = 0; j < wt_pois.length; j++) {
				  if (wt_pois[j].id == currentPoi.id) {
					  poiFound = true;
					  // checks if the poi information of the update file is the latest information.
					  if (currentPoi.lastModified > wt_pois[j].lastModified) {					  
						  // update this poi
						  wt_pois.splice(j, 1, currentPoi);
					  } else {
						  console.log('poiid=' + currentPoi.id + ': poi update was discarded - date expired.');
					  }
                    break;
				  }
			  }
			  if (!poiFound) {
				  // add the poi to the list
				  wt_pois.push(currentPoi);
			  }	
			  bLocalPoisChanged = true;
			}  	  	

			// updates or adds poitravels of the update log file
			for (var i = 0; i < updateObjects.poitravels.length; i++) {
			  var currentPoiTravel = updateObjects.poitravels[i];
			  
			  // search for the poitravel for an update operation, time complexity is O(n)
			  var poiTravelFound = false;
			  for(var j = 0; j < wt_poitravels.length; j++) {
				  if (wt_poitravels[j].id == currentPoiTravel.id) {
					  poiTravelFound = true;
					  // checks if the poi information of the update file is the latest information.
					  if (currentPoiTravel.lastModified > wt_poitravels[j].lastModified) {	
						  // update this poitravel
						  wt_poitravels.splice(j, 1, currentPoiTravel);
					  } else {
						  console.log('poitravelid=' + currentPoiTravel.id + ': poitravel update was discarded - date expired.');
					  }
				  }
			  }
			  if (!poiTravelFound) {
				  // add the poitravel to the list
				  wt_poitravels.push(currentPoiTravel);
			  }
			  bLocalPoiTravelsChanged = true;
			}  	  		
				
			// deletes objects of the update log file 
			for (var i = 0; i < updateObjects.deletiontasks.length; i++) {
			  var currentDeletionTask = updateObjects.deletiontasks[i];
			  var currentTypeID = currentDeletionTask.objectId;
			  switch (currentDeletionTask.type) {
				case "travel":
					// Deletes a Travel,searching for the travel in time complexity O(n)
					for (var j = 0; j < wt_travels.length; j++) {
						if (wt_travels[j].id == currentTypeID) {
							// Travel found - deletes the travel if timestamp is ok
							if (currentDeletionTask.timestamp > wt_travels[j].lastModified) {
								wt_travels.splice(j,1); // deletion without insertion
								console.log("travel with ID=%i, deleted!",currentDeletionTask.objectId);
								bLocalTravelsChanged = true;
								// only entries of  the deletiontasks which take action are stored in the localStorage history
								// insertDeletionTask(currentDeletionTask);
								for (var k = 0; k < wt_deletiontasks.length; k++) {
									if (wt_deletiontasks[k].id == currentDeletionTask.id) throw err;
								}
								wt_deletiontasks.push(currentDeletionTask);
								bLocalDeletionTasksChanged = true;
							} else {
								console.log('deletiontaskid=' + currentDeletionTask.id + ': deletiontask for travelid ' + wt_travels[j].id + '  was discarded - date expired.');
							}	
						} 
					}
					break;
				case "poi":
					// Deletes a Poi,searching for the poi in time complexity O(n)
					for (var j = 0; j < wt_pois.length; j++) {
						if (wt_pois[j].id == currentTypeID) {
							// Poi found - deletes the poi if timestamp is ok
							if (currentDeletionTask.timestamp > wt_pois[j].lastModified) {
								wt_pois.splice(j,1);
								console.log("poi with ID=%i, deleted!",currentDeletionTask.objectId);
								bLocalPoisChanged = true;
								//insertDeletionTask(currentDeletionTask);
								for (var k = 0; k < wt_deletiontasks.length; k++) {
									if (wt_deletiontasks[k].id == currentDeletionTask.id) throw err;
								}
								wt_deletiontasks.push(currentDeletionTask);
								bLocalDeletionTasksChanged = true;
							} else {
								console.log('deletiontaskid=' + currentDeletionTask.id + ': deletiontask for poiid ' + wt_pois[j].id + '  was discarded - date expired.');
							}	
						} 
					}
					break;
				case "poitravel":
					// Deletes a PoiTravel,searching for the poitravel in time complexity O(n)
					for (var j = 0; j < wt_poitravels.length; j++) {
						if (wt_poitravels[j].id == currentTypeID) {
							// PoiTravel found - deletes the poitravel if timestamp is ok
							if (currentDeletionTask.timestamp > wt_poitravels[j].lastModified) {
								wt_poitravels.splice(j,1);
								console.log("poitravel with ID=%i, deleted!",currentDeletionTask.objectId);
								bLocalPoiTravelsChanged = true;
								//insertDeletionTask(currentDeletionTask);
								for (var k = 0; k < wt_deletiontasks.length; k++) {
									if (wt_deletiontasks[k].id == currentDeletionTask.id) throw err;
								}
								wt_deletiontasks.push(currentDeletionTask);
								bLocalDeletionTasksChanged = true;
							} else {
								console.log('deletiontaskid=' + currentDeletionTask.id + ': deletiontask for poitravelid ' + wt_poitravels[j].id + '  was discarded - date expired.');
							}	
						} 
					}
					break;
			  }
			}

			// write all JSON Objects back into the local storage, only if anything was changed
			if (bLocalTravelsChanged) {
                console.log('Update of localStorage for wt_travels complete!');
			}
			if (bLocalPoisChanged) {
                console.log('Update of localStorage for wt_pois complete!');
			}
			if (bLocalPoiTravelsChanged) {
                console.log('Update of localStorage for wt_poitravels complete!');
			}
			if (bLocalDeletionTasksChanged) {
                console.log('Update of localStorage for wt_deletiontasks complete!');
			}
            // 6) Update the wt_update file and deletes the corresponding update file
			// update the update flag in wt_update (timestamp, current time)
            
            wt_update = updateObjects.creationStamp;
			console.log('New update-timestamp: ' + wt_update);
		} else {
			sync.updateSyncStatus('Update expired. No modifications executed.');
			console.log('Update expired. No modifications executed.');
			console.log('wt_update = ' + wt_update + ' > creationStamp = ' + updateObjects.creationStamp); // TODO DELETE
		}
	
	// 7) store all informations in the localStorage
	sync.saveDataToLocalStorage();
	
	try{
		// Reload the current page to show the user the updated data, here just a reload is used instead of a function-call
		//window.location.reload();
		console.log(PRE + TAG + ' page reloaded to show the latest data!');
		
		// TODO: SEEMS THAT THIS FUNCTION IS NOT IMPLEMENTED!!
		
		updateAutomotiveView();
	}catch(e){
		console.log(PRE + TAG + ' EXCEPTION:');
		console.log(e);
	}
}

// Returns the JSONObject which represents the export-JSONObject-file since the last export.
function createExportDatabase() {
	// Current time is used as export time
	var exportTime = new Date().valueOf();
	var updateObjects = {"exportingDevice":"","creationStamp":0,"travels":[],"pois":[],"poitravels":[],"deletiontasks":[]};

	// Takes the first local filesystem-service found as exporting device name.
	if (updateFileServices.length == 0) {
		console.log('No local update fileservice available!');
		return updateObjects;
	}
	
	//updateObjects.exportingDevice = updateFileServices[0].filesystem._service.serviceAddress; 
	updateObjects.exportingDevice = connectedSystems[0].serviceAddress; 
	updateObjects.creationStamp = exportTime;
	
	wt_export = JSON.parse(localStorage.getItem("wt_export")); // refresh the value of the variable
	wt_travels = JSON.parse(localStorage.getItem("wt_travels")); // refresh the value of the variable
		
	wt_pois = JSON.parse(localStorage.getItem("wt_pois")); // refresh the value of the variable
	
	wt_poitravels= JSON.parse(localStorage.getItem("wt_poitravels")); // refresh the value of the variable
	wt_deletiontasks= JSON.parse(localStorage.getItem("wt_deletiontasks")); // refresh the value of the variable	
	
	// in case of the first export
	if (wt_export == null) wt_export = 0;

	// 1) Find Service via Webinos File API, see REMOTE FILE SYSTEM
	
	// 2) Find objects which were created or modified since the last export
		// write all new travels to the export output
		if(wt_travels == null){
			wt_travels = new Array();
		}
		for (var i = 0; i < wt_travels.length; i++) {
			var currentTravel = wt_travels[i];
			if (currentTravel.lastModified > wt_export) {
				updateObjects.travels.push(currentTravel);
				console.log("Travel with ID = " + currentTravel.id + " qualified for export");
			}
		}
		
		if(wt_pois == null){
			wt_pois = new Array();
		}
		// write all new pois to the export output
		for (var i = 0; i < wt_pois.length; i++) {
			var currentPoi = wt_pois[i];
			if (currentPoi.lastModified > wt_export) {
				updateObjects.pois.push(currentPoi);
				console.log("Poi with ID = " + currentPoi.id + " qualified for export");
			}
		}
		if(wt_poitravels == null){
			wt_poitravels = new Array();
		}		
		// write all new poitravels to the export output
		for (var i = 0; i < wt_poitravels.length; i++) {
			var currentPoiTravel = wt_poitravels[i];
			if (currentPoiTravel.lastModified > wt_export) {
				updateObjects.poitravels.push(currentPoiTravel);
				console.log("PoiTravel with ID = " + currentPoiTravel.id + " qualified for export");
			}
		}
		
		if(wt_deletiontasks == null){
			wt_deletiontasks = new Array();
		}
		// write all new deletiontasks to the export output
		for (var i = 0; i < wt_deletiontasks.length; i++) {
			var currentDeletionTask = wt_deletiontasks[i];
			if (currentDeletionTask.lastModified > wt_export) {
				updateObjects.deletiontasks.push(currentDeletionTask);
				console.log("DeletionTask with ID = " + currentDeletionTask.id + " qualified for export");
			}
		}
	
	// 3) Update the export time in the localStorage wt_update
	localStorage.setItem("wt_export", JSON.stringify(exportTime));
		
	return updateObjects;
}

/* Checks if an JsonFile has no content 
 * @return true if the JsonFile has no content, false otherwise
 */
function isExportEmpty(jsonObject) {
	var TAG = ' - isExportEmpty(jsonObject) - ';
	var bResult = false;
	bResult = (jsonObject.travels.length == 0) && (jsonObject.pois.length == 0) && (jsonObject.poitravels.length == 0) && (jsonObject.deletiontasks.length == 0);

	// TODO Delete
	if (bResult) console.log(PRE + TAG + " JSON is empty. No information at all.");
	
//	bResult = (jsonObject.travels.length == 0);
//	console.log('TRAVELS isEmpty =' + bResult);
//	bResult = bResult && (jsonObject.pois.length == 0);
//	console.log('POIS isEmpty =' + bResult);
//	bResult = bResult && (jsonObject.poitravels.length == 0);
//	console.log('POITRAVELS isEmpty =' + bResult);
//	bResult = bResult && (jsonObject.deletiontasks.length == 0);
//	console.log('DELETIONTASKS isEmpty =' + bResult);

	return bResult;
}

function deleteDataFromLocalStorage(){
	// deletes old data
	localStorage.setItem("wt_travels", JSON.stringify(null));
	localStorage.setItem("wt_pois", JSON.stringify(null));
	localStorage.setItem("wt_poitravels", JSON.stringify(null));
	localStorage.setItem("wt_deletiontasks", JSON.stringify(null));
	localStorage.setItem("wt_export", JSON.stringify(null));
	localStorage.setItem("wt_update", JSON.stringify(null));
	localStorage.setItem("wt_remoteUpdates", JSON.stringify(null));
	// since the FILE API is not used the informations for the update are read from the localStorage
	// localStorage.setItem("updateObjects", JSON.stringify(null));
	
	console.log('all data deleted from local storage');
}


var updateReadyListeners = new Array();
var updateSyncStatusListeners = new Array();
var updateCompletedListeners = new Array();
var fileReaderReadyListeners = new Array();

sync.addUpdateReadyListener = function(callback){
	updateReadyListeners.push(callback);
}


sync.addSyncStatusListener = function(callback){
	updateSyncStatusListeners.push(callback);
}

sync.updateSyncStatus = function(message){
	for(var i=0; i < updateSyncStatusListeners.length; i++){
		updateSyncStatusListeners[i](message);
	}

}

sync.addUpdateCompletedListener = function(callback){
	updateCompletedListeners.push(callback);
}

sync.updateCompleted = function(status){
	for(var i=0; i < updateCompletedListeners.length; i++){
		updateCompletedListeners[i](status);
	}

}

sync.addFileReaderReadyListener = function(callback){
	var TAG = ' - addFileReaderReadyListener() - ';
	
	// TODO Delete
	console.log(PRE + TAG + ' called! - Pushed Callback for FileReaderReady!');

	fileReaderReadyListeners.push(callback);
}

sync.fileReadersReady = function(){
	var TAG = ' - fileReadersReady() - ';
	
	// TODO Delete
	console.log(PRE + TAG + ' called!');
	for(var i=0; i < fileReaderReadyListeners.length; i++){
		fileReaderReadyListeners[i](status);
	}

}

sync.updateReady = function(){
	updateReady = true;
	for(var i=0; i < updateReadyListeners.length; i++){
		updateReadyListeners[i]();
	}
}

sync.saveDataToLocalStorage = function(){
	localStorage.setItem("wt_travels", JSON.stringify(wt_travels));
	localStorage.setItem("wt_pois", JSON.stringify(wt_pois));
	localStorage.setItem("wt_poitravels", JSON.stringify(wt_poitravels));
	localStorage.setItem("wt_deletiontasks", JSON.stringify(wt_deletiontasks));
	localStorage.setItem("wt_export", JSON.stringify(wt_export));
	localStorage.setItem("wt_update", JSON.stringify(wt_update));
	localStorage.setItem("wt_remoteUpdates", JSON.stringify(wt_remoteUpdates));
	console.log('all data saved in local storage objects');
}

/**
* This function is used to update the localStorage variable wt_remoteUpdate for a certain device/remoteService.<br>
* New entries will be inserted if needed.
*/
function refreshRemoteUpdateVar(currentDeviceName, newTimestamp) {
	var TAG = ' - refreshRemoteUpdateVar(currentDeviceName, newTimestamp) - ';
	var bServiceFound = false;
	
	for (var k=0; k < wt_remoteUpdates.length; k++) {
		if (wt_remoteUpdates[k].serviceAddress == currentDeviceName) {
			bServiceFound = true;
			wt_remoteUpdates[k].timestamp = newTimestamp;		
			break;
		}
	}
	
	if (!bServiceFound) {
		// First time that this service was visible during update process
		var newEntry = {"serviceAddress":"","timestamp":0};
		newEntry.serviceAddress = currentDeviceName;
		newEntry.timestamp = newTimestamp;
		wt_remoteUpdates.push(newEntry);
	}
	
	localStorage.setItem("wt_remoteUpdates", JSON.stringify(wt_remoteUpdates));
	
	// TODO Delete
	console.log(PRE + TAG + 'local Storage for remoteUpdates (via export files) refreshed:');
	console.log(wt_remoteUpdates);
}

$(document).ready(function() {
	//sync.addSyncStatusListener(function(m){alert(m);});
	try{
		if(connectedSystems.length >= 1){
			sync.initializeSyncing();
		}else{
			wt.addWebinosReadyListener(function(){
				sync.initializeSyncing();
			});
		}
		
	}catch(e){
		console.log(e);
	}
	
});
