"use strict";

/* manage all active trackers */
var Tracking = {

	last_LatLng : null,

	active_trackers : {},

	add_tracker : function(tracker){

		var tracker_id = tracker.id.toString();

		if (Tracking.active_trackers.hasOwnProperty(tracker_id)){
			Tracking.remove_tracker(tracker);
		}

		Tracking.active_trackers[tracker_id] = {
			"tracker" : tracker,
			"polyline_cache" : [],
			"tracking_interval_id" : null,
			"waiting_for_positions" : false
		};

		var interval = Math.floor(tracker.interval/3) * 1000;

		Tracking.active_trackers[tracker_id].tracking_interval_id = setInterval(function(){

			var _tracker = Tracking.active_trackers[tracker_id].tracker;

			Tracking.get_recent_positions(_tracker, function(positionlist){
				console.log("[IMEI " + _tracker.imei + "] received " + positionlist.length + " positions");
				// var positionlist = DEBUG_LIST;

				if (positionlist.length > 0){
					var position = positionlist[positionlist.length -1];
					Tracking.last_LatLng = new L.LatLng(parseFloat(position.latitude), parseFloat(position.longitude));

					TrackingMap.update_tracker_on_map(_tracker, positionlist);

				}
				

			}, function(){
				Tracking.position_error(_tracker); 
			});
		}, interval);

	},
	remove_tracker : function(tracker){

		var tracker_id = tracker.id.toString();

		if (this.active_trackers.hasOwnProperty(tracker_id)){
			var tracking = this.active_trackers[tracker_id];
			if (tracking.tracking_interval_id != null){
				clearInterval(tracking.tracking_interval_id);
			}
			delete this.active_trackers[tracker_id];

			TrackingMap.remove_tracker_from_map(tracker_id);
	
		}
	},

	update_tracker : function(tracker){
		var tracker_id = tracker.id.toString();
		if (this.active_trackers.hasOwnProperty(tracker_id)){
			this.active_trackers[tracker_id].tracker = tracker;
		}
	},

	// TRACCAR FUNCTIONALITY
	// fetch all positions since timestamp
	//{"id":728,"attributes":{"flags":3014656,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:00:59.284+0000","deviceTime":"2016-08-13T21:21:28.000+0000","fixTime":"2016-08-13T21:21:28.000+0000","outdated":false,"valid":false,"latitude":49.663185,"longitude":11.077122,"altitude":296.8,"speed":0.0,"course":80.0,"address":null}
	get_positions_in_timeframe : function(tracker, from_unixtime, to_unixtime, onsuccess, onerror, force){

		TraccarInterface.get_positions_in_timeframe(tracker, from_unixtime, to_unixtime, onsuccess, onerror, force);

	},
	
	// shortcut for getting the last 5 minutes
	get_recent_positions : function(tracker, onsuccess, onerror, force){

		var now = new Date();

		// go 5 seconds into the future
		var now_milliseconds = now.getTime() + 5000; // 1473929447290

		var to_unixtime = now_milliseconds;

		// interval is always stored in seconds
		var from_unixtime = now_milliseconds - ( tracker.interval * 1000 * 10 );

		TraccarInterface.get_positions_in_timeframe(tracker, from_unixtime, to_unixtime, onsuccess, onerror, force);

	},

	position_error : function(tracker){
		console.log('no position found for tracker ' + tracker.imei.toString());
	}
};


