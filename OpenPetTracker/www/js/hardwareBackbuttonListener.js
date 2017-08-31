function hardwareBackbuttonListener() {

	if (Pagemanager.hasOpenModal == true){
		//Pagemanager.close_modal();
		//Pagemanager.close_subwindow();
	}
	else {
	    switch (History.length) {
	        case 1:
	            if (device.platform == "Android") {
					console.log("[HWBackButton] exiting app");
	                navigator.app.exitApp();
	            }
				else {
				}
	            break;
	        default:
	            History.back();
				if (device.platform == "windows") {
					return true
				}
	            break;
	    };
	}
}
