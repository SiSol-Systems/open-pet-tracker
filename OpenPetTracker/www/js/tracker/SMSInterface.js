/* 
* SMSInterface respecting command layouts of several trackers
*/

var SMSInterface = {

	// send sms and manage responses
	send_sms : function(to_number, message, onsuccess, onerror){

		var onerror = onerror || this.onerror;

		var options = {
            replaceLineBreaks: false, // true to replace \n by a new line, false by default
            android: {
				intent : ''
                //intent: 'INTENT'  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
            }
        };

        sms.send(to_number, message, options, function(){
			if (typeof onsuccess == "function"){
				onsuccess();
			}
		}, onerror);
	},

	/* error handling */
	onerror : function(e){
		alert(e);
	},

	send_command : function(self, tracker, command_name, kwargs, onsuccess, onerror){
		var kwargs = kwargs || {};
		var request = self.commands[command_name](tracker, kwargs);
		self.send_sms(tracker.phonenumber, request.command, onsuccess, onerror);
	}

};

/* sms interface for several tracker types */

/*
* GPS Pet is a black shiny device from China
*/
var GPSPet = extend(SMSInterface, [{
	slot_mapping : {
		"1" : "A",
		"2" : "B",
		"3" : "C"
	},
	commands : {
		register_phone : function (tracker, kwargs){
			// slot is a number from 1 to x
			var slot = kwargs.slot || "1";

			var request = {
				"command" : slot_mapping[slot] + "1",
				"reply" : "Set mobile number " + slot + " OK!"
			};
			return request;
		},
		unregister_phone : function(tracker, kwargs){
			var slot = kwargs.slot || "1";

			var request = {
				"command" : slot_mapping(slot) + "0",
				"reply" : ""
			};
			return request;
		},
		set_apn : function(tracker, kwargs){
			var request = {
				"command" : "S1," + tracker.apn,
				"reply" : "Set APN OK! GPRS connecting"
			};
			return request;
		},
		set_interval : function(tracker, kwargs){
			var unit = kwargs.unit || "S";
			var request = {
				"command" : "TI" + tracker.interval + unit,
				"reply" : "Set updating time interval OK!"
			};
			return request;
		},
		activate_gprs : function(tracker, kwargs){
			var request = {
				"command" : "S2",
				"reply" : ""
			};
			return request;
		},
		deactivate_gprs : function(tracker, kwargs){
			var request = {
				"command" : "S0",
				"reply" : "GPRS OFF"
			};
			return request;
		},
		set_server : function(tracker, kwargs){
			var server = app.storage.getItem("TraccarServer");
			var port = portmap[tracker.tracker_type];
			var request = {
				"command" : "IP1," + server + "," + port,
				"reply" : ""
			};
			return request;
		},
		SMS_position : function(tracker, kwargs){
			return {"command":"loc", "reply":null};
		},
		turnoff : function(tracker, kwargs){
		},
		battery_status : function(tracker, kwargs){
			var request = {
			};
			return request;
		}
	},

	configure_device : function(tracker, onsuccess, onerror){

		var timeout = 20 * 1000; // time to wait between sent sms to not spam the device
		var onsuccess = onsuccess;

		modalDialog.show();
		
		tracker.set_device_apn(function(){

			setTimeout(function(){

				tracker.set_device_server(function(){

					setTimeout(function(){
						tracker.set_device_interval(function(){

							setTimeout(function(){

								tracker.activate_device_gprs(function(){
									tracker.is_configured = true;
									modalDialog.hide();
									tracker.save(onsuccess);
								}, onerror);							

							}, timeout);

						}, onerror);
					}, timeout)

				}, onerror);				

			}, timeout);

		}, onerror);
	}
}]);

