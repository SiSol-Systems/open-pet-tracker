/* 
* SMSInterface respecting command layouts of several trackers
*/

var SMSInterface = {

	// send sms and manage responses
	send : function(number, message, onsuccess, onerror){

		var onerror = onerror || this.onerror;

		var options = {
            replaceLineBreaks: false, // true to replace \n by a new line, false by default
            android: {
				intent : ''
                //intent: 'INTENT'  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
            }
        };

        sms.send(number, message, options, function(){
			if (typeof onsuccess == "function"){
				onsuccess();
			}
		}, onerror);
	},

	/* error handling */
	onerror : function(e){
		alert(e);
	}

};

/* sms interface for several tracker types */
var GPSPet = extend(SMSInterface, [{
	slot_mapping : {
		"1" : "A",
		"2" : "B",
		"3" : "C"
	},
	commands : {
		register_phone : function (slot, phonenumber){
			// slot is a number from 1 to x
			var request = {
				"command" : slot_mapping[slot] + "1",
				"reply" : "Set mobile number " + slot + " OK!"
			};
			return request;
		},
		unregister_phone : function(slot){
			var request = {
				"command" : slot_mapping(slot) + "0",
				"reply" : ""
			};
			return request;
		},
		set_apn : function(apn){
			var request = {
				"command" : "S1," + apn,
				"reply" : "Set APN OK! GPRS connecting"
			};
			return request;
		},
		set_interval : function(interval, unit){
			var request = {
				"command" : "TI" + interval + unit,
				"reply" : "Set updating time interval OK!"
			};
			return request;
		},
		activate_gprs : function(){
			var request = {
				"command" : "S2",
				"reply" : ""
			};
			return request;
		},
		deactivate_gprs : function(){
			var request = {
				"command" : "S0",
				"reply" : "GPRS OFF"
			};
			return request;
		},
		set_server : function(domain, port){
			var request = {
				"command" : "IP1," + domain + "," + port,
				"reply" : ""
			};
			return request;
		},
		SMS_position : function(){
			return {"command":"loc", "reply":null};
		},
		turnoff : function(){
		},
		battery_status : function(){
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
		register_phone : function (slot, phonenumber){
			// slot is a number from 1 to x
			var request = {
				"command" : "pw,123456,center," + phonenumber + "#",
				"reply" : "Set mobile number " + slot + " OK!"
			};
			return request;
		},
		set_apn : function(apn){
			var request = {
				"command" : "pw,123456,apn," + apn + "#",
				"reply" : "Set APN OK! GPRS connecting"
			};
			return request;
		},
		set_interval : function(interval, unit){
			var request = {
				"command" : "pw,123456,upload," + interval + "#", //only seconds supported
				"reply" : "Set updating time interval OK!"
			};
			return request;
		},
		set_server : function(domain, port){
			var request = {
				"command" : "pw,123456,ip," + domain + "," + port + "",
				"reply" : ""
			};
			return request;
		},
		SMS_position : function(){
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
		register_phone : function(slot, phonenumber){
			// Number+pass+blank+serial
			var request = {
				"command" : "" + phonenumber + "0000 1",
				"reply" : "SET OK"
			};
			return request;
		},
		set_apn : function(apn){
			// 803+password+Blank+APN
			var request = {
				"command" : "8030000 " + apn,
				"reply" : "SET OK"
			};
			return request;
		},
		activate_gprs : function(){
			// 710+Password
			var request = {
				"command" : "7100000",
				"reply" : "SET OK"
			};
			return request;
		},
		set_interval : function(interval, unit){
			// 805+password+Blank+T
			// accepts onlz seconds
			var request = {
				"command" : "8050000 " + interval,
				"reply" : "SET OK"
			};
			return request;
		},
		set_server : function(domain, port){
			// 804+password+Blank+IP+Blank+Port
			var request = {
				"command" : "8040000 " + domain + " " + port,
				"reply" : "SET OK"
			};
			return request;
		},
		activate_sleep_mode : function(){
			// SLEEP0000 1
			var request = {
				"command" : "SLEEP0000 1",
				"reply" : "SET OK"
			};
			return request;
		},
		deactivate_sleep_mode : function(){
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
