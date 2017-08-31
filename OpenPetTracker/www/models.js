/*
* define models here
* primary key will be added automatically if not defined
*/

var TRACKER_TYPES = [
	["GPSPet", "GPS Pet"], // black, shiny with glowing collar, "GPS Pet Tracking System", no onoff button
	["DS69", "DS69"], // black with two eyes and a nose - nose is the onoff button
	["ST904", "ST904 (white)"] // white, blue sos button, 3 LEDS
];


var Tracker = Model(models.Model, [{
	"model_name" : "Tracker",
	"fields" : {
		"imei" : models.CharField({"max_length":255, "unique":true}),
		"phonenumber" : models.CharField({"max_length":255}),
		"dog_name" : models.CharField({"max_length":255}),
		"tracker_type" : models.CharField({"max_length" : 255, "choices" : TRACKER_TYPES}),
		"apn" : models.CharField({"max_length" : 255}),
		"server_deviceId" : models.IntegerField({"null":true}), // int, not imei
		"interval" : models.IntegerField({"default":30}), // always SECONDS, convert minutes etc to seconds before storage
		"is_connected_to_server" : models.BooleanField({"default":false}),
		"is_configured" : models.BooleanField({"default":false}),
		"is_active" : models.BooleanField({"default":true}) // on app start, all active trackers will try to get gps positions
	},

	save : function(self, callback){
		// register with traccar on save
		TraccarInterface.register_device(self.imei, self.dog_name, function(server_deviceId){

			self.server_deviceId = server_deviceId;
			self.is_connected_to_server=true;
			self.super().save(self, callback);

		}, function(){
			alert("failed to register or update with traccar server");
			self.super().save(self, callback);
		});
	}

}]);


