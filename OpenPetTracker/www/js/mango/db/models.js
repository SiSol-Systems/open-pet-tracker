/* ORM */
/* ModelInterface: Prototype for QUERY BUILDERS like SQLModelInterface */
// construct strings for querying databases, return as string
// this will be attached as Modelname.objects
// every .objects() call creates a new interface
// if .objects was used without (), filters() have to reset this.filters
// and all othr params needed a reset somehow
var ModelInterface = {
	
	// private function attached to the Model object as .objects
	_create : function(modelname, db_identifier){
		var self = Object.create(this);
		// the following properties are independant from prototype
		self.db_identifier = db_identifier;
		self.modelname = modelname;
		self.filters = {};
		self.excludes = {};
		self.values = [];
		self.order_by = null;
		self.query_offset = null;
		self.query_limit = null;
		return self;
	},
	filter : function(new_filters){
		for (var key in new_filters){
			this.filters[key] = new_filters[key];
		}
		return this;
	},

	exclude : function(new_excludes){
		for (var key in new_excludes){
			this.excludes[key] = new_excludes[key];
		}
		return this;
	},

	all : function(callback){
		if (typeof callback == "function"){
			this.fetch(callback);
		}
		else {
			return this;
		}
	},

	exists: function(){
		console.log("[ModelInterface] .exists is not implemented");
	},

	offset : function(offset){
		this.query_offset = offset;
		return this;
	},
	limit : function(limit){
		this.query_limit = limit;
		return this;
	},

	order_by : function(str){
		this.order_by = str;
		return this;
	},
	error_handler : function(error, errorCB){
		try {
			alert("Error " + JSON.stringify(error));
		}
		catch (e){
			alert(error);
		}
		if (typeof errorCB == "function"){
			errorCB();
		}
	},

	_reset : function(){
		// reset filters, excludes etc.
		this.filters = {};
		this.excludes = {};
		this.order_by = null;
		this.query_offset = null;
		this.query_limit = null;
	}
};

/*
* function to create a Model, extended "extend" function
* automatically adds primary key "id" column if not set in fields
* automatically creates db_identifier
*/
function Model(prototype, extensionlist){
	var object = Object.create(prototype);

	var index = extensionlist.length;

	while (index) {
		index--;
		var extension = extensionlist[index];

		for (var property in extension){
			if (object.hasOwnProperty.call(extension, property) ||	typeof object[property] === "undefined") {
				object[property] = extension[property];
			}
		}
	}

	object._super = prototype;
	object.super = function(obj){
		var obj = obj || this;
		return obj._super;
	}

	// prevent filling prototype Meta
	object.Meta = clone(object.Meta);

	// auto-add primar key if missing
	object.db_identifier = "" + object.Meta.app_label.split(" ").join(""); + "_" + object.model_name.toLowerCase();

	if (!object.fields.hasOwnProperty(object.Meta.primary_key)){
		object.fields[object.Meta.primary_key] = models.IntegerField({"unique":true, "primary_key":true, "db_column":"id"});
	}

	// autocomplete Fields
	for (var field_name in object.fields) {
		var field = object.fields[field_name];

		// autofill db_column if not defined
		if(!(field.hasOwnProperty("db_column")))
		{
			switch (field.field_type)
			{
				case "ForeignKey":
					field.db_column = field_name + "_id";
					break;
				default:
					field.db_column = field_name;
			}
		}

		// if a field is foreign key, add the Object_name to Meta.referenced_by of
		// the referenced object
		if (field.field_type == "ForeignKey")
		{
			object.Meta.references.push(field_name);

			// if to_field is not set, it references the primary key
			if (!(field.to_object in window)){
				throw new Error("Model " + field_to_object + " is not defined. Referenced Models have to be defined before the referencing Model");
			}

			if (!field.hasOwnProperty("to_field")){
				field.to_field = window[field.to_object].Meta.primary_key;
			}

			window[field.to_object].Meta.referenced_by.push({"modelname" : modelname, "field_db_column": field.db_column, "field_to_field" : field.to_field});

		}

	}

	// currently the "objects" property, which links to models.Manager is added on mango.init_models()

	// add to mango.models - needed for syncdb
	mango.models.push(object.model_name);

	return object;
}

