"use strict";

var upstart = {

	run : function(upstart_finished){

		var self = this;

		console.log("[UPSTART] running on " + device.platform);

		if (device.platform == 'Android') {
			document.addEventListener("backbutton", hardwareBackbuttonListener);
		}

		if (device.platform == "browser"){
			// only use the History replacement in true apps
			// we cant hijack the back button in browser like we can in true apps
			// therefore, the webapp has not an ideal history management
			window.History = window.history;
			// the storage is used to store the authtoken
			// on the webapp this may not be permanent
			app.storage = window.sessionStorage;
		}
		else {
			app.storage = window.localStorage;
		}

		self._init_screen(function(){

			console.log("[UPSTART] screen initialized");

			self.load_traccar_settings();

			self._load_language(function(){

				self._load_handlebars_helpers();

				self._render_skeleton(function(){

					self._load_mango(function(){

						self.load_sidemenu(function(){

							self._init_leaflet();

							ModalDialog.__init__();

							self._load_active_trackers();

							upstart_finished();
						});
					});

				});	

			});		

		});


	},

	_load_language : function(callback){
		app.language = "en";
		callback();
	},

	_load_user : function(){
		var active_user_id = app.storage.getItem("active-user-id");
		if(active_user_id != null){
			// load the user plus token
			// if a token is present, the user is authenticated
			app.load_user(active_user_id);
		}
	},

	_load_mango : function(callback){

		mango.init();

		mango.syncdb(function(){
			Pagemanager.init({
				"ajaxify_container" : document.getElementById("app"),
				"container" : document.getElementById("content"),
				"_on_new_page" : function(page_id, args, kwargs){
					// load the App bar
				
					Appbar.load(page_id, args, kwargs);
					// check if a custom callback function is in kwargs

					hidemenu();
				}
			});

			callback();

		});

	},

	_render_skeleton : function (callback){

		// we need the t helper in the skeleton
		mango.init_i18n();

		// load the skeleton template, contains also the sidemenu

		var context = {};

		ajax.GET("themes/" + settings["THEME"] + "/templates/skeleton.html", {}, function(template){
			var skeleton = Handlebars.compile( template )(context);
			document.getElementById("app").innerHTML = skeleton;
		
			Appbar.init("appbar-container");			

			callback();
			
		
		});
	},

	load_sidemenu : function(callback){

		ajax.GET("themes/" + settings["THEME"] + "/templates/sidemenu.html", {}, function(template){

			Tracker.objects.all(function(trackers){
				console.log("[UPSTART] found " + trackers.length + " trackers");
				
				var context = {
					"trackers" : trackers
				};

				var template_html = Handlebars.compile( template )(context);

				var container = document.getElementById("sidemenubody");
				Pagemanager._insert(container, template_html, [], {});
				Pagemanager._activate_gesture_listeners(container);
			
				callback();
			});
		});
	},

	_load_handlebars_helpers : function() {

		Handlebars.registerHelper("themeFolder", function () {
		    return "themes/" + settings.THEME + "/";
		});		

	},

	_init_screen : function(callback){

		// load the theme
		ajax.getJSON("themes/" + settings.THEME + "/config.json", {}, function(theme_config){
			app.theme = theme_config;
		});

		var link = document.createElement("link");
		link.setAttribute("rel", "stylesheet");
		link.setAttribute("type","text/css");

		function loadAppCSS(){
			// <link rel="stylesheet" type="text/css" href="css/index.css">
			link.setAttribute("id", "app-css");
			link.setAttribute("href", "themes/" + settings.THEME + "/app/css/index.css");

			document.head.appendChild(link);

			var anyscreen_css = ["themes/" + settings.THEME + "/app/css/material-anyscreen.css", "leaflet/leaflet-anyscreen.css"];
			anyscreen(anyscreen_css, callback);
		}

		// load css files according to device
		if (device.platform == "browser"){
			app.md = new MobileDetect(window.navigator.userAgent);
			if (app.md.mobile() != null){
				loadAppCSS();
			}
			else {
				link.setAttribute("id", "desktop-css");
				link.setAttribute("href", "themes/" + settings.THEME  + "/desktop/css/index.css");
				document.head.appendChild(link);
				callback();
			}
		}
		else {
			loadAppCSS();
		}		
		
	},

	_init_leaflet : function(){
		initleaflet(window, document);
	},

	load_traccar_settings : function(){
		TraccarInterface.server = app.storage.getItem("TraccarServer");
		TraccarInterface.REST_port = app.storage.getItem("TraccarServerPort");
		TraccarInterface.auth_name = app.storage.getItem("TraccarServerUsername");
		TraccarInterface.auth_password = app.storage.getItem("TraccarServerPassword");
	},

	_load_active_trackers : function(){
		Tracker.objects.filter({"is_active":1}).fetch(function(trackers){
			console.log("[UPSTART] found " + trackers.length + " active trackers");
			for (var t=0; t<trackers.length; t++){
				Tracking.add_tracker(trackers[t]);
			}
		});
	}

}
