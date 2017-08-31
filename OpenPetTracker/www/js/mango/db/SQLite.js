/* SQLITE implementation */
var SQLite = {
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

	syncdb : function(syncedCB){

		console.log("[SQLiteDB] starting sync");

		var self = this;

			
		function createTable(model, tablename, modelname, createdTableCB){
		
			console.log('creating table ' + tablename);

			// map
			var fieldmapping = {
				"IntegerField" : "INTEGER",
				"FloatField" : "FLOAT",
				"BooleanField" : "BOOLEAN",
				"DateField" : "DATE",
				"DateTimeField" : "DATETIME",
				"TextField" : "TEXT",
				"CharField" : "TEXT"
			};

			var sql_values = [];

			var primary_key = model.fields[model.Meta.primary_key];
	
			var sql_head = "CREATE TABLE IF NOT EXISTS " + tablename + " ( " + primary_key.db_column + " " + fieldmapping[primary_key.field_type] + " PRIMARY KEY",
				sql_inner = "",
				sql_tail = ");";
				
			if (!(primary_key.hasOwnProperty("autoIncrement")) || primary_key.autoIncrement != false) {
				sql_head = sql_head + " AUTOINCREMENT ";
			}
		
			   
			if (typeof model.Meta.primaryKeyExtraSQL == "string"){
				sql_head = sql_head + " " + model.Meta.primaryKeyExtraSQL;
			}
		
			sql_head = sql_head + ",";
				
			for (var column_name in model.fields){
				var column = model.fields[column_name];
			
				if (column_name == model.Meta.primary_key){
					continue;
				}
				else if (column.field_type == "ForeignKey"){
					if (!(column.hasOwnProperty("to_field"))){
						column.to_field = window[column.to_object].Meta.primary_key;
					}

					if (column["null"] != true) {
						var nullable = "NOT NULL";
					}
					else {
						var nullable = "";
					}
					
					// get the datatype from the model
					var fk_datatype = fieldmapping[window[column.to_object].fields[column.to_field].field_type];

					var constraint_name = column_name + "_" + column_name + "_fk";
					sql_inner = "" + column.db_column + " " + fk_datatype + " " +  nullable + " CONSTRAINT " + constraint_name + " REFERENCES " + window[column.to_object].db_identifier +  "(" + column.to_field + "),";
				}
				else {
					sql_inner = sql_inner + " " + column.db_column + " " + fieldmapping[column.field_type];
				
					if (column["null"] != true) {
						sql_inner = sql_inner + " NOT NULL";
					}
				
					if (column["default"] !== null && typeof column["default"] !== "undefined"){
						if (column.field_type == "BooleanField"){
							if (column["default"] == false){
								column["default"] = 0;
							}
							else {
								column["default"] = 1;
							}
						}
						
						if(column.field_type == "CharField" || column.field_type == "TextField"){
							sql_inner = sql_inner + " DEFAULT " + "'" + column["default"] + "' ";
						}
						else {
							sql_inner = sql_inner + " DEFAULT " + column["default"];
						}
					}

					if ("unique" in column  && column["unique"] == true){
						sql_inner = sql_inner + " UNIQUE ";
					}
				
					if (typeof column.extraSQL == "string") {
						sql_inner = sql_inner + " " + column.extraSQL;
					}
				
					sql_inner = sql_inner + ",";

				}
			}
		
			//add unique_togethers to sql_inner
			if (model.Meta.unique_together.length > 0){
				// it can be a list or a list of lists
				var unique_together = model.Meta.unique_together;

				function append_unique_together(list){

					var uniqueCols = [];
					
					for (var f=0; f<list.length; f++){
						var field_name = list[f];
						// get the db_column
						uniqueCols.push(model.fields[field_name].db_column);
					}

					var unique_string = " UNIQUE(" + uniqueCols.join() + "),";
					sql_inner = sql_inner + unique_string;
					
				}

				if (typeof unique_together[0] == "list"){
					for (var l=0; l<unique_together.length; l++){
						append_unique_together(unique_together[l]);
					}
				}
				else {
					append_unique_together(unique_together);
				}
				
			}
		
			if(sql_inner[sql_inner.length-1] == ","){
				sql_inner = sql_inner.substring(0, sql_inner.length - 1);
			}
		
			var sql_query = sql_head + sql_inner + sql_tail;
		
			/* run the query */
			mango.db.transaction(function(tx){
			
				console.log(sql_query);
			
				tx.executeSql(sql_query, [], function (tx, result) {
					//console.log(JSON.stringify(result));
					createIndexes(model, tablename, modelname, createdTableCB);
				},
				SQLite.error_handler);
			});
		
		}
	
		function createIndexes(model, tablename, modelname, createdIndexesCB){
		
			console.log('creating indexes');

			var indexKeys = [];
			var indexCount = 0;

			for (var key in model.Meta.indexes) {
			    indexKeys.push(key);
			    indexCount++;
			}
	
			function createIndexesLoop(){
			
				indexCount--;
			
				if(indexCount >=0){
				
					var indexKey = indexKeys[indexCount];
					var index = model.Meta.indexes[indexKey];

					var indexCols = index.keyPath;
				
					if(typeof indexCols !== "string"){
						indexCols = indexCols.join();
					}
				
					var indexName = modelname + "_" + index.name; //sql only prepend
				
					var sql_query = "CREATE INDEX IF NOT EXISTS " + indexName + " ON " + modelname + "(" + indexCols + ")";
				
					console.log(sql_query);
					/* run the query */
					self.db.transaction(function(tx){
					
						console.log(sql_query);
					
						tx.executeSql(sql_query, [], function (tx, result) {
							//console.log(JSON.stringify(result));
							createIndexesLoop();
						},
						SQLite.error_handler);
					});
				
				}
				else {
					console.log('finished creating indexes');
					createdIndexesCB();
				}
			
			}
		
			createIndexesLoop();
	
		}

		each(mango.models, function(modelname, iterate){

			console.log("[SQLiteDB] syncing " + modelname);						

			var model = window[modelname];

			var tablename = model.db_identifier;

			mango.db.transaction(function(tx){
				
				tx.executeSql("SELECT * FROM sqlite_master WHERE type='table' AND name=?;", [tablename], function (tx, result) {
		                
			    	if (result.rows.length == 0) {
		            	//create the table
		            	createTable(model, tablename, modelname, iterate);
		            }
		            else {
			            iterate();   
		            }
			            
				}, SQLite.error_handler);
			          
			});
		}, function(){
			console.log("[SQLiteDB] finished sync");
			syncedCB();
		});
		
	}
}