var BaseModel = {

	model_name : null, // formerly object_type
	db_identifier : null, // table name or objectstore name

	Meta : {
		primary_key : "id",
		referenced_by : [],
		references :  [],
		unique_together : [],
		indexes : [],
		app_label : settings.NAME
	},

	fields : {},

	// used in models.js for creating models in windows, e.G. var App = Model.init({})
	// define fills .Meta, and .fields and attaches .objects()
	// modelname has to be passed as argument because you cannot access the name of an object in javascript
	/* deprecated
	define : function(modelname, dict){

		mango.models.push(modelname);

		var self = Object.create(this);

		self.object_type = modelname;

		for (var key in dict){
			
			var entry = dict[key];

			if (key == "fields"){
				continue;
			}

			else if (typeof entry == "object"){
				// eg key == Meta
				if (!(self.hasOwnProperty(key))){
					self[key] = {};
				}

				for (var objkey in entry){
					self[key][objkey] = entry[objkey]; // shallow copy
				}
			}
			else {
				self[key] = entry;
			}
		}

		// autocomplete fields
		var has_primary_key = false;

		for (var field_name in dict.fields)
		{
			var field = dict.fields[field_name];

			// autofill db_column if not defined
			if(!(field.hasOwnProperty("db_column")))
			{
				switch (field.field_type)
				{
					case "ForeignKey":
						field.db_column = field_name + "_id";
						break;
					default:
						field.db_column = field_name;
				}
			}

			// if a field is foreign key, add the Object_name to Meta.referenced_by of
			// the referenced object
			if (field.field_type == "ForeignKey")
			{
				self.Meta.references.push(field_name);

				// if to_field is not set, it references the primary key
				if (!(field.to_object in window)){
					throw new Error("Model " + field_to_object + " is not defined. Referenced Models have to be defined before the referencing Model");
				}

				if (!field.hasOwnProperty("to_field"))
				{
					field.to_field = window[field.to_object].Meta.primary_key;
				}

				window[field.to_object].Meta.referenced_by.push({"modelname" : modelname, "field_db_column": field.db_column, "field_to_field" : field.to_field});

			}

			if (field.hasOwnProperty("primary_key") && field.primary_key == true)
			{
				has_primary_key = true;
				self.Meta.primary_key = field_name;
			}

			self.fields[field_name] = field;
		}

		// if no primary key has been detected after iterating over all fields, add the default primary key
		if (!has_primary_key)
		{
			if ("id" in self.fields)
			{
				throw new Error("MangoDB Error: Cannot assign primary key as field with name 'id' already exists");
			}
			self.Meta.primary_key = "id";
			self.fields["id"] = models.IntegerField({"unique":true, "primary_key":true, "db_column":"id"});
		}

		self.db_identifier = "" + self.Meta.app_label + "_" + modelname.toLowerCase();

		// attach objects - ORM
		// it has to be called as objects()
		self.objects = window["" + mango.dbType + "ModelInterface"].create(self.object_type, self.db_identifier);

		console.log("Created Model " + modelname);

		return self;
		
	},
	*/
	
	// creates a NEW instance, like app = App(thing=thong) in django would be var app = App.create({"thing":thong});
	create: function(fields){
		// reverse foreign keys need the fkname_set().filter().fetch() functionality
		// reverse relations are stored in model.Meta.referenced_by[]
		// forward foreign keys need instance of object or fk_id param
		// and other checks are still missing...
		var self = Object.create(this);

		var fields = fields || {};

		// disable querying on Model instances
		self.objects = null;

		// iterate over fields in field definition
		for(var field_name in fields){

			// perform a type check
			var value = fields[field_name];

			if (value != null) {

				if (field_name in self.fields) {

					var field_definition = self.fields[field_name];

					switch (field_definition.field_type) {
						case "IntegerField":
							if (isInt(value)) {
								self[field_name] = parseInt(value);
							}
							else {
								throw new TypeError("ERROR: " + field_name + " expected Integer, not " + typeof(value) + "(" + value + ")");
							}
							break;
						case "FloatField":
						case "DecimalField":
							if (isFloat(value)){
								self[field_name] = parseFloat(value);
							}
							else {
								throw new TypeError("ERROR: " + field_name + " expected Float, not " + typeof(value) + "(" + value + ")");
							}
							break;
						case "BooleanField":
							if (isBool(value)){
								self[field_name] = parseBool(value);
							}
							else {
								throw new TypeError("ERROR: " + field_name + " expected Boolean, not " + typeof(value) + "(" + value + ")");
							}
							break;
						case "CharField":
							if (isChar(value)){
								self[field_name] = value;
							}
							else {
								throw new TypeError("ERROR: " + field_name + " expected string, not " + typeof(value) + "(" + value + ")");
							}
							break;
						case "ForeignKey":
							if (Object.getPrototypeOf(value) === window[field_definition.to_object] ){
								self[field_name] = value;				
							}
							else {
								throw new TypeError("ERROR: " + field_name + " has to be an instance of " + field_definition.to_object);
							}
							break;
						default:
							self[field_name] = value;
					
					}
				}
				else {
					self[field_name] = value;
				}
			}		
			
		}

		// should references be moved to define?
		var references = self.Meta.referenced_by;

		for (var m=0; m<references.length; m++){
			var reference = references[m];
			self[reference.modelname.toLowerCase() + "_set"] = function(filters){
				var filters = filters || {};
				if (self.hasOwnProperty(self.primary_key)){

					filters[reference.field_db_column] = self[reference.field_to_field];
					var minterface = SQLModelInterface.create(mango.db, reference.modelname);
					
					minterface.filter(filters);

					return minterface
				}
				else {
					throw new Error("ERROR: cannot lookup reverse relations on a non-saved object");
				}
			}
		}

		return self;
	},

	save : function(self, callback) {
		//.objects is the interface
		
		var values = {};

		for (var key in self.fields){
			if (self.hasOwnProperty(key)){
				// if it is a foreign key, _id is appended to the key
				// fks are sql only, so the alteration is done in SQLModelInterface
				values[key] = self[key];
			}
		}

		var primary_key = self.Meta.primary_key;

		if(values.hasOwnProperty( primary_key )){
			var filters = {
				"id" : values[primary_key]
			}; 
			delete values[primary_key];
			window[self.model_name].objects.filter(filters).update(values, callback);
		}
		else {
			window[self.model_name].objects.insert(values, function(created_obj){
				// sync model field values with database values
				for (var key in created_obj){
					self[key] = created_obj[key];
				}

				if (typeof callback == "function"){
					callback(self);
				}
			});
		}
	},
		
	remove : function (self, callback) {
		var primary_key = appmodels[self.model_name].Meta.primary_key;
		if (this.hasOwnProperty(primary_key)){
			var filters = {};
			filters[primary_key] = self[primary_key];
			window[self.model_name].objects.remove(filters, callback);
		}
		else {
			if (typeof callback == "function"){
				callback();
			}
		}
	}
};


var ModelField = {
	create : function(field_type, dict) {
		var self = Object.create(this);

		self.field_type = field_type;

		var dict = dict || {};

		for (var key in dict){
			self[key] = dict[key];
		}

		return self;
	},
	formfield : function(kwargs){
		var self = this;
		if (self.hasOwnProperty("choices")){
			kwargs["choices"] = self.choices;
			return forms.ChoiceField(kwargs);
		}
		else {
			return forms[this.field_type](kwargs);
		}
	},
	value_from_object : function(object, field_name){
		if (object.hasOwnProperty(field_name)){
			return object[field_name];
		}
		return '';
	}
};



var models = {
	Model : BaseModel,
	CharField : function(dict){
		return ModelField.create("CharField", dict);
	},
	IntegerField: function(dict){
		return ModelField.create("IntegerField", dict);
	},
	FloatField : function(dict){
		return ModelField.create("FloatField", dict);
	},
	BooleanField: function(dict){
		return ModelField.create("BooleanField", dict);
	},
	DateTimeField : function(dict){
		return ModelField.create("DateTimeField", dict);
	},
	ForeignKey : function(model, dict){
		var dict = dict || {};
		dict["to_object"] = model.model_name;
		return ModelField.create("ForeignKey", dict);
	}
};

