var app = {

	start_time : new Date().getTime(),

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
		// give some devices time to hide the keyboard after entering the url
        if (device.platform == "browser"){
			setTimeout(function(){
				upstart.run(app.onAppReady);
			}, 50);
		}
		else {
			upstart.run(app.onAppReady);
		}
    },
	onAppReady : function(){

		HttpResponseRedirect("Home");

		AppGeolocation.start_watching({}, app.geolocationSuccess, app.geolocationError);
	
	},
	geolocationSuccess : function(position){
		/* geolocation successfully retrieved for the device running this app, not the tracker */
		var map = document.getElementById("TrackingMap");
		if (map != null){

			if (TrackingMap.has_been_centered == false){
				TrackingMap.center(position);
			}

			TrackingMap.update_device_marker(position);
		}
	},
	geolocationError : function(positionError){
		/* geolocation error for the device running this app, not the tracker */
	}
};

app.initialize();