var TrackingMap = {

	map : null, // the leaflet map object

	has_been_centered : false, // only center once, prevent continous recentering on new positions

	device_marker : null, // the marker showing the users position

	trackers : {},
	

	load_map : function(){

		// restore defaults
		TrackingMap.has_been_centered = false;
		TrackingMap.device_marker = null;
		TrackingMap.trackers = {};

		var layerSources = {
			"osmhot" : L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
				{
					attribution: '&copy; OpenStreetMap, Tiles courtesy of Humanitarian OpenStreetMap Team',
					subdomains: 'ab'
				}),
			"osm" : L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				{
					attribution: 'Map data © OpenStreetMap contributors',
					subdomains: 'ab',
					maxZoom: 20,
					maxNativeZoom: 18
				}),
	
			"satellite" : L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
					maxZoom: 20,
					maxNativeZoom: 18
				}),
			"satellite_names": L.tileLayer('http://{s}.tile.stamen.com/toner-labels/{z}/{x}/{y}.{ext}', {
				attribution: 'Map tiles by Stamen Design, CC BY 3.0 &mdash; Map data &copy; OpenStreetMap',
				subdomains: 'abcd',
				minZoom: 0,
				maxNativeZoom: 18,
				maxZoom: 20,
				ext: 'png'
			})
		}

		TrackingMap.map = L.map("TrackingMap", {
		    center: [55.83548, 8.71964],
		    zoom : 3,
			maxZoom: 24,
		    scrollWheelZoom: false
		});
	
		layerSources["satellite"].addTo(this.map);

		var baseLayers = {
			"Satellite" : layerSources["satellite"],
			"Streets" : layerSources["osm"]
		};

		L.control.layers(baseLayers, {}, {"position":"topright"}).addTo(TrackingMap.map);

	},

	center : function(position){
		var latlng = new L.LatLng(parseFloat(position.coords.latitude), parseFloat(position.coords.longitude));
		TrackingMap.map.setZoom(20);
		TrackingMap.map.panTo(latlng);
		TrackingMap.has_been_centered = true;
	},

	update_device_marker : function(position){
		if (TrackingMap.device_marker == null){

			var devicePositionIconWidth = Math.ceil(app.deviceWidth * 0.10);

			var devicePositionIcon = L.icon({
				iconUrl: imgFolder + 'selfpos.png',
				//shadowUrl: 'leaf-shadow.png',
				iconSize:     [devicePositionIconWidth, devicePositionIconWidth],
				//shadowSize:   [50, 64],
				iconAnchor:   [Math.floor(devicePositionIconWidth/2), Math.floor(devicePositionIconWidth/2)],
				//shadowAnchor: [4, 62],
				//popupAnchor:  [-3, -76]
			});

			TrackingMap.device_marker = L.marker([position.coords.latitude, position.coords.longitude], {icon: devicePositionIcon}).addTo(TrackingMap.map);
		}
		else {
			var latlng = new L.LatLng(parseFloat(position.coords.latitude), parseFloat(position.coords.longitude));
			TrackingMap.device_marker.setLatLng(latlng);
		}
	},

	update_tracker_on_map : function(tracker, positionlist){
		var map = document.getElementById("TrackingMap");

		if (map != null){

			if (positionlist.length > 0){

				var tracker_id = tracker.id.toString();

				var position = positionlist[positionlist.length -1];

				// check if the tracker is present on the map
				if (TrackingMap.trackers.hasOwnProperty(tracker_id)){
					var newLatLng = new L.LatLng(parseFloat(position.latitude), parseFloat(position.longitude));

					var tracker_on_map = TrackingMap.trackers[tracker_id];

					tracker_on_map.polyline.addLatLng(newLatLng);
					tracker_on_map.layergroup.getLayers()[0].setLatLng(newLatLng);

					// cache the polyline
					var polyline_LatLngs = tracker_on_map.polyline.getLatLngs();
					Tracking.active_trackers[tracker_id].polyline_cache = polyline_LatLngs;

				}
				else {
					TrackingMap.redraw_on_map(tracker, positionlist);
				}
			}
		}
	},

	remove_tracker_from_map : function(tracker_id){

		var map = document.getElementById("TrackingMap");
		if (map != null){
			var tracker_id = tracker_id.toString();
			if (TrackingMap.trackers.hasOwnProperty(tracker_id)){
				var tracker_on_map = TrackingMap.trackers[tracker_id];
				TrackingMap.map.removeLayer(tracker_on_map.layergroup);
				delete TrackingMap.trackers[tracker_id];
			}
		}
	},

	redraw_on_map : function(tracker, positionlist){
		var map = document.getElementById("TrackingMap");

		if (map != null){

			if (positionlist.length > 0){

				var tracker_id = tracker.id.toString();

				TrackingMap.remove_tracker_from_map(tracker_id);

				var trackerPinIconHeight = Math.ceil(app.deviceWidth * 0.15);
				var trackerPinIconWidth = Math.ceil(trackerPinIconHeight*(30/49));

				var pinIcon = L.icon({
					iconUrl: imgFolder + 'dogpin_red.png',
					//shadowUrl: 'leaf-shadow.png',
					iconSize:     [trackerPinIconWidth, trackerPinIconHeight],
					//shadowSize:   [50, 64],
					iconAnchor:   [Math.floor(trackerPinIconWidth/2), trackerPinIconHeight],
					//shadowAnchor: [4, 62],
					//popupAnchor:  [-3, -76]
				});

				var latLngList = [];

				for (var p=0; p<positionlist.length;p++){
					var position = positionlist[p];
					var newLatLng = new L.LatLng(parseFloat(position.latitude), parseFloat(position.longitude));
					latLngList.push(newLatLng);
				}

				var last_position = positionlist[positionlist.length -1];

				TrackingMap.trackers[tracker_id] = {};

				var tracker_on_map = TrackingMap.trackers[tracker_id];

				var marker = L.marker([last_position.latitude, last_position.longitude], {icon: pinIcon}).bindPopup(tracker.dog_name);
				tracker_on_map.polyline = L.polyline(latLngList, {color: "red", weight: 15, opacity: 0.7 });
				tracker_on_map.layergroup = L.layerGroup([marker, tracker_on_map.polyline]).addTo(TrackingMap.map);

				// cache the polyline
				var polyline_LatLngs = tracker_on_map.polyline.getLatLngs();
				Tracking.active_trackers[tracker_id].polyline_cache = polyline_LatLngs;

				// center the map on the first position
				if (TrackingMap.has_been_centered == false){
					TrackingMap.has_been_centered = true;

					var last_pos = positionlist[positionlist.length-1];

					var position = {
						coords : last_pos
					};
					TrackingMap.center(position);
				}

			}

		}
	}
};

