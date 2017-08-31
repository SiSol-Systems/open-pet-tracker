"use strict";

var Widget = {

	is_hidden : false,
	required : true,
	template_name : null,
	
	// forms.CharField(widget=forms.TextInput) and forms.CharField(widget=forms.TextInput(something)) both have to work
	is_created : false,

	create : function(args, kwargs){
		var self = Object.create(this);

		// attrs can be passed in kwargs
		self.attrs = {};

		var args = args || [];
		var kwargs = kwargs || {};

		for (var key in kwargs){
			if (self.hasOwnProperty.call(kwargs, key) || typeof self[key] === "undefined") {
				self[key] = kwargs[key];
			}		
		}

		self.is_created = true;

		return self;
	},

	format_value : function(self, value){
		if (typeof value != "string"){
			if (typeof value == "undefined" || value == null){
				value = '';
			}
			else {
				value = value.toString();
			}
		}
		return value;
	},

	get_context : function(self, name, value, attrs, field){

        var context = {
            'name': name,
            'is_hidden': self.is_hidden,
            'required': self.is_required,
            'value': self.format_value(self, value),
            'attrs': self.build_attrs(self, self.attrs, attrs),
            'template_name': self.template_name,
        };
		return context;
	},

	render : function(self, name, value, attrs, renderer, field){
		var attrs = attrs || {};
		var renderer = renderer || null;
        //"""Render the widget as an HTML string."""
        var context = self.get_context(self, name, value, attrs, field);
        return self._render(self, self.template_name, context, renderer);
	},

    _render : function(self, template_name, context, renderer){

		var renderer = renderer || null;

		// create flatatts
		context["flatattrs"] = flatatt(context["attrs"]);

        if (renderer === null){
            var template_html = Handlebars.compile(self.template)(context);
			return template_html
		}
		else {
			return default_renderer.render(template_name, context);
		}
	},

	build_attrs : function(self, base_attrs, extra_attrs){
        //"""Build an attribute dictionary."""
		var attrs = {};

		for (var key in base_attrs){
			attrs[key] = base_attrs[key];
		}
		
		if (typeof extra_attrs == "object"){
        	for (var key in extra_attrs){
				attrs[key] = extra_attrs[key];
			}
		}
		return attrs;
	},


	value_from_datadict : function(self, data, files, name){
        /*"""
        Given a dictionary of data and this widget's name, return the value
        of this widget or None if it's not provided.
        """*/
		if (data.hasOwnProperty(name)){
			return data[name];
		}
		return null;
	},

	id_for_label : function(self, id_){
        /*"""
        Return the HTML ID attribute of this Widget for use by a <label>,
        given the ID of the field. Return None if no ID is available.
        This hook is necessary because some widgets have multiple HTML
        elements and, thus, multiple IDs. In that case, this method should
        return an ID value that corresponds to the first ID in the widget's
        tags.
        """*/
		return id_;
	}
};

forms.TextInput = extend(Widget, [{
	"identifier" : "TextInput",
	"template" : '<input type="text" {{{ flatattrs }}} name="{{ name }}" {{#if value}}value="{{ value }}"{{/if}} />'
}]);

forms.HiddenInput = extend(Widget, [{
	"identifier" : "HiddenInput",
	"is_hidden" : true,
	"template" : '<input type="hidden" {{{ flatattrs }}} name="{{ name }}" {{#if value}}value="{{ value }}"{{/if}} />'
}]);

forms.CheckboxInput = extend(Widget, [{
	"identifier" : "CheckboxInput",
	"template" : '<input type="checkbox" {{{ flatattrs }}} name="{{ name }}" {{#if value}}checked{{/if}} />'
}]);

forms.Textarea = extend(Widget, [{
	"identifier" : "Textarea",
	"template" : '<textarea {{{ flatattrs }}} name="{{ name }}">{{#if value}}{{ value }}{{/if}}</textarea>'
}]);

forms.NumberInput = extend(Widget, [{
	"identifier" : "NumberInput",
	"template" : '<input type="number" {{ flatattrs }} name="{{ name }}" {{#if value}}value="{{ value }}"{{/if}} />'
}]);


var ChoiceWidget = extend(Widget, [{
	"identifier" : "ChoiceWidget",
	"choices" : [],
	"allow_multiple_selected" : false,
	"checked_attribute" : {"checked" : true},

	"get_context" : function(self, name, value, attrs, field){
		// add choices to context
        var context = self.super(ChoiceWidget).get_context(self, name, value, attrs);
		context["choices"] = field.choices;
		return context;
	},

	"template" : '<select {{{ flatattrs }}} name="{{ name }}">{{#each choices}}<option value="{{ this.[0] }}" {{#ifequal ../value this.[0]}}selected{{/ifequal}}>{{ this.[1] }}</option>{{/each}}</select>'
}]);

forms.Select = extend(ChoiceWidget, [{
	"identifier" : "Select",
	"checked_attribute" : {"selected" : true}
}]);

forms.CheckboxSelectMultiple = extend(ChoiceWidget, [{
	"identifier" : "CheckboxSelectMultiple",
	"template" : '{{#each choices}}<div><input id="{{ ../attrs.id }}-{{@index}}" type="checkbox" name="{{ ../name }}" value="{{ this.[0] }}" {{#ifIn this.[0] ../value }}checked{{/ifIn}} /><label for="{{ ../attrs.id }}-{{@index}}">{{ this.[1] }}</label></div>{{/each}}'
}]);