var DS69 = extend(SMSInterface, [{
	commands : {
		register_phone : function (tracker, kwargs){
			// slot is a number from 1 to x
			var slot = kwargs.slot || "1";
			var phonenumber = app.storage.getItem("AppPhonenumber");
			var request = {
				"command" : "pw,123456,center," + phonenumber + "#",
				"reply" : "Set mobile number " + slot + " OK!"
			};
			return request;
		},
		set_apn : function(tracker, kwargs){
			var request = {
				"command" : "pw,123456,apn," + tracker.apn + "#",
				"reply" : "Set APN OK! GPRS connecting"
			};
			return request;
		},
		set_interval : function(tracker, kwargs){
			var request = {
				"command" : "pw,123456,upload," + tracker.interval + "#", //only seconds supported
				"reply" : "Set updating time interval OK!"
			};
			return request;
		},
		set_server : function(tracker, kwargs){
			var server = app.storage.getItem("TraccarServer");
			var port = portmap[tracker.tracker_type];

			var request = {
				"command" : "pw,123456,ip," + server + "," + port + "",
				"reply" : ""
			};
			return request;
		},
		SMS_position : function(tracker, kwargs){
			return {"command":"url#", "reply":null};
		}
	},

	configure_device : function(tracker, onsuccess, onerror){
		var timeout = 20 * 1000; // time to wait between sent sms to not spam the device
		var onsuccess = onsuccess;

		modalDialog.show();
		
		tracker.set_device_apn(function(){

			setTimeout(function(){

				tracker.set_device_server(function(){

					setTimeout(function(){
						tracker.set_device_interval(function(){

							tracker.is_configured = true;
							modalDialog.hide();
							tracker.save(onsuccess);

						}, onerror);
					}, timeout);

				}, onerror);				

			}, timeout);

		}, onerror);

	}
}]);

var ST904 = extend(SMSInterface, [{
	commands : {
		register_phone : function(tracker, kwargs){
			var phonenumber = app.storage.getItem("AppPhonenumber");
			// Number+pass+blank+serial
			var request = {
				"command" : "" + phonenumber + "0000 1",
				"reply" : "SET OK"
			};
			return request;
		},
		set_apn : function(tracker, kwargs){
			// 803+password+Blank+APN
			var request = {
				"command" : "8030000 " + tracker.apn,
				"reply" : "SET OK"
			};
			return request;
		},
		activate_gprs : function(tracker, kwargs){
			// 710+Password
			var request = {
				"command" : "7100000",
				"reply" : "SET OK"
			};
			return request;
		},
		set_interval : function(tracker, kwargs){
			// 805+password+Blank+T
			// accepts onlz seconds
			var request = {
				"command" : "8050000 " + tracker.interval,
				"reply" : "SET OK"
			};
			return request;
		},
		set_server : function(tracker, kwargs){
			var server = app.storage.getItem("TraccarServer");
			var port = portmap[tracker.tracker_type];
			// 804+password+Blank+IP+Blank+Port
			var request = {
				"command" : "8040000 " + server + " " + port,
				"reply" : "SET OK"
			};
			return request;
		},
		activate_sleep_mode : function(tracker, kwargs){
			// SLEEP0000 1
			var request = {
				"command" : "SLEEP0000 1",
				"reply" : "SET OK"
			};
			return request;
		},
		deactivate_sleep_mode : function(tracker, kwargs){
			// SLEEP0000 0
			var request = {
				"command" : "SLEEP0000 0",
				"reply" : "SET OK"
			};
			return request;
		}
	},

	configure_device : function(tracker, onsuccess, onerror){
		var timeout = 20 * 1000; // time to wait between sent sms to not spam the device
		var onsuccess = onsuccess;

		modalDialog.show();
		// currently we do not read the phonenumber
		//var request = this.commands.register_phone();
		//SMSInterface.send(tracker.phonenumber, request.command, function(){

		//	setTimeout(function(){

				tracker.set_device_apn(function(){

					setTimeout(function(){

						tracker.set_device_server(function(){

							setTimeout(function(){
								tracker.set_device_interval(function(){
	
									// activate_gprs
									setTimeout(function(){

										tracker.activate_device_gprs(function(){
					
											tracker.is_configured = true;
											modalDialog.hide();
											tracker.save(onsuccess);


										}, onerror);				

									}, timeout);

								}, onerror);
							}, timeout)

						}, onerror);				

					}, timeout);

				}, onerror);

			///}, timeout);

		//}, onerror);
	}
}]);
