var ModalDialog = {
	__init__: function(){
		this.container = document.getElementById("ModalDialog");
		this.title = document.getElementById("ModalDialogTitle");
		this.content = document.getElementById("ModalDialogContent");
		this.td = this.container.getElementsByTagName("td")[0];
	},
	open : function(html, title){
		this.title.textContent = title;
		this.content.innerHTML = html;
		this.container.classList.remove("inback");
		this.container.classList.remove("closed");
		// activate blocktouchthrough
		Pagemanager._activate_gesture_listeners(this.content);

		return this;
	},
	set_content : function(html){
		this.content.innerHTML = html;
	},
	close : function(self, request, args, kwargs){//called from html

		if (kwargs.currentTarget.classList.contains("closeperm")) {
			ModalDialog._close(); // do not use "this._close"
		}
	},
	_close : function(){//called directly from js
		this.container.classList.add("closed");
		this.td.style.verticalAlign = "middle";
		var self = this;
		setTimeout(function(){
			self.container.classList.add("inback");
		}, 400);
	},
	valignTop : function(){
		this.td.style.verticalAlign = "top";
	}
};
