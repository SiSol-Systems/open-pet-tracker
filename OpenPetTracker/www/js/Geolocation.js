/* get new pos all 5 mins and manage displays */
/* fire events when new positions are fetched */
var AppGeolocation = {

	watch_id : null,

	last_position : null,
	last_error : null,

	default_options : {
		"enableHighAccuracy" : true,
		"timeout" : 1 * 60 * 1000,
		"maximumAge" : 0
	},

	start_watching : function(options, onSuccess, onError){
		var self = this;

		self.on_success = onSuccess;
		self.on_error = onError;


		if (self.watch_id != null){
			self.stop_watching();
		}
		
		var options = options || {};

		if (!options.hasOwnProperty("enableHighAccuracy")){
			options["enableHighAccuracy"] = self.default_options["enableHighAccruacy"]; 
		}

		if (!options.hasOwnProperty("timeout")){
			options["timeout"] = self.default_options["timeout"]; 
		}

		if (!options.hasOwnProperty("maximumAge")){
			options["maximumAge"] = self.default_options["maximumAge"]; 
		}

		self.watch_id = navigator.geolocation.watchPosition(self._on_success, self._on_error, options);

	},

	stop_watching : function(){
		var self = this;
		if (self.watch_id != null){
			navigator.geolocation.clearWatch(self.watch_id);
		}
	},

	_on_success	: function(position){
		var self = AppGeolocation;
		console.log("[AppGeolocation] position success");
		self.last_position = position;
		self.last_error = null;

		if (typeof self.on_success == "function"){
			self.on_success(position);
		}
	},

	_on_error : function(positionError){
		var self = AppGeolocation;
		self.last_error = positionError;
		self.last_position = null;

		if (typeof self.on_error == "function"){
			self.on_error(positionError);
		}
	}

};
