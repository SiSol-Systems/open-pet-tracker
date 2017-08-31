"use strict";

/*
* mango apps are javascript only
* like in django, a Request object is passed to the view
*/


var default_renderer = {
	render : function(template_name, context, callback){

		ajax.GET(template_name + "?_=" + new Date().getTime(), {}, function(template){
			var template_html = Handlebars.compile( template )(context);
			callback(template_html);
		});

	}
};

var View = extend;

/* args is a list[], kwargs is a dic{} */
var TemplateView = {

	is_view : true,
	identifier: null,

	template_name : null, // this has to be defined in the View "subclass" using extend

	save_state_on_exit : true,

	get_context_data : function(self, kwargs){
		var kwargs = kwargs || {};
		return kwargs;
	},

	render_to_response : function(self, context){

		default_renderer.render(self.template_name, context, function(template_html){
			// insert the html using the pagemanager
			// pass initial_kwargs and not self.kwargs
			// event and several other objects are appended to kwargs
			Pagemanager.go(self.identifier, template_html, self.args, self.initial_kwargs, self.save_state_on_exit);
			self.post_render(self, self.args, self.initial_kwargs);
		});
	},

	// dispatch is the place where Object.create(this) is called
	// if a "subclass" overrides dispatch it has to use Object.create(this)
	dispatch : function(self, request, args, kwargs){

		if (typeof self == "undefined" || self == null){
			var self = Object.create(this);
		}

		self.request = request;
		self.args = args;
		self.kwargs = kwargs;

		// prevent modification of kwargs passed from an to history
		self.initial_kwargs = clone(kwargs);

		if (request.method == "GET"){
			self.get(self, request, args, kwargs);
		}
		else if (request.method == "POST"){
			self.post(self, request, args, kwargs);
		}
		else {
			console.log("[View] method not allowed: " + request.method);
		}

	},

	get : function(self, request, args, kwargs){
		var context = self.get_context_data(self, kwargs);
		self.render_to_response(self, context);		
	},

	post : function(self, request, args, kwargs){
		alert('post not implemented yet')
	},
	// only called after render_to_response is called, not called if loaded from history
	post_render : function(self, args, kwargs){
	},
	// always called after a page has been rendered, also after loaded from history
	// called in Pagemanager._post_insert
	post_finished : function(args, kwargs){
	}

};

function _get_return_function(fn){
	if (fn.indexOf(".") > 0){
		var fn_parts = fn.split(".");
		return window[fn_parts[0]][fn_parts[1]];
	}
	else {
		return window[fn];
	}
}

function HttpResponseRedirect(view_name, args, kwargs){

	var request = Request.create("GET");
	var kwargs = kwargs || {};
	var args = args || [];

	var fn = _get_return_function(view_name);
	fn.dispatch(null, request, args, kwargs);
}

// receives GET_parameters as ?param1=1&param2=2 and POST_paramters as {}
var Request = {
	create : function(method, GET_parameters, POST_parameters){
		self = Object.create(this);

		var GET_parameters_dict = {};

		var POST_parameters = POST_parameters || {};

		if (GET_parameters != null && typeof GET_parameters != "undefined"){
			GET_parameters_dict = http.deserialize(GET_parameters);
		}

		self.method = method;
		self["GET"] = GET_parameters_dict;
		self["POST"] = POST_parameters;

		return self;
	}
}

// deserialize converts ?param1=1&param2=2 to {"param1" : 1,...}
// or form element to {} for use with mango form validation
// this collects the values of fields with the same name as a list

var http = {

	deserialize_form : function(form_element){

		var data = {};

		var inputs = form_element.querySelectorAll("input, select, textarea");

		for (var i=0;i<inputs.length; i++){
			var input = inputs[i];

			if (input.getAttribute("type") == "checkbox" && input.checked == false){
				continue;
			}

			var input_name = input.getAttribute("name");

			if (input.value.length > 0){
				if (data.hasOwnProperty(input_name)){
					if (data[input_name] instanceof Array == false){
						data[input_name] = [data[input_name]];
					}
					data[input_name].push(input.value);
				}
				else {
					data[input_name] = input.value;
				}
			}			

		}

		return data;

	},

	deserialize : function(urlparameters){

		var parameters = {};

		var pairs = urlparameters.split("&");
		var result = {};

		for (var p=0; p<pairs.length;p++){
		
			var pair = pairs[p].split("=");
			var name = pair[0]
			var value = pair[1]
			if( name.length )
			    if (parameters[name] !== undefined) {
			        if (!parameters[name].push) {
			            parameters[name] = [parameters[name]];
			        }
			        parameters[name].push(value || '');
			    } else {
			        parameters[name] = value || '';
			}
		};

		return parameters;
	}
}