/*
var Tracker = Model.define("Tracker", {
	"fields" : {
		"imei" : models.CharField({"max_length":255, "unique":true}),
		"phonenumber" : models.CharField({"max_length":255}),
		"dog_name" : models.CharField({"max_length":255}),
		"tracker_type" : models.CharField({"max_length" : 255, "choices" : TRACKER_TYPES}),
		"apn" : models.CharField({"max_length" : 255}),
		"server" : models.CharField({"max_length":255, "default":TraccarInterface.server}),
		"port" : models.IntegerField({"max_length":255}),
		"server_id" : models.IntegerField({"null":true}),
		"interval" : models.IntegerField({"default":30}), // always SECONDS, convert minutes etc to seconds before storage
		"is_connected_to_server" : models.BooleanField({"default":false}),
		"is_configured" : models.BooleanField({"default":false}),
		"is_active" : models.BooleanField({"default":true}), // on app start, all active trackers will try to get gps positions
		"last_latitude" : models.FloatField({"null":true}),
		"last_longitude" : models.FloatField({"null":true})
	},

	__init__ : function(self){
		self.tracker_interface = window[self.tracker_type];
		self.auto_tracking_interval_id = null;
		return self;
	},

	save : function(callback){
		this.port = portmap[this.tracker_type];
		this._save(callback);
	},

	// controlling
	// fetch all positions since timestamp
	get_positions_in_timeframe : function(from_unixtime, to_unixtime, onsuccess, onerror, force){
		var self = this;

		TraccarInterface.get_recent_positions(self.server_id, from_unixtime, to_unixtime, function(list){

			onsuccess(list);
			// if the list has a length, store the recent positions in the positions table
			if (list.length > 0){
				var latest = list[list.length-1];
				//{"id":728,"attributes":{"flags":3014656,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:00:59.284+0000","deviceTime":"2016-08-13T21:21:28.000+0000","fixTime":"2016-08-13T21:21:28.000+0000","outdated":false,"valid":false,"latitude":49.663185,"longitude":11.077122,"altitude":296.8,"speed":0.0,"course":80.0,"address":null}

				// too blockng on android 4.1
				//self.last_latitude = latest.latitude;
				//self.last_longitude = latest.longitude;
				//self.save();
			}
		}, onerror, force);

	},

	start_auto_tracking : function(){
		var self = this;

		function onpositionerror(){
			console.log('no position found for tracker ' + self.server_id.toString());
		};

		var persistent_instance = app.trackers[self.id];		

		if (persistent_instance.auto_tracking_interval_id == null){
			console.log("[TRACKER instance] starting auto tracking");
			var interval = Math.floor(self.interval/3) * 1000;
			persistent_instance.auto_tracking_interval_id = setInterval(function(){
				persistent_instance.get_recent_positions(function(positionlist){
					persistent_instance.update_position(positionlist);
				}, onpositionerror);
			}, interval);
		}
	},

	stop_auto_tracking : function(){

		var self = this;

		var persistent_instance = app.trackers[self.id];

		if (persistent_instance.auto_tracking_interval_id != null){
			console.log("[TRACKER instance] stopping auto tracking");
			clearInterval(persistent_instance.auto_tracking_interval_id);
			persistent_instance.auto_tracking_interval_id = null;
		}
	},

	// traccar server
	register_with_traccar : function(onsuccess, onerror){

		var self = this;

		TraccarInterface.register_device(self.imei, self.dog_name, function(server_id){
			self.server_id = server_id;
			self.is_connected_to_server=true;
			self.save(onsuccess);
		}, onerror);
		
	},
	update_traccar_data : function(onsuccess, onerror){
		alert("notimplemented");
	},
	unregister_from_traccar : function(onsuccess, onerror){

		var self = this;

		TraccarInterface.delete_device(self.server_id, function(){
			self.server_id = null;
			self.is_connected_to_server=true;
			self.save(onsuccess);
		}, onerror);
	},

	get_recent_positions : function(onsuccess, onerror){

		var self = this;

		var now = new Date();

		// go 5 seconds into the future
		var now_milliseconds = now.getTime() + 5000; // 1473929447290

		var to_unixtime = now_milliseconds;

		// interval is always stored in seconds
		var from_unixtime = now_milliseconds - ( this.interval * 1000 * 10 );


		TraccarInterface.get_recent_positions(self.server_id, from_unixtime, to_unixtime, function(list){

			onsuccess(list);
			// if the list has a length, store the recent positions in the positions table
			if (list.length > 0){
				var latest = list[list.length-1];
				//{"id":728,"attributes":{"flags":3014656,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:00:59.284+0000","deviceTime":"2016-08-13T21:21:28.000+0000","fixTime":"2016-08-13T21:21:28.000+0000","outdated":false,"valid":false,"latitude":49.663185,"longitude":11.077122,"altitude":296.8,"speed":0.0,"course":80.0,"address":null}

				// too blockng on android 4.1
				//self.last_latitude = latest.latitude;
				//self.last_longitude = latest.longitude;
				//self.save();
			}
		}, onerror);

	},

	// remove all tracker layers, redraw with positionlist
	redraw_on_map : function(positionlist){
		var self = this;

		if (Pagemanager.current_page_id == "home.html"){

			if (positionlist.length >0){

				if (self.hasOwnProperty("layergroup")){
					app.trackingMap.removeLayer(self.layergroup);
				}

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

				for (var l=0; l<positionlist.length;l++){
					var position = positionlist[l];
					var newLatLng = new L.LatLng(parseFloat(position.latitude), parseFloat(position.longitude));
					latLngList.push(newLatLng);
				}

				var last_position = positionlist[positionlist.length -1];
				var marker = L.marker([last_position.latitude, last_position.longitude], {icon: pinIcon}).bindPopup(self.dog_name);
				self.polyline = L.polyline(latLngList, {color: "red", weight: 15, opacity: 0.7 });
				self.layergroup = L.layerGroup([marker, self.polyline]).addTo(app.trackingMap);

				// center the map on the first position
				if (app.trackingMap.first_time_centered == false){
					app.trackingMap.first_time_centered = true;
					var last_pos = positionlist[positionlist.length-1];
					var firstLatLng = new L.LatLng(parseFloat(last_pos.latitude), parseFloat(last_pos.longitude));
					app.trackingMap.panTo(firstLatLng);
				}

			}

		}
	},

	update_position : function(positionlist){
		var self = this;

		if (Pagemanager.current_page_id == "home.html"){

			if (positionlist.length >0){

				var position = positionlist[positionlist.length -1];

				if (!(self.hasOwnProperty("layergroup"))){
					self.redraw_on_map([position]);
				
				}
				
				else {
					var newLatLng = new L.LatLng(parseFloat(position.latitude), parseFloat(position.longitude));

					self.polyline.addLatLng(newLatLng);
					self.layergroup.getLayers()[0].setLatLng(newLatLng);

					app.trackingMap.lastTrackerLatLng = newLatLng;
				}

			}
			else {
				console.log('no new positions found for tracker ' + self.server_id.toString());
			}
		}
	},

	// SMS : configure tracking device - depends on device and should be in SMSInterface
	configure_device : function(onsuccess, onerror){
		var self = this;
		self.tracker_interface.configure_device(self, onsuccess, onerror);
	},

	update_device_configuration : function(fieldlist, onsuccess, onerror){

		var self = this;

		modalDialog.show();

		each(fieldlist, function(field_name, iterate){

			self["set_device_" + field_name](function(){
				console.log("[TRACKER instance] did send SMS for configuring " + field_name);
			});

			// wait 15 sec before sending again
			setTimeout(iterate, 15*1000);			

		}, function(){
			modalDialog.hide();
		});		

	},

	set_device_apn : function(onsuccess, onerror){
		var self = this;
		var request = self.tracker_interface.commands.set_apn(self.apn);
		SMSInterface.send(self.phonenumber, request.command, onsuccess, onerror);
	},

	set_device_server : function(onsuccess, onerror){
		var self = this;
		var request = self.tracker_interface.commands.set_server(self.server, self.port);
		SMSInterface.send(self.phonenumber, request.command, onsuccess, onerror);
	},
	
	set_device_interval : function(onsuccess, onerror){
		var self = this;
		var request = self.tracker_interface.commands.set_interval(self.interval);
		SMSInterface.send(self.phonenumber, request.command, onsuccess, onerror);
	},

	activate_device_gprs : function(onsuccess, onerror){
		var self = this;
		var request = self.tracker_interface.commands.activate_gprs();
		SMSInterface.send(self.phonenumber, request.command, onsuccess, onerror);
	},

	deactivate_device_gprs : function(onsuccess, onerror){
		var self = this;
		var request = self.tracker_interface.commands.deactivate_gprs();
		SMSInterface.send(self.phonenumber, request.command, onsuccess, onerror);
	}
	
});

var Clients = Model.define("Clients", {
	"fields" : {
		"tracker" : models.ForeignKey(Tracker),
		"phonenumber" : models.CharField({"max_length":255}),
		"slot" : models.CharField({"max_length" : 255})
	},
	"Meta" : {
		"unique_together" : ["tracker", "phonenumber"]
	}
});

var Positions = Model.define("Positions", {
	"fields" : {
		"tracker" : models.ForeignKey(Tracker),
		"latitude" : models.FloatField(),
		"longitude" : models.FloatField(),
		"time" : models.DateTimeField()
	}
});*/