var DEBUG_LIST = [{"id":728,"attributes":{"flags":3014656,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:00:59.284+0000","deviceTime":"2016-08-13T21:21:28.000+0000","fixTime":"2016-08-13T21:21:28.000+0000","outdated":false,"valid":false,"latitude":0,"longitude":0,"altitude":296.8,"speed":0.0,"course":80.0,"address":null},{"id":729,"attributes":{"flags":917505,"battery":"97","sat":"5","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:03:59.196+0000","deviceTime":"2016-09-14T14:19:50.000+0000","fixTime":"2016-09-14T14:19:50.000+0000","outdated":false,"valid":true,"latitude":49.663197,"longitude":11.07688,"altitude":277.5,"speed":0.0,"course":0.0,"address":"6 Meisenweg, Poxdorf, BY, DE"},{"id":730,"attributes":{"flags":917505,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:05:30.036+0000","deviceTime":"2016-09-14T14:21:21.000+0000","fixTime":"2016-09-14T14:21:21.000+0000","outdated":false,"valid":true,"latitude":49.663109,"longitude":11.076804,"altitude":286.1,"speed":1.0,"course":14.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":732,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:08:35.349+0000","deviceTime":"2016-09-14T14:24:19.000+0000","fixTime":"2016-09-14T14:24:19.000+0000","outdated":false,"valid":true,"latitude":49.66312,"longitude":11.076982,"altitude":282.4,"speed":1.0,"course":14.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":731,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:08:33.390+0000","deviceTime":"2016-09-14T14:24:21.000+0000","fixTime":"2016-09-14T14:24:21.000+0000","outdated":false,"valid":true,"latitude":49.663097,"longitude":11.076987,"altitude":285.9,"speed":6.0,"course":198.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":733,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:09:03.813+0000","deviceTime":"2016-09-14T14:24:42.000+0000","fixTime":"2016-09-14T14:24:42.000+0000","outdated":false,"valid":true,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":734,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:09:33.582+0000","deviceTime":"2016-09-14T14:25:26.000+0000","fixTime":"2016-09-14T14:25:26.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null},{"id":735,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:10:03.640+0000","deviceTime":"2016-09-14T14:25:56.000+0000","fixTime":"2016-09-14T14:25:56.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null},{"id":736,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:10:33.487+0000","deviceTime":"2016-09-14T14:26:26.000+0000","fixTime":"2016-09-14T14:26:26.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null}];
