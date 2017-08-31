var settings = {
    "LANGUAGES": {
		"de" : "Deutsch"
	}, 
    "THEME": "Flat", 
    "NAME": "Open Pet Tracker", 
    "DATABASES": {
        "default": {
            "ENGINE": "SQLite.websql", 
            "VERSION": 1, 
            "NAME": "OpenPetTracker"
        }, 
        "windows": {
            "ENGINE": "SQLite.sqliteplugin", 
            "VERSION": 1, 
            "NAME": "OpenPetTracker"
        }, 
        "Android": {
            "ENGINE": "SQLite.websql", 
            "VERSION": 1, 
            "NAME": "OpenPetTracker"
        }, 
        "iOS": {
            "ENGINE": "SQLite.websql", 
            "VERSION": 1, 
            "NAME": "OpenPetTracker"
        }, 
        "browser": {
            "ENGINE": "SQLite.websql", 
            "VERSION": 1, 
            "NAME": "OpenPetTracker"
        }
    },  
    "APP_VERSION": 1
}
