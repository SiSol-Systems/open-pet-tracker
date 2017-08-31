Handlebars.registerHelper('ifequal', function(a, b, opts) {
	if(a == b){
		return opts.fn(this);
	}
	else {
		return opts.inverse(this);
	}
});

Handlebars.registerHelper ('truncate', function (str, len) {
	var str = str.toString();
    if (str.length > len) {
        var new_str = str.substr (0, len+1);

        while (new_str.length) {
            var ch = new_str.substr ( -1 );
            new_str = new_str.substr ( 0, -1 );

            if (ch == ' ') {
                break;
            }
        }

        if ( new_str == '' ) {
            new_str = str.substr ( 0, len );
        }

        return new Handlebars.SafeString ( new_str +'...' ); 
    }
    return str;
});


Handlebars.registerHelper ('cut', function (str, len) {
	var str = str.toString();
    if (str.length > len) {
        var new_str = str.substr (0, len+1);

        while (new_str.length) {
            var ch = new_str.substr ( -1 );
            new_str = new_str.substr ( 0, -1 );

            if (ch == ' ') {
                break;
            }
        }

        if ( new_str == '' ) {
            new_str = str.substr ( 0, len );
        }

        return new Handlebars.SafeString ( new_str ); 
    }
    return str;
});

Handlebars.registerHelper('t', function (i18n_key) {
	var result = i18next.t(i18n_key);
	return new Handlebars.SafeString(result);
});


Handlebars.registerHelper('ifIn', function(element, list, options) {
	if(list.indexOf(element) > -1) {
		return options.fn(this);
	}
	return options.inverse(this);
});

Handlebars.registerHelper('unixToDate', function(unixtime) {
	var date = new Date(parseInt(unixtime));
	return date.toLocaleString();
});
