var Home = View(TemplateView, [{
	"identifier" : "Home",
	save_state_on_exit : false,
	template_name : "themes/" + settings.THEME + "/templates/home.html",
	get_context_data : function(self, kwargs){
		var context = self.super().get_context_data(kwargs);
		return context;
	},

	post_finished : function(args, kwargs){
		var self = this;
		
		TrackingMap.load_map();

		// load position of app-phone from cache
		if (TrackingMap.has_been_centered == false && AppGeolocation.last_position != null){
			TrackingMap.center(AppGeolocation.last_position);
			TrackingMap.update_device_marker(AppGeolocation.last_position);
		}

		// go to traccar server setup
		var traccar_server = app.storage.getItem("TraccarServer");

		if (traccar_server == null){
			HttpResponseRedirect("ManageTraccarServer");
		}
		else {
			// look for trackers
			Tracker.objects.all(function(trackers){
				if (trackers.length == 0){
					HttpResponseRedirect("ManageTracker");
				}
			});
		}

	}
}]);

var GeolocationReport = View(TemplateView, [{
	"identifier" : "GeolocationReport",
	"template_name" : "themes/" + settings.THEME + "/templates/geolocation_report.html",

	get_context_data(self, kwargs){
		var context = self.super().get_context_data(self, kwargs);
		context["app_geolocation"] = AppGeolocation;
		context["app_requires_geolocation"] = app.requires_geolocation;
		return context;
	},

	post_finished : function(args, kwargs){
		
		var self = this;
		
		var layerSources = {

			"osm": L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
				{
					attribution: '&copy; OpenStreetMap, Tiles courtesy of Humanitarian OpenStreetMap Team',
					subdomains: 'ab'
				})

		};

		var coords = [0,0];

		if (AppGeolocation.last_position != null){
			coords[0] = AppGeolocation.last_position.coords.latitude;
			coords[1] = AppGeolocation.last_position.coords.longitude;
		}

		var Map = L.map("geolocationMap", {
			center: coords,
			zoom: 10,
			scrollWheelZoom: false,
			layers: [
				  	layerSources["osm"]
			]
		});
		
		// add a temporary success listener to the AppGeolocation Event that is cancelled on pagechange	

	}

}]);

var About = View(TemplateView, [{
	"identifier" : "About",
	"template_name" : "themes/" + settings.THEME + "/templates/about.html"
}]);

var ManageTraccarServer = View(FormView, [{
	"identifier" : "ManageTraccarServer",
	"template_name" : "themes/" + settings.THEME + "/templates/manage_traccar.html",
	"form_class" : ManageTraccarServerForm,
	get_initial : function(self){
		var initial = self.super().get_initial(self);
		initial["server"] = app.storage.getItem("TraccarServer");
		initial["port"] = app.storage.getItem("TraccarServerPort");
		initial["username"] = app.storage.getItem("TraccarServerUsername");
		initial["password"] = app.storage.getItem("TraccarServerPassword");
		return initial;
	},
	form_valid : function(self, form){
		// save server data and return to home
		app.storage.setItem("TraccarServer", form.cleaned_data["server"]);
		app.storage.setItem("TraccarServerPort", form.cleaned_data["port"]);
		app.storage.setItem("TraccarServerUsername", form.cleaned_data["username"]);
		app.storage.setItem("TraccarServerPassword", form.cleaned_data["password"]);

		upstart.load_traccar_settings();

		HttpResponseRedirect("Home");
	}
}]);


var ManageTracker = View(FormView, [{
	"identifier" : "ManageTracker",
	"template_name" : "themes/" + settings.THEME + "/templates/manage_tracker.html",
	"form_class" : ManageTrackerForm,

	dispatch : function(self, request, args, kwargs){

		var self = Object.create(this);

		self.tracker = null;

		if (kwargs.hasOwnProperty("tracker_id")){
			Tracker.objects.get({"pk":kwargs["tracker_id"]}, function(tracker){
				self.tracker = tracker;
				self.super().dispatch(self, request, args, kwargs);
			});
		}
		else {
			self.super().dispatch(self, request, args, kwargs);
		}
	},

	get_form_kwargs : function(self){
		var kwargs = self.super().get_form_kwargs(self);
		if (self.tracker != null){
			kwargs["instance"] = self.tracker;
		}
		return kwargs;
	},

	form_valid : function(self, form){

		var tracker = form.save(form, function(tracker){

			// ask if the tracker has to be configured (SMS)

			upstart.load_sidemenu(function(){
				HttpResponseRedirect("Home");
			});
		});

	}
}]);


var CenterMap = function(self, request, args, kwargs){

	if (Tracking.last_LatLng != null) {
		TrackingMap.map.panTo(Tracking.last_LatLng);
	}
	else if (TrackingMap.device_marker != null){
		TrackingMap.map.panTo(TrackingMap.device_marker.getLatLng());
	}
	else {
		alert(_('No GPS position yet'));
	}
};

function load_history(self, request, args, kwargs){

	// go 15 minutes back from app start	
	app.start_time = app.start_time - 15 * 60 * 1000;

	var timespan = Math.floor((new Date().getTime() - app.start_time) / (1000 * 60));	

	document.getElementById("history_minutes").textContent = timespan;

	for (var tracker_id in Tracking.active_trackers){

		var tracker = Tracking.active_trackers[tracker_id].tracker;

		if (tracker.is_active == true){

			var now = new Date().getTime() + 5 * 60 * 1000;


			TraccarInterface.get_positions_in_timeframe(tracker, app.start_time, now, function(positionlist){
				console.log('[TRACKING HISTORY TIMEWARP] found ' + positionlist.length + ' positions in history');
				TrackingMap.redraw_on_map(tracker, positionlist);
			}, function(){
				console.log('[TRACKING HISTORY TIMEWARP] error fetching positions');
			}, true);

		}
	}
}

function activate_tracker(self, request, args, kwargs){

	var checked = kwargs.event.currentTarget.checked,
		tracker_id = kwargs["tracker_id"];

	Tracker.objects.get({"pk":tracker_id}, function(tracker){

		if (checked == true){
			tracker.is_active = true;
			tracker.save(tracker);
			Tracking.add_tracker(tracker);
			
		}
		else {
			tracker.is_active = false;
			Tracking.remove_tracker(tracker);
			tracker.save(tracker);
		}

	});
}
