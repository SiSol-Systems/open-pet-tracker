"use strict";

var TraccarInterface = {
	server : null,
	REST_port : 8082,
	auth_name : null,
	auth_password : null,

	headers : function(){
		var headers = {
			"Authorization" : "Basic " + btoa(this.auth_name + ":" + this.auth_password),
			"Content-Type" : "application/json;charset=UTF-8"
		};
		return headers;
	},
	create_user : function(username, password){
	},
	delete_user : function(username){
	},
	create_group : function(group_name){
	},
	delete_group : function(group_id){
	},
	get_positions_in_timeframe : function(tracker, from_unixtime, to_unixtime, onsuccess, onerror, force){

		if (this.server == null || this.REST_port == null || this.auth_name == null || this.auth_password == null){
			console.log("[TraccarInterface] No server defined");
			if (typeof onerror == "function"){
				onerror();
			}
			return;
		}

		//http://www.sisol-systems.com:8082/api/positions?deviceId=7&from=1985-04-12T23:20:50.52Z&to=2017-04-12T23:20:50.52Z
		/*
			[{"id":728,"attributes":{"flags":3014656,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:00:59.284+0000","deviceTime":"2016-08-13T21:21:28.000+0000","fixTime":"2016-08-13T21:21:28.000+0000","outdated":false,"valid":false,"latitude":49.663185,"longitude":11.077122,"altitude":296.8,"speed":0.0,"course":80.0,"address":null},{"id":729,"attributes":{"flags":917505,"battery":"97","sat":"5","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:03:59.196+0000","deviceTime":"2016-09-14T14:19:50.000+0000","fixTime":"2016-09-14T14:19:50.000+0000","outdated":false,"valid":true,"latitude":49.663197,"longitude":11.07688,"altitude":277.5,"speed":0.0,"course":0.0,"address":"6 Meisenweg, Poxdorf, BY, DE"},{"id":730,"attributes":{"flags":917505,"battery":"97","sat":"4","ip":"80.187.81.18"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:05:30.036+0000","deviceTime":"2016-09-14T14:21:21.000+0000","fixTime":"2016-09-14T14:21:21.000+0000","outdated":false,"valid":true,"latitude":49.663109,"longitude":11.076804,"altitude":286.1,"speed":1.0,"course":14.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":732,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:08:35.349+0000","deviceTime":"2016-09-14T14:24:19.000+0000","fixTime":"2016-09-14T14:24:19.000+0000","outdated":false,"valid":true,"latitude":49.66312,"longitude":11.076982,"altitude":282.4,"speed":1.0,"course":14.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":731,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:08:33.390+0000","deviceTime":"2016-09-14T14:24:21.000+0000","fixTime":"2016-09-14T14:24:21.000+0000","outdated":false,"valid":true,"latitude":49.663097,"longitude":11.076987,"altitude":285.9,"speed":6.0,"course":198.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":733,"attributes":{"flags":983041,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:09:03.813+0000","deviceTime":"2016-09-14T14:24:42.000+0000","fixTime":"2016-09-14T14:24:42.000+0000","outdated":false,"valid":true,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":"8 Meisenweg, Poxdorf, BY, DE"},{"id":734,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:09:33.582+0000","deviceTime":"2016-09-14T14:25:26.000+0000","fixTime":"2016-09-14T14:25:26.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null},{"id":735,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:10:03.640+0000","deviceTime":"2016-09-14T14:25:56.000+0000","fixTime":"2016-09-14T14:25:56.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null},{"id":736,"attributes":{"flags":983040,"battery":"96","sat":"5","ip":"80.187.81.89"},"deviceId":7,"type":null,"protocol":"minifinder","serverTime":"2016-09-14T14:10:33.487+0000","deviceTime":"2016-09-14T14:26:26.000+0000","fixTime":"2016-09-14T14:26:26.000+0000","outdated":false,"valid":false,"latitude":49.663082,"longitude":11.07694,"altitude":281.1,"speed":1.0,"course":198.0,"address":null}]
		*/


		/* use local timezone */
		// toISOString uses UTC, not local time
		// traccar always expects UTC

		var from_obj = new Date(from_unixtime);
		var from_string = from_obj.toISOString();

		var to_obj = new Date(to_unixtime);
		var to_string = to_obj.toISOString();

		var url = this.server.toLowerCase() + ":" + this.REST_port + "/api/positions?deviceId=" + tracker.server_deviceId + "&from=" + from_string + "&to=" + to_string;

		var onerror = onerror || this.error;

		var tracker_id = tracker.id.toString();

		if (Tracking["active_trackers"][tracker_id].waiting_for_positions == false || force == true){
			
			console.log("[TraccarInterface] " + url);
				
			Tracking["active_trackers"][tracker_id].waiting_for_positions = true;

			ajax.send({

				url : url,
				method : "GET",
				headers : TraccarInterface.headers(),
				dataType : "json",
				success : function(response, status){
					//{"id":8,"name":"test","uniqueId":"test","status":null,"lastUpdate":null,"positionId":0,"groupId":0,"motion":null,"geofenceIds":null}
					onsuccess(response);
				},
				error : function(e){
					console.log("[TraccarInterface] Error " + e);
					onerror();
				},
				complete : function(){
					if (Tracking.active_trackers.hasOwnProperty(tracker_id)){
						Tracking["active_trackers"][tracker_id].waiting_for_positions = false;
					}
				}
			});
		}
		else {
			console.log('[TraccarInterface] skipping query, already waiting for answer');
		}

	},
	
	get_all_devices : function(onsuccess, onerror){
		var url = this.server + ":" + this.REST_port + "/api/devices";

		ajax.send(
			{
				url : url,
				method : "GET",
				headers : TraccarInterface.headers(),
				dataType : "json",
				success : onsuccess,
				error : onerror
			}
		);

	},

	register_device : function(imei, name, onsuccess, onerror){

		// case: device is registered, app uninstalled
		// -> we need to check firs if imei is registered, if so fetch the id of that one
		var self = this;

		var imei = imei,
			name = name,
			onsuccess = onsuccess,
			onerror = onerror;

		self.get_all_devices(function(response, status){

			var existing = null;		

			for (var d=0; d<response.length;d++){
				var device = response[d];

				if ("" + device.uniqueId == "" + imei){
					existing = device;
					break;
				}
			}
	
			if (existing == null){
				perform_registration();
			}
			else {
				onsuccess(existing.id);
			}

		}, onerror);


		function perform_registration(){

			var url = self.server + ":" + self.REST_port + "/api/devices";

			var onerror = onerror || self.error;
		
			var post_data = {
				"uniqueId" : imei,
				"name" : name
			};
		
			ajax.send(
				{
					url : url,
					method : "POST",
					headers : TraccarInterface.headers(),
					data : post_data,
					dataType : "json",
					success : function(response, status){
						//{"id":8,"name":"test","uniqueId":"test","status":null,"lastUpdate":null,"positionId":0,"groupId":0,"motion":null,"geofenceIds":null}
						onsuccess(response.id);
					},
					error : onerror
				}
			);
		}

	},
	delete_device : function(device_server_id){
		var url = this.server + ":" + this.REST_port + "/api/devices/" + device_server_id;
		var onerror = onerror || this.error;
		
		ajax.send(
			{
				url : url,
				method : "DELETE",
				headers : TraccarInterface.headers(),
				success : onsuccess,
				error : onerror
			}
		);

	},
	error : function(code, text){
		var msg = "[TraccarInterface ERROR] : " + code + " " + text;
		console.log(msg);
		alert(msg);
	}
};

/*
"Device": {
            "properties": {
                "id": {
                    "type": "integer"
                },
                "name": {
                    "type": "string"
                },
                "uniqueId": {
                    "type": "string"
                },
                "status": {
                    "type": "string"
                },
                "lastUpdate": {
                    "type": "string"
                },
                "positionId": {
                    "type": "integer"
                },
                "groupId": {
                    "type": "integer"
                },
                "geofenceIds": {},
                "attributes": {}
            }
        },
*/
