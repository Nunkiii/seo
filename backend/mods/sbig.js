"use strict"


var seo = arguments[0];
var sbig = seo.require('./lib/sbig');

class sbig_driver{
    constructor(){
	var sbd=this;

	this.cams={};
	sbig.usb_info(function(data){
	    
	    
	    console.log("USB Info :" + JSON.stringify(data,null,4));
	    
	    if(data.length==0){
		console.log("No SBIG camera found!");
		return;
	    }
	    data.forEach(function(cam){
		sbd.cams[cam.id]=cam;
		sbd.cams[cam.id].uid=undefined;
	    });
	});
	
	this.mods={
	    
	    cam_info : function(msg, reply){
		
		reply(sbd.cams);
	    },
	    use_camera : function(msg, reply){
		var cid=msg.data.cam_id;
		var cam=sbd.cams[cid];
		if(cam===undefined)
		    return reply({ error : "No such camera!"});
		if(cam.uid===undefined){
		    cam.uid=this.session.id;
		    console.log("Cam locked by " + cam.uid);
		    seo.sm.broadcast("sbig","locked", { uid : cam.uid, cid: cid});
		    reply({});
		}else
		    reply({ error : "Camera is in use!"});
	    },
	    release_camera : function(msg, reply){
		var cid=msg.data.cam_id;
		var cam=sbd.cams[cid];
		if(cam===undefined)
		    return reply({ error : "No such camera!"});

		if(cam.uid==this.session.id){
		    cam.uid=undefined;
		    seo.sm.broadcast("sbig","unlocked", {cid: cid});
		    reply({});
		    console.log("Cam unlocked");
		}else
		    reply({ error : "Camera not in use or you are not owner!"});

	    },
	    get_cooling_info : function(msg, reply){
		
	    }
	    
	}
    }
    
};

return new sbig_driver();
