"use strict";
var ManageTraccarServerForm = Form(forms.Form, [{
	"fields" : {
		"server" : forms.CharField({"label":"Traccar Server URL"}),
		"port" : forms.IntegerField(),
		"username" : forms.CharField(),
		"password" : forms.PasswordField()
	}
}]);

var ManageTrackerForm = Form(forms.ModelForm, [{
	"Meta" : {
		"model" : Tracker,
		"fields" : ["phonenumber", "dog_name", "tracker_type", "imei", "apn", "interval"],
		"labels" : {
			"phonenumber" : "PhoneNumberOfTracker",
			"dog_name" : "NameOfDog",
			"tracker_type" : "TypeOfTracker",
			"apn" : "APNOfSIMCardOfTracker",
			"interval" : "IntervalInSeconds"
		}
	},
	"clean_phonenumber" : function(field){
		// check if the phonenumber is in the correct format
		var phonenumber = this.cleaned_data["phonenumber"];

		var error_message = _("TelephoneNumberFormatError");
		
		if (phonenumber.indexOf("+") != 0) {
			field.raise_ValidationError(error_message);
		}
		else {
			var numbers = phonenumber.substring(1);
			var isnum = /^\d+$/.test(numbers);

			if (isnum == false){
				field.raise_ValidationError(error_message);
			}
		}
		return phonenumber;
	}
}]);