/*
	Pagemanager
	- inserts rendered pages into html
	- takes care of history mangement
*/
var Pagemanager = {

	container : document.body,
	ajaxify_container : document.body,
	current_page_id : null,
	current_view_identifier : null,
	current_kwargs : {},
	current_args : [],

	save_state_on_exit : true,

	swipe_active : false,

	init : function(config){

		var self = this;

		// fall back to native history if History is not present
		if (!("History" in window)){
			window.History = window.history;
		}

		//*** history ***
		window.addEventListener("popstate", self._load_from_history);

		var config = config || {};

		for (var key in config){
			self[key] = config[key];
		}

		self._ajaxify(self.ajaxify_container);
		
	},

	_load_from_history : function(event){
		// assign self from event
		var self = Pagemanager;

		var page_id = event.state.page_id;
		console.log("[Pagemanager] back to " + page_id);

		//self.container.textContent = "";
		var template_html = event.state.template_html;
		var view_identifier = event.state.view_identifier;
		var args = event.state.args;
		var kwargs = event.state.kwargs;

		var view_fn_name = view_identifier.split('-')[0];
		self.save_state_on_exit = window[view_fn_name].save_state_on_exit;

		self._insert(self.container, template_html, args, kwargs);
		self._post_insert(view_identifier, args, kwargs);

		self._on_new_page(page_id, args, kwargs);
    	
    	self._update_self(page_id, view_identifier, args, kwargs);
	    	
		self._animations.fadein();

    	window.scrollTo(0,0);
	},

	_on_new_page : function(page_id, args, kwargs){
		// override this to trigger a function on every new page inser, like changing the header
	},

	_animations : {
		fadein : function(){
			var page = document.getElementsByClassName("page");

			if (page.length > 0) {
				window.getComputedStyle(page[0]).opacity;
			    page[0].classList.add('faded-in');
			}
		}
	},

	_update_state : function(){

		// htmlize inputs so they dont get lost
		var inputs = this.container.querySelectorAll("input, select, textarea");
	
		for (var i=0; i<inputs.length; i++){
			var element = inputs[i];
		
			if (element.tagName == "TEXTAREA"){
				element.textContent = element.value;
			}
			else if (element.tagName == "INPUT"){
				var type = element.getAttribute("type").toLowerCase();
				if (type == "text"){
					element.setAttribute("value", element.value);
				}
				else if (type == "radio" || type == "checkbox"){
					if (element.checked){
						element.setAttribute("checked", "checked");
					}
					else {
						element.removeAttribute("checked");
					}
				}
			}
			else if (element.tagName == "SELECT"){
				var options = element.getElementsByTagName("option");
			
				for (var o=0;o<options.length;o++){
					var opt = options[o];
					if (opt.getAttribute("value") == element.value){
						opt.setAttribute("selected","selected");
					}
					else {
						opt.removeAttribute("selected");
					}
				}
			}
		}

		var state = this._create_state(this.current_page_id, this.container.innerHTML, this.current_view_identifier, this.current_args, this.current_kwargs);		
		History.replaceState(state, this.current_page_id, this.current_page_id);
	},

	_get_element_args : function(element){
		var args = [];
		if (element.hasAttribute("args")){
			var args = element.getAttribute("args");
			args = JSON.parse(args);
		}
		return args;
	},
	_get_element_kwargs : function(element){
		var kwargs = {};
		if (element.hasAttribute("kwargs")){
			var kwargs = element.getAttribute("kwargs");
			kwargs = JSON.parse(kwargs);
		}
		return kwargs;
	},

	_get_GET_parameters : function(url){
		var parts = url.split("?");
		var fn = parts[0];

		var GET_parameters = null;

		if (parts.length > 1){
			GET_parameters = parts[1];
		}

		return GET_parameters;
	},

	_get_view_name_from_url : function(url){
		var parts = url.split("?");
		var fn = parts[0];
		return fn;
	},
	
	_perform_GET_request : function(event, current_target){
		
		// this is currently unsupported by hammer.js
		//var current_target = event.srcEvent.currentTarget;

		// this does not work
		//var fn_attribute = current_target.tagName.toLowerCase() == "a" ? "href" : "action";

		var fn_attribute = "action";
		
		var args = this._get_element_args(current_target);
		var kwargs = this._get_element_kwargs(current_target);

		kwargs["event"] = event;
		// fix hammer.js missing currentTarget
		kwargs["currentTarget"] = current_target;
		
		var url = current_target.getAttribute(fn_attribute);
		var GET_parameters = this._get_GET_parameters(url);

		// construct the request and pass it to the view function
		var request = Request.create("GET", GET_parameters);

		var fn = this._get_view_name_from_url(url);
		var return_fn = _get_return_function(fn);

		if (return_fn.is_view == true){
			return_fn.dispatch(null, request, args, kwargs);
		}
		else {
			return_fn(null, request, args, kwargs);
		}	
	},

	_perform_POST_request : function(event, current_target){
		
		var args = this._get_element_args(current_target);
		var kwargs = this._get_element_kwargs(current_target);

		kwargs["event"] = event;
		// fix hammer.js missing currentTarget
		kwargs["currentTarget"] = current_target;
		
		var url = current_target.getAttribute("action");
		var GET_parameters = this._get_GET_parameters(url);
		var POST_parameters = http.deserialize_form(current_target);

		// construct the request and pass it to the view function
		var request = Request.create("POST", GET_parameters, POST_parameters);

		var fn = this._get_view_name_from_url(url);
		var return_fn = _get_return_function(fn);
		
		if (return_fn.is_view == true){
			return_fn.dispatch(null, request, args, kwargs);
		}
		else {
			return_fn(null, request, args, kwargs);
		}

	},

	_input_worker : function(event, input_type){
		var self = this;

		var element = event.target;
		var counter = 4;

		while (counter > 0){

			if (element.id == "app"){
				counter = 0;
				break;
			}

			if (element.classList.contains(input_type)){
				counter = 0;
				self._perform_GET_request(event, element);

			}
			else {
				counter--;
				element = element.parentElement;
			}
		}
	},
	
	_add_tap_listener : function(element){

		var self = this;

		var hammertime = new Hammer(document.getElementById("app"), {});
		hammertime.on("tap", function(event) {
			self._input_worker(event, "tap");			
		});

	},

	_add_tap_highlightings : function(container){
		var self = this;

		var elements = container.getElementsByClassName("tap");
		
		for (var e=0; e<elements.length;e++){
			self._add_tap_highlighting(elements[e]);
		}
		
	},

	_add_tap_highlighting : function(element){
		var self = this;

		element.addEventListener("touchstart", function(event){
			self.swipe_active = false;

			setTimeout(function(){
				if (self.swipe_active == false){
					event.target.style.opacity = 0.5;
				}
			}, 10);
		});

		element.addEventListener("touchend", function(event){
			setTimeout(function(){
				event.target.style.opacity = 1;
			}, 10);
			self.swipe_active = false;
		});

		element.addEventListener("touchmove", function(event){
			if(self.swipe_active == false){
				self.swipe_active = true;
				event.target.style.opacity = 1;
			}
		});

	},

	_add_swipeleft_listener : function(element){

		var self = this;

		var hammertime = new Hammer(element, {});
		hammertime.on("swipeleft", function(event){
			self._perform_GET_request(event, element); 
		});

	},

	_add_preventDefault_listener : function(element){

		var self = this;

		element.addEventListener("touchend", function(event){
			event.preventDefault();
			event.stopPropagation();
		});

		element.addEventListener("touchmove", function(event){
			event.preventDefault();
			event.stopPropagation();
		});

	},


	_add_swiperight_listener : function(element){

		var self = this;

		var hammertime = new Hammer(element, {});
		hammertime.on("swiperight", function(event){
			self._perform_GET_request(event, element); 
		});

	},

	_add_form_submit_listener : function(form){

		var self = this;

		// reads form field values into request.POST
		form.addEventListener("submit", function(event){
			event.preventDefault();
			
			self._perform_POST_request(event, event.currentTarget);
			
		}, false);
	},

	_add_onchange_listener : function(element){

		var self = this;
		
		element.addEventListener("change", function(event){
			self._perform_GET_request(event, element); 
		});
	},

	_add_onkeyup_listener : function(element){

		var self = this;

		element.addEventListener("keyup", function(event){
			self._perform_GET_request(event, element);
		});
	},

	_activate_forms : function(container){
		var self = this;
		
		var forms = container.getElementsByTagName("form");
		
		for (var f=0; f<forms.length; f++){
			var form = forms[f];
			self._add_form_submit_listener(form);
		}

		// enable form scrolling
		var inputs = container.querySelectorAll("input:not([type='checkbox']), textarea");
		for (var z=0; z<inputs.length; z++){
			var input = inputs[z];
			input.addEventListener("click", function(){
				console.log('scrolling to input');
				var rect = this.getBoundingClientRect();
				var topOffset = rect.top - ( app.containerHeight * 0.2);
				if (topOffset > window.pageYOffset){
					window.scrollTo(0, Math.floor(topOffset));
				}
				this.focus();
				this.select();
			});
		}
	},

	_ajaxify : function(container){

		var self = this;
		
		self._add_tap_listener(container);
		self._activate_gesture_listeners(container);
	},

	// currently each element with gesture gets its own hammer instance, this might not be ideal
	_activate_gesture_listeners : function(container){
		var self = this;

		// attach known listeners
		var known_gestures = ["swipeleft", "swiperight", "onchange", "onkeyup", "preventDefault"];


		for (var li=0; li<known_gestures.length; li++){

			var gesture = known_gestures[li];
			var elements = container.getElementsByClassName(gesture);
			
			for (var e=0; e<elements.length;e++){
				self["_add_" + gesture + "_listener"](elements[e]);
			}
		}
	},

	// inserting html
	_insert : function(container, template_html, args, kwargs){
		var self = this;
		container.innerHTML = template_html;
		self._add_tap_highlightings(container);
		self._activate_forms(container);
	},

	_post_insert : function(view_identifier, args, kwargs){
		if (typeof(view_identifier) != "undefined" && view_identifier != null){
			var view_name = view_identifier.split('-')[0];
			if (view_name in window){
				window[view_name].post_finished(args, kwargs);
			}
		}
	},

	_update_self : function(page_id, view_identifier, args, kwargs){
		this.current_page_id = page_id;
		this.current_view_identifier = view_identifier;
		this.current_args = args;
		this.current_kwargs = kwargs;
	},

	// the history only covers self.container
	// a callback function
	_create_state : function(page_id, template_html, view_identifier, args, kwargs){

		if (typeof page_id === "undefined" || typeof template_html === "undefined" || typeof view_identifier === "undefined" || typeof args === "undefined" || typeof kwargs === "undefined"){
			alert("error creating history state");
		}

		var state = {
			"page_id" : page_id,
			"template_html": template_html,
			"view_identifier": view_identifier,
			"args":args,
			"kwargs" : kwargs
		};

		return state;

	},
	_add_to_history : function(page_id, view_identifier, template_html, args, kwargs){

		// prevent cloning errors
		var kwargs = JSON.parse(JSON.stringify(kwargs));

		var state = this._create_state(page_id, template_html, view_identifier, args, kwargs);
	    //console.log(JSON.stringify(state));

		// make the firstly rendered view the starting point of the history
		// and do not add to history if the page is the same - e.g. when submitting forms
		if (this.current_page_id == null || this.current_page_id == page_id){
			History.replaceState(state, page_id, page_id);
		}		
		else {
			History.pushState(state, page_id, page_id);
		}

		this._update_self(page_id, view_identifier, args, kwargs);

	},

	// history-aware
	go : function(view_identifier, template_html, args, kwargs, save_state_on_exit){

		var self = this;

		// dump current state of the page to history
		var pages = document.getElementsByClassName("page");
		if (pages.length){
			pages[0].classList.remove('faded-in');
		}

		if (self.save_state_on_exit == true){
			self._update_state();
		}

		self.save_state_on_exit = save_state_on_exit;

		var args = args || [];
		var kwargs = kwargs || {};

		var target_element = self.container;
	
		if ("target_id" in kwargs){
			target_element = document.getElementById(kwargs.target_id);
		}
		
		var page_id = "#" + view_identifier;
		self._add_to_history(page_id, view_identifier, template_html, args, kwargs);

		self._insert(target_element, template_html, args, kwargs);
		self._post_insert(view_identifier, args, kwargs);

		self._animations.fadein();

		self._on_new_page(page_id, args, kwargs);

	}

}
