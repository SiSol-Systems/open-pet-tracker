"use strict";
var FormView = extend(TemplateView, [{

	success_url : null,
	form_class : null,
	prefix : null,

	get_prefix : function(self){
        //"""Return the prefix to use for forms."""
		return self.prefix;
	},

	get_initial : function(self){
		return {};
	},

	get_form_class : function(self){
		return self.form_class;
	},

	get_form : function(self, form_class){

		//"""Return an instance of the form to be used in this view."""

		var form_class = form_class || self.get_form_class(self);

		var form_kwargs = self.get_form_kwargs(self);

		return form_class.create(form_kwargs);

	},

	get_form_kwargs : function(self){

		//"""Return the keyword arguments for instantiating the form."""

		var kwargs = {
            'initial': self.get_initial(self),
            'prefix': self.get_prefix(self),
        };

        if (['POST', 'PUT'].indexOf(self.request.method) >= 0 ){
            kwargs['data'] = self.request.POST;
            kwargs['files'] = self.request.FILES;
		}

		return kwargs;
	},

	get_success_url : function(self){
        //"""Return the URL to redirect to after processing a valid form."""
        if (! self.hasOwnProperty(success_url) || self.success_url === null){
            alert("No URL to redirect to. Provide a success_url.")
		}
		return self.success_url
	},

	form_valid : function(self, form){
        //"""If the form is valid, redirect to the supplied URL."""
        return HttpResponseRedirect(self.get_success_url(self))
	},

    form_invalid : function(self, form){
        //"""If the form is invalid, render the invalid form."""
        self.render_to_response(self, self.get_context_data(self, {"form":form}))
	},

    get_context_data : function(self, kwargs){

        //"""Insert the form into the context dict."""
        if (!kwargs.hasOwnProperty("form")){
            kwargs["form"] = self.get_form(self);
		}

		return self.super(FormView).get_context_data(self, kwargs)
	},

	post : function(self, request, args, kwargs){
        /*"""
        Handle POST requests: instantiate a form instance with the passed
        POST variables and then check if it's valid.
        """*/

        var form = self.get_form(self);

        if (form.is_valid(form) == true){
            return self.form_valid(self, form);
		}
        else {
			return self.form_invalid(self, form);
		}
	}

}]);
