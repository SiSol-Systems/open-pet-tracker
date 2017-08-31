/*
* mango apps are javascript only
* href links are hijaxed and the href link is the functionname
* a href="functionname?param1=1&param2=2"
* urls do not matter
*/
var ajax = {

	parse_json : function(responseText){
		return JSON.parse(responseText);
	},

	error : function(status, statusText, responseText){
		alert("[xhr] Server Error " + status + " : " + statusText + " " + responseText);
	},
	
	parse_html : function(responseText){
		return responseText;
	},

	parse_xml : function(responseText){
		var parser = new DOMParser();
		var response = parser.parseFromString(responseText, "text/xml");
		return response;
	},

	serialize : function(data){
		// converts {"a":1, "b":2} to a=1&b=2
		var urlencoded = "";

		for (var key in data){
			urlencoded += "" + encodeURIComponent(key) + "=" + encodeURIComponent(data[key]) + "&";
		}

		urlencoded = urlencoded.substring(0, urlencoded.length - 1);

		return urlencoded; 
	},

	send : function(_settings){

		var self = this;

		var settings = {
			async : true,
			method: "GET",
			headers : {
				"X-Requested-With" : "XMLHttpRequest",
				"Content-Type" : 'application/x-www-form-urlencoded; charset=UTF-8'
			},
			statusCode : {
			},
			error : this.error
		};

		for (var setting in _settings){
			var value = _settings[setting];
			if (typeof value == "object"){

				if (value == null){
					settings[setting] = value;
				}
				else {

					if (!( settings.hasOwnProperty(setting) )){
						settings[setting] = value;
					}
					else {
						for(var key in value){
							settings[setting][key] = value[key];
						}
					}
				}
			}
			else {
				settings[setting] = value;
			}
		}

		// settings
		/*
		{
			async: true or false, defaults to true
			method : GET or POST,
			data : "" Type: PlainObject or String or Array Data to be sent to the server. It is converted to a query string, if not already a string. It's appended to the url for GET-requests.
			 dataType (default: html)) Type: String The type of data that you're expecting back from the server.
			success : 
			error :
			statusCode : {
				404 : fuction
			}
		}
		*/

		console.log("[xhr] " + settings.url);

		// how to abort an xhr if multiple xhrs are run?
		var xhr = new XMLHttpRequest;

		xhr.onreadystatechange = function(){

			console.log("[xhr] readyState " + xhr.readyState);

			switch (xhr.readyState){
				case 4:

					console.log("[xhr] finished with status " + xhr.status);

					if (settings.statusCode.hasOwnProperty(xhr.status)){
						settings.statusCode(xhr.responseText);
					}

	

					/*
						1xx Informational.
						2xx Success.
						3xx Redirection.
						4xx Client Error.
						5xx Server Error.
					*/

					var result = parseInt(xhr.status/100);

					if (result == 2 || result == 0){

						if (settings.hasOwnProperty("dataType")){
							try {
								var parse_fn = "parse_" + settings.dataType.toLowerCase();
								parsed_response = ajax[parse_fn](xhr.responseText);
							}
							catch(e){
								if (typeof settings.error == "function"){
									settings.error(xhr.status, "Server error: invalid response");
								}
								return false;
							}
						}
						else {
							parsed_response = xhr.responseText;
						}

						if (typeof settings.success == "function"){
							settings.success(parsed_response, xhr.status);
						}

					}
					else {
						console.log("[ajax] ERROR : " + xhr.status + " " + xhr.statusText + " " + xhr.responseText);
						if (typeof settings.error == "function"){
							settings.error(xhr.status, xhr.statusText, xhr.responseText);
						}
					}

					if (typeof settings.complete == "function") {
						settings.complete(xhr.responseText, xhr.status);
					}
					
					break;
				default:
					break;
			}
		};


		var data = null;

		// check if settings.data needs to be parsed or urlencoded
		if (settings.hasOwnProperty("data")){

			// settings.data always is a javascript object {lo:ve}
			// parse it according to the Content-Type header
			// application/json: JSON.stringify()
			// x-www-form-urlencoded : parse as url parameters
			if (settings.headers["Content-Type"].indexOf("application/json") != -1){
				data = JSON.stringify(settings.data);
			}
			else if (settings.headers["Content-Type"].indexOf("x-www-form-urlencoded") != -1){
				var urlparams = self.serialize(settings.data);

				if (settings.url.indexOf("?") > 0){
					settings.url = settings.url + "&" + urlparams;
				}
				else {
					settings.url = settings.url + "?" + urlparams;
				}
			}
			else {
				data = settings.data;
			}

		}
		
		
		xhr.open(settings.method, settings.url, true);
		for (var key in settings.headers) {
			xhr.setRequestHeader(key, settings.headers[key]);
		}

		if (data != null){
			xhr.send(data);
		}
		else {
			xhr.send();
		}
	},

	POST : function(url, data, onsuccess, onerror){
		this.send({
			url : url,
			method: "POST",
			dataType : "HTML",
			success: onsuccess,
			error : onerror,
			data : data
		});
	},

	GET : function(url, data, onsuccess, onerror){
		this.send({
			url : url,
			method: "GET",
			dataType : "HTML",
			success: onsuccess,
			error : onerror,
			data : data
		});
	},

	getJSON : function(url, data, onsuccess, onerror){
		// do not alter content-type to json as the body will be ignored on GET
		this.send({
			url : url,
			method: "GET",
			dataType : "JSON",
			success: onsuccess,
			error : onerror,
			data : data
		});
	},

	postJSON : function(url, data, onsuccess, onerror){
		this.send({
			url : url,
			method : "POST",
			dataType : "JSON",
			success : onsuccess,
			error: onerror,
			data : data,
			headers : {
				"Content-Type" : 'application/json'
			}
		});
	},
	putJSON : function(url, data, onsuccess, onerror){
		this.send({
			url : url,
			method : "PUT",
			dataType : "JSON",
			success : onsuccess,
			error: onerror,
			data : data,
			headers : {
				"Content-Type" : 'application/json'
			}
		});
	}
}
