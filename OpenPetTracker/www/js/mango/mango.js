"use strict";

// enabling multiple inheritance

function extend(prototype, extensionlist) {
	
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

	return object;
};

/* GENERAL */
// Object.create is prototype inheritance and not real cloning
function clone(obj){
	return JSON.parse(JSON.stringify(obj));
}

// type checks
function isInt(n){
	var n = parseInt(n);
    return Number(n) === n && n % 1 === 0;
}

function isFloat(n){
    return n === Number(n) && n % 1 !== 0;
}

function isBool(b){
	if (b === 0 || b === "0"){
		b = false;
	}
	else if (b === 1 || b === "1"){
		b = true;
	}
	return typeof b === "boolean";
}

function isChar(c){
	return typeof c === "string";
}

function parseBool(b){
	if (b == 1 || b == "1"){
		b = true;
	}
	else if (b == 0 || b == "0"){
		b = false;
	}
	else {
		throw new Error("parseBool error: " + b);
	}
	return b;
}


/*
* mango
* mange depends on device so t has to be initialized after deviceready
*/
var mango = {

	models: [],

	init : function(){

		// check if required modules are ready
		var required_modules = ["i18next", "Handlebars"];
		for (var m=0; m<required_modules.length; m++){
			if (!(required_modules[m] in window)){
				throw new Error("ERROR: required object " + required_modules[m] + " not found in window");
			}	
		}
		
		// init database
		this.init_database();
		this.init_models();

		if (this.initialized.indexOf("i18n") == -1){

			this.init_i18n();
		}

		
			
		delete this["init"];
		return this;

	},

	get_database_settings : function(){
		if (device.platform in settings.DATABASES){
			return settings["DATABASES"][device.platform];
		}
		else {
			return settings["DATABASES"]["default"];
		}
	},

	get_db_type : function(){
		
		var database_settings = this.get_database_settings();
		return database_settings["ENGINE"].split(".")[0];
	},

	get_db_implementation : function(){
		var database_settings = this.get_database_settings();
		return database_settings["ENGINE"].split(".")[1];
	},

	initialized : [],
	
	init_i18n : function(){

		i18next.init({
			lng: 'de',
			resources: {
				de: {
					translation: {
						"key": "hello world",
						"AboutText" : "You are not alone. The Cosmos is much more full of life than you can imagine. <br><br> This also applies to your immediate, local environment – your personal Local Cosmos. Nowadays its inhabitants became so alien to humans that the possible extinction of many is simply a tolerable side effect of what is called growth and success. <br><br> It now is up to you to reconnect to your cohabitants and contribute to their survival. You can do this by creating an app on LocalCosmos.org which will become the platform for promoting and monitoring the Biodiversity of your Local Cosmos."
					}
				},
				en: {
					translation: {
						"key": "hello world"
					}
				}
			}
		});

		// initialized and ready to go!
		window["_"] = function(key){ 
			return i18next.t(key);
		};

		this.initialized.push("i18n");
	},

	init_database: function(){

		var self = this;

		if (device.platform in settings.DATABASES){
			var database_settings = settings["DATABASES"][device.platform];
		}
		else {
			var database_settings = settings["DATABASES"]["default"];
		}

		self.dbType = self.get_db_type();
		self.dbImplementation = self.get_db_implementation();


		if (self.dbType == "SQLite"){
			if (self.dbImplementation == "sqliteplugin"){
				// this is the SQLite plugin of cordova
				mango.db = window.sqlitePlugin.openDatabase({name: database_settings["NAME"], location: 'default'});
			}
			else if (self.dbImplementation == "websql"){
				// websql is deprecated and currently only should be used as a fallback for Ubuntu where SQLiteplugin is unsupported
				mango.db = window.openDatabase(database_settings["NAME"], '' + database_settings["VERSION"], database_settings["NAME"], 5*1024*1024);
			}

			self.load_customqueries();
		}
		else if (self.dbType == "RemoteDB"){
			// in this case, a remote database is used
			mango.db = null;
		}

		self.initialized.push('database');

	},

	init_models : function(){
		// add Managers to models
		for (var m=0; m<this.models.length; m++){
			var model = window[this.models[m]];
			model.objects = window["" + this.dbType + "ModelInterface"].create(model.model_name, model.db_identifier);
		}
	},

	load_customqueries : function(){
		if (typeof custom_queries == 'object'){
			for (var m=0; m<custom_queries.length; m++){
				var method = custom_queries[m];
				mango[method.name] = method[mango.dbType];
			}
		}
	},
	syncdb : function(callback){
		switch (mango.dbType){
			case "SQLite":
				console.log("syncing SQLite db");
				SQLite.syncdb(callback);
				break;
			case "IndexedDB":
				IndexedDB.syncdb(callback);
				break;
		}
	}

};

function each(data, onIter, onFinished){

	if( Object.prototype.toString.call( data ) === '[object Array]' ) {
		
		var index = -1,
			dataCount = data.length;
		
		var workLoop = function(){
			
			index++;
		
			if (index < dataCount){
			
				var obj = data[index];
			
				onIter(obj, workLoop);
			
			}
			else {
				if (typeof onFinished == 'function'){
					onFinished();
				}
			}
		
		}
	
		workLoop();

	}
	else {
		
		var keys = Object.keys(data);

		var index = -1,
			dataCount = keys.length;

		var workLoop = function(){
			index++;
		
			if (index < dataCount){

				var objname = keys[index];
			
				var obj = data[objname];
			
				onIter(objname, obj, workLoop);
			
			}
			else{
				if (typeof onFinished == 'function'){
					onFinished();
				}
			}
		}
	
		workLoop();

	}

}

/*
function each(data, onIter, onFinished){

	if( Object.prototype.toString.call( data ) === '[object Array]' ) {

		var index = -1,
			dataCount = data.length;
	
		function workLoop(){
		
			index++;
		
			if (index < dataCount){
			
				var obj = data[index];
			
				onIter(obj, workLoop);
			
			}
			else{
				if (typeof onFinished == 'function'){
					onFinished();
				}
			}
		
		}
	
		workLoop();

	}
	else {

		var keys = Object.keys(data);

		var dict_index = -1,
			dict_dataCount = keys.length;

		function dict_workLoop(){

			dict_index++;
		
			if (dict_index < dict_dataCount){

				var objname = keys[dict_index];
			
				var obj = data[objname];
			
				onIter(objname, obj, workLoop);
			
			}
			else{
				if (typeof onFinished == 'function'){
					onFinished();
				}
			}
		}
	
		dict_workLoop();

	}

}*/
