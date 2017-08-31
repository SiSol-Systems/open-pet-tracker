// material design appbar
var Appbar = {

	init : function(container_id){
		this.container = document.getElementById(container_id);
	},

	current_header : null,

	container : null,

	load : function(page_id, args, kwargs){

		var self = this;

		var page = page_id.split("-")[0];

		if (app.theme.header_templates.hasOwnProperty(page)){
			var template_url = app.theme.header_templates[page];
		}
		else {
			var template_url = app.theme.header_templates["default"];
		}

		if (this.current_header != template_url || page == "#IdentificationKeyView"){
			console.log("loading new appbar for " + page);

			this.current_header = template_url;

			ajax.GET(template_url, {}, function(template){
				var template_html = Handlebars.compile(template)(kwargs);
				self.container.innerHTML = template_html;
			});

		}		

	}
}
