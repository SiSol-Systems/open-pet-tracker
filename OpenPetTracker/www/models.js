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

	save : function(self, callback, update_traccar){

		var update_traccar = update_traccar || true;		

		if (update_traccar == true){
			// register with traccar on save
			self.register_with_traccar(self, function(server_deviceId){

				self.server_deviceId = server_deviceId;
				self.is_connected_to_server=true;
				self.super().save(self, callback);

			}, function(){
				alert("failed to register or update with traccar server");
				self.super().save(self, callback);
			});
		}
		else {
			self.super().save(self, callback);
		}
	},

	unregister_from_traccar : function(self, onsuccess, onerror){

		TraccarInterface.delete_device(self.server_id, function(){
			self.server_id = null;
			self.is_connected_to_server = false;
			self.save(self, onsuccess, false);

		}, onerror);
	},

	// Traccar Server functions
	register_with_traccar : function(self, onsuccess, onerror){
		TraccarInterface.register_device(self.imei, self.dog_name, onsuccess, onerror);
	},

	update_traccar_data : function(self, onsuccess, onerror){
		alert("notimplemented");
	},

	// SMS configuring of tracking device
	send_sms_command : function(self, command_name, kwargs, onsuccess, onerror){
		var sms_interface = window[self.tracker_type];
		sms_interface.send_command(sms_interface, self, command_name, kwargs, onsuccess, onerror);
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

*/