// SQLite querying implementation - depends on ModelInterface Object prototype
// translates model functions into SQL strings
// this still needs the feature of detecting foreign keys and convert them into objects
var SQLiteModelInterface = extend(ModelInterface, [{

	create : function(modelname, db_identifier){
		var self = this._create(modelname, db_identifier);
		return self;
	},
	
	// exists immediately executes sql command
	exists : function(callback){
		//SELECT EXISTS(SELECT 1 FROM myTbl WHERE u_tag="tag" LIMIT 1);
		
		var self = this;
		self.query_limit = 1;
		
		var where = self._construct_where_part(self.filters);
		var sql_string = "SELECT COUNT(*) AS count FROM " + self.db_identifier + where.sql;

		this._execute(sql_string, where.values_list, function(tx, results){
			callback(results.rows.item(0).count);
		});

	},
	// sql_command : string, values: {}, filters: {}
	_construct_where_part : function(filters){

		var self = this;

		var where = {
			sql : "",
			values_list : []
		};

		if (Object.keys(filters).length > 0){
			var where_parts = [],
				values = [];
	
			for ( var key in filters ) {

				if (key == "pk"){
					var where_part = window[self.modelname].Meta.primary_key + " = ? ";
				}
				else {
					var where_part = key + " = ? ";
				}

				where_parts.push(where_part);
				values.push( filters[key] );
			}
	
			if(values.length > 0){
				var where_part = where_parts.join(" AND ");
				var where_sql = " WHERE " + where_part;
			}
	
			where.sql =  where_sql;
			where.values_list = values;
		}
		return where;		

	},

	apply_limitoffset : function(sql_string){
		if (this.query_limit != null){
			sql_string = sql_string + " LIMIT " + this.query_limit;
		}

		if (this.query_offset != null){
			sql_string = sql_string +  " OFFSET " + this.query_offset;
		}
		return sql_string;
	},

	_execute : function(sql_string, values, callback){
	
		var dbInterface = this;

		var sql_string = this.apply_limitoffset(sql_string);

		// reset filters, excludes etc.
		this._reset();

		console.log(sql_string + " values: " + JSON.stringify(values));

		mango.db.transaction(function (tx) {
            tx.executeSql(sql_string, values, function(tx, results){
				if (typeof callback == "function"){
					callback(tx, results);
				}
			}, dbInterface.error_handler);
		});
	},

	get : function(filters, callback){

		var dbInterface = this;
		
		var where = this._construct_where_part(filters);
		var sql = "SELECT * FROM " + this.db_identifier + where.sql;
		
		this._execute(sql, where.values_list, function(tx, results){
			if (results.rows.length > 1){
				self.error("GET returned " + results.rows.length + " items instead of 1");
			}
			else {		
				var instance = dbInterface.result_to_model_instance(results.rows.item(0), callback);
			}
		});
		
	},

	each : function(onIter, onFinished){
		var dbInterface = this,
			onIter = onIter,
			onFinished = onFinished;

		var where = this._construct_where_part(this.filters);
		var sql = "SELECT * FROM " + this.db_identifier;

		values = where.values_list;
		sql = sql + where.sql;

		this._execute(sql, values, function(tx, results){
			dbInterface._iterateSQLObj(tx, results, onIter, onFinished);
		});
	},

	select_sql : function(){
		var where = this._construct_where_part(this.filters);

		var values = this.values.join();
		var values_selector = values ? values : "*";

		var sql_string = "SELECT " + values_selector + " FROM " + this.db_identifier + where.sql;
	
		return {"sql_string" : sql_string, "values_list" : where.values_list};
		
	},
	
	fetch : function(callback){

		var self = this;

		var sql = this.select_sql();
	
		self._execute(sql.sql_string, sql.values_list, function(tx, results){

			var instances = [];

			if(results.rows.length > 0){

				self._iterateSQLObj(tx, results, function(instance, iterate){
					instances.push(instance);
					iterate();
				}, function(){
					callback(instances);
				});
			}
			else {
				callback(instances);
			}
		});
	},

	first : function(callback){

		var dbInterface = this;

		var sql = this.select_sql();

		var sql_string = sql.sql_string + " LIMIT 1";

		this._execute(sql_string, sql.values_list, function(tx, results){
			if (results.rows.length > 0){
				var instance = dbInterface.result_to_model_instance(results.rows.item(0), callback);
			}
			else {
				callback(null);
			}
		});
		
	},
	
	// apply this.filters
	count : function(callback){

		var where = this._construct_where_part(this.filters);
		
		var sql = "SELECT COUNT(*) AS count FROM " + this.db_identifier;
			
		values = where.values_list;
		sql = sql + where.sql;
		
		this._execute(sql, values, function(tx, results){
			callback(results.rows.item(0).count);
		});
	},

	// INSERT / UPDATE / DELETE
	// convert values to match the database column type, e.g. bool to 0/1 and DateTime values to integer
	_parse_column_and_value : function(column, value) {

		var field_definition = window[this.modelname].fields[column];

		if (field_definition.hasOwnProperty("db_column")){
			column = field_definition.db_column;
		}
		else {
			if (field_definition.field_type == "ForeignKey"){
				column = column + "_id";
			}
		}

		if (field_definition.field_type == "ForeignKey"){
			// value is an instance
			// to_field
			if (field_definition.hasOwnProperty("to_field")){
				value = value[field_definition.to_field];
			}
			else {
				value = value[window[value.object_type].Meta.primary_key];
			}
		}

		switch (field_definition.field_type){
			case "BooleanField":
				if (value === false){
					value = 0;
				}
				else if (value === true){
					value = 1;
				}
				break;
			case "DateTimeField":
				if (value == "now"){
					value = new Date().getTime();
				}
				break;
			case "IntegerField":
				value = parseInt(value);
				break;
			case "FloatField":
			case "DecimalField":
				value = parseFloat(value);
				break;
		}

		return {"db_column" : column, "db_value" : value};
	},
	// {object}
	insert : function(object, callback){

		var dbInterface = this;

		var columns = [],
			values = [],
			values_placeholder = [];

		for (var column in object){

			var parameters = this._parse_column_and_value(column, object[column]);
			columns.push(parameters.db_column);
			values.push(parameters.db_value);
			values_placeholder.push("?");
		}

		var columns_string = columns.join();
		var values_string = values.join();
		var values_placeholder_string = values_placeholder.join();

		var sql = "INSERT OR REPLACE INTO " + this.db_identifier + " (" + columns_string + ") VALUES (" + values_placeholder_string + ")";

		this._execute(sql, values, function(tx, results){
			if (typeof callback == "function"){
				dbInterface.get_last_insert(dbInterface.db_identifier, callback);
			}
		});
	},
	// .filter().update() - updates one or multiple objs
	update : function(values, callback){

		var self = this;

		var set_columns = [],
			set_values = [];
		
		for (var key in values){
			
			var parameters = this._parse_column_and_value(key, values[key]);

			var column = " " + parameters.db_column + " = ?";
			set_columns.push(column);
			set_values.push( parameters.db_value );
		}

		var where = this._construct_where_part(self.filters);

		var set_columns_string = set_columns.join();
		
		// append values from where to set_values
		var set_values = set_values.concat(where.values_list);

		var sql = "UPDATE " + this.db_identifier + " SET " + set_columns_string + " " + where.sql;

		this._execute(sql, set_values, callback);

	},

	// .filter().remove()
	remove : function(callback){
		
		var where = this._construct_where_part(this.filters);
		var sql = "DELETE FROM " + this.db_identifier + " " + where.sql;
		
		this._execute(sql, where.values_list, callback);
		
	},

	// helpers,
	paginate: function(page, per_page){
		return this.offset((page-1)*per_page).limit(per_page);
	},

	_fetch_foreignkey_data : function(db_model_data, object_type, onComplete){

		// eg media.observation_id
		var model_definition = window[object_type];

		var foreignKeys = model_definition.Meta.references;

		if (foreignKeys.length > 0){
		
			asyncListLoop(foreignKeys, function(fk_field_name, iterate){

				var fk_definition = model_definition.fields[fk_field_name];

				if(db_model_data.hasOwnProperty(fk_definition.db_column) && db_model_data[fk_definition.db_column] != null){

					var params = {};
					params[fk_definition.to_field] = db_model_data[fk_definition.db_column];
			
					window[fk_definition.to_object].objects.get(params, function(object_instance){ // this returns an object instance

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
	result_to_model_instance : function(result, callback){

		var self = this;

		// iterate over foreign keys & fetch instances
		self._fetch_foreignkey_data(result, self.modelname, function(){
			if (typeof callback == "function"){
				callback(window[self.modelname].create(result));
			}
		});
		
	},

	get_last_insert : function(tablename, callback){

		var dbInterface = this;

		var sql = "SELECT last_insert_rowid() AS last_insert_id FROM " + this.db_identifier;

		this._execute(sql, [], function(tx, results){
			tx.executeSql("SELECT * FROM " + tablename + " WHERE ROWID=?", [results.rows.item(0).last_insert_id], function(tx,results){
				callback(results.rows.item(0));
			}, dbInterface.error_handler);
		});
		
	},

	_iterateSQLObj : function(tx, results, onIter, onFinished){
		var dbInterface = this;
		this._iterateSQL(tx, results, function(result, iterate){
			var instance = dbInterface.result_to_model_instance(result, function(instance){
				onIter(instance, iterate);
			});
		}, onFinished);
	},

	_iterateSQL : function(tx, results, onIter, onFinished){
		
		var count = results.rows.length;
    	
    	console.log("found " + count + " entries");
		
		function iterate(){
			
    		count--;
    		
    		if(count >=0){
    			var object = results.rows.item(count);
        		
        		onIter(object,iterate);
    		}
    		else {
    			if(typeof onFinished == "function"){
        			onFinished();
        		}
    		}
    	}
    	
    	iterate();
	},

	raw : function(){
	},
	error : function(msg){
		alert(msg);
	}
		
}]);

var websqlModelInterface = SQLiteModelInterface;
