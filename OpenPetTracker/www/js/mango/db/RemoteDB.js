var RemoteDB = {
	syncdb : function(syncedCB){
		console.log("[djangoREST] bogus syncdb done");
		callback("syncedCB");
	}
}

var RemoteDBModelInterface = extend(ModelInterface, [{

	create : function(modelname, db_identifier){

		var self = this._create(modelname, db_identifier);
		return self;

	},

	_sanitize_filters : function(_filters){

		var self = this;

		var filters = {};

		for ( var key in _filters ) {

			if (key == "pk"){
				filters[window[self.modelname].Meta.primary_key] = _filters[key];
			}
			else {
				filters[key] = _filters[key];
			}
		}

		return filters
	},

	_apply_limitoffset : function(){
		if (this.query_limit != null){
			this.filters["limit"] = this.query_limit;
		}

		if (this.query_offset != null){
			this.filters["offset"] = this.query_offset;
		}

	},

	all : function(){
		return this;
	},
	
	// exists returns true or false
	exists : function(callback){
		var self = this;
		api.modelinterface[self.modelname].exists(self.filters, callback);
		self._reset();
	},

	get : function(filters, callback){

		var self = this;

		var filters = self._sanitize_filters(filters);

		api.modelinterface[self.modelname].get(filters, function(response){
			
			// create a model instance from the response or return null
			self._result_to_model_instance(response, function(instance){
				self._reset();
				callback(instance);
			});
			
		}, self.error_handler);
	},

	each : function(onIter, onFinished){
		var self = this;
		api.modelinterface[self.modelname].each(self.filters, onIter, onFinished);
		self._reset();
	},
	
	fetch : function(callback){
		var self = this;
		self._apply_limitoffset();
		api.modelinterface[self.modelname].fetch(self.filters, function(response){
			var instance_list = [];
			self._reset();

			// create instances
			each(response.results, function(item, iterate){
				self._result_to_model_instance(item, function(instance){
					instance_list.push(instance);
					iterate();
				});
			}, function(){
				callback(instance_list);
			});

		});
	},

	first : function(callback){
		var self = this;
		api.modelinterface[self.modelname].first(self.filters, callback);
		self._reset();
	},
	
	// apply this.filters, return number
	count : function(callback){
		var self = this;
		api.modelinterface[self.modelname].count(self.filters, callback);
		self._reset();
	},

	// {object}
	insert : function(object, callback){
		var self = this;
		
		api.modelinterface[self.modelname].insert(object, function(response){
			// return a dict {} with the values of the object as the instance gets
			// updated with these values
			/* {"id":3,"time":1475796491,"uuid":"6e76708e-c8d0-40ec-b279-3da3da25b102","client_id":"409ecab3-193b-411b-a122-aee4cefc0424"
			,"nuid":"00100800500i03a00k017","area":null,"latitude":49.668234899999995,"longitude":11.0738795,"accuracy"
			:0,"validation_step":null,"is_published":false,"created_at":"2016-10-06T23:28:22.807485","last_modified"
			:"2016-10-06T23:28:22.807534","is_doubted":false,"needs_id":false,"observatory":1,"observation_form"
			:null,"taxon":1176773,"user":null}*/

			self._result_to_model_instance(response, callback);
			self._reset();

		}, self.error_handler);
		
	},

	// object.filter.update()
	update : function(values, callback){

		var self = this;
		
		var filters = self._sanitize_filters(self.filters);
		self._reset();
		api.modelinterface[self.modelname].update(filters, values, function(response){
			if (typeof callback == "function"){
				callback();
			}
		});

	},

	// filters : {}
	remove : function(filters, callback){

		var self = this;

		var filters = self._sanitize_filters(filters);

		api.modelinterface[self.modelname].remove(filters, callback);
		self._reset();
	},

	// helpers,
	paginate: function(page, per_page){
		return this.offset((page-1)*per_page).limit(per_page);
	},

	_fetch_foreignkey_data : function(db_model_data, object_type, onComplete){
		// this should not trigger any more DB Queries
		// the FK data should already be attached to the result
		// the current implementation needs a REWRITE

		// db_model_data is a dict {} 
		var model_definition = window[object_type];

		var foreignKeys = model_definition.Meta.references;

		if (foreignKeys.length > 0){
			
			each(foreignKeys, function(fk_field_name, iterate){

				var fk_definition = model_definition.fields[fk_field_name];

				// only fetch if the fk field value is not null
				if(db_model_data.hasOwnProperty(fk_definition.db_column) && db_model_data[fk_definition.db_column] != null){

					var params = {};
					params[fk_definition.to_field] = db_model_data[fk_definition.db_column];
				
					// get is not appropriate for nullable fk fields
					window[fk_definition.to_object].objects.filter(params, function(object_instance){ // this returns an object instance

						// attach fetched data to field_name
						db_model_data[fk_field_name] = object_instance;
					
						iterate();
					
					});
				}
				else {
					db_model_data[fk_field_name] = null;
					iterate();
				}			
		
			}, function(){
				onComplete();
			});
		}
		else {
			onComplete();
		}
	},

	// currently, this only support fk fetching one level down
	_result_to_model_instance : function(result, callback){

		var self = this;

		self._fetch_foreignkey_data(result, self.modelname, function(){
			if (typeof callback == "function"){
				callback(window[self.modelname].create(result));
			}
		});
		
	},

	raw : function(){
	},
	_error_handler : function(msg){
		alert(msg);
	}
		
}]);
