var menu = function(self, request, args, kwargs){

	console.log("menu");

	var sidemenu = document.getElementById("sidemenu"); 

	if (sidemenu.classList.contains("showmenu") || request.GET.action == "selected" || request.GET.action == "hide") {
		sidemenu.classList.remove("showmenu");
		app.hasOpenOverlay = false;
		if (request.GET.action == "selected"){
			pagemanager.restart();
		}
	}
	else {
		sidemenu.classList.add("showmenu");
		app.hasOpenOverlay = true;
	}
};


function hidemenu(){
	var sidemenu = document.getElementById("sidemenu"); 
	sidemenu.classList.remove("showmenu");
	app.hasOpenOverlay = false;
}

// this currently is not in use
function movemenu(self, request, args, kwargs){

	// alter menu position
	var event = kwargs.event;

	// check speed and hide menu if speed is high enough
	var speed = parseFloat(event.gesture_params.total_distance_x / Math.abs(event.timeStamp - event.gesture_params.start_timestamp));

	// use the distance to move the sidemenu
	var sidemenu = document.getElementById("sidemenu");
	if (isFinite(speed) && speed > 1.5){
		sidemenu.classList.remove("showmenu");
	}

	// live swiping is not performant enough yet
	/*
	var transform = 'translate3d(-' + event.gesture_params.current_distance_x +  'px, 0px, 0px)';
	console.log(transform);
	sidemenu.style.transformOrigin = event.gesture_params.current_coords.x + "px";
	sidemenu.style.webkitTransformOrigin = event.gesture_params.current_coords.x + "px";
	sidemenu.style.transform = transform;
	sidemenu.style.webkitTransform = transform;
	*/
}
