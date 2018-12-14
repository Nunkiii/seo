class system{
    constructor(){

	this.web_clients={};
	
	
	this.mods={
	    ident : function (msg, reply){
		
		console.log("system: Ident rcv from client : " + JSON.stringify(msg.data));
		this.ident=msg.data;
		
		console.log("Client info : " + JSON.stringify(this.get_info()));

		if(reply!==undefined)
		    reply(this.get_info());
	    },
	    set_broadcast_stations : function(msg, reply){
		var opt=msg.data;
		for (var o in opt){
		    this.stations[o]=opt[o];
		}
		if(reply!==undefined)
		    reply(this.stations);
		
	    }
	    
	};

	
	
    }
};

return new system();


