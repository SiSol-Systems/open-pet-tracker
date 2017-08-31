"use strict";
/*** FormField ***/
// initializes a form field: complete the definition in appmodels, except id and name
// does not create a new object, but manipulates the definition in appforms, or the definition passed from modelform
// returns 
var FormField = {

	widget : forms.TextInput,  // Default widget to use when rendering this type of Field.
    hidden_widget : forms.HiddenInput,  // Default widget to use when rendering this as "hidden".
    validators : [],  // Default set of validators
	empty_values : [null, ''],
	error_messages : {
		"required": "This field is required.",
	},
	//
	required : true,
	label : null,
	initial : null,
	help_text : '',
	show_hidden_initial : false,
	localize : false,
	disabled : false,
	label_suffix : null,

	//
	value : '',

	validate : function(self, value){
        if (self.empty_values.indexOf(value) >=0 && self.required){
            throw new ValidationError(_(self.error_messages["required"]));
		}
	},

    run_validators : function(self, value){
        if (self.empty_values.indexOf(value) >=0){
            return;
		}
		
        var errors = [];

        for (var v=0; v<self.validators.length; v++){

			var validator = self.validators[v];

            try {
                validator(value);
			}
            catch(e) {/*
                if hasattr(e, 'code') and e.code in self.error_messages:
                    e.message = self.error_messages[e.code]
                errors.extend(e.error_list)*/
			}
		}
        if (errors.length){
            throw new ValidationError(errors);
		}		
	},

    clean : function(self, value){
        /*
        Validate the given value and return its "cleaned" value as an
        appropriate Python object. Raise ValidationError for any errors.
        */
        var value = self.to_javascript(self, value);
        self.validate(self, value);
        self.run_validators(self, value);
		return value;
	},

	prepare_value : function(self, value){
		/* prepare the value for html */
		return value;
	},

	to_javascript : function(self, value){
		return value;
	},

	bound_data : function(self, data, initial){
        /*"""
        Return the value that should be shown for this field on render of a
        bound form, given the submitted POST data for the field and the initial
        data, if any.
        For most fields, this will simply be data; FileFields need to handle it
        a bit differently.
        """*/
        if (self.disabled == true){
            return initial;
		}
		return data;
	},

	get_bound_field : function(self, form, field_name){
        /*"""
        Return a BoundField instance that will be used when accessing the form
        field in a template.
        """*/
		return BoundField.create(form, self, field_name);
	},

	has_changed : function(self, initial, data){
        /*"""Return True if data differs from initial."""*/
        //# Always return False if the field is disabled since self.bound_data
        //# always uses the initial value in this case.
        if (self.disabled == true){
            return false;
		}
        try {
            var data = self.to_javascript(data);
            if (self.hasOwnProperty('_coerce') == true){
                return self._coerce(data) != self._coerce(initial);
			}
		}
        catch(e){
			if (e instanceof ValidationError) {
				return true;
			} 
			else {
				throw e;
			}
		}
        //# For purposes of seeing whether something has changed, None is
        //# the same as an empty string, if the data or initial value we get
        //# is None, replace it with ''.
		if (initial == null){
			var initial_value = '';
		}
		else {
			var initial_value = initial_value;
		}
        
		if (data == null){
			var data_value = '';
		}
		else {
			var data_value = data;
		}
        
		return initial_value != data_value;
	}
	
};

forms.CharField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "CharField"
	}]);

	return field;
};

forms.BooleanField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "BooleanField",
		"widget" : forms.CheckboxInput
	}]);

	return field;
};

forms.ChoiceField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "ChoiceField",
		"widget" : forms.Select,
		"choices" : []
	}, kwargs]);

	return field;
};

forms.MultipleChoiceField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "MultipleChoiceField",
		"widget" : forms.SelectMultiple,
		"prepare_value" : function(self, value){
			/* prepare the value for html */
			if (value instanceof Array == false && value != null && value.length){
				value = [value];
			}
			return value;
		}
	}]);

	return field;
};


forms.DecimalField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "DecimalField",
		"widget" : forms.NumberInput,
	}]);

	//field.validators.push("DecimalValidator");
	return field;
};

forms.FloatField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "FloatField",
		"widget" : forms.NumberInput,
	}]);

	return field;
};

forms.IntegerField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "IntegerField",
		"widget" : forms.NumberInput,
	}]);

	return field;

};

forms.DateTimeField = function(kwargs){
	var field = extend(FormField, [kwargs, {
		"field_class" : "DateTimeField",
		"widget" : forms.NumberInput
	}]);

	return field;
};


forms.PointField = function(kwargs){

	var field = extend(FormField, [kwargs, {
		"field_class" : "PointField"
	}]);

	return field;
};


forms.PasswordField = function(kwargs){

	var field = extend(FormField, [kwargs, {
		"field_class" : "PasswordField"
	}]);

	return field;
};
