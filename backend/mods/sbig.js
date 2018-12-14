"use strict"


var seo = arguments[0];
var sbig = seo.require('./lib/sbig');

var ob_tpl = {

    name : "Observation Block",
    
    objects : {
	
	object_settings : {

	    objects : {
	    
	    imagetype : {
		name : "Image type",
		type: "string"
	    },
	    
            exptime : {
		name : "Exposure time",
		type : "number"
	    },
	    
	    nexpo : {
		name : "Number of exposures",
		type : "number"
	    },
	    
	    filter : {
		name : "Filter name",
		type: "string"
	    },
	    
	    object : {
		name : "Target object description",
		type: "string"
	    }
	    }
	},
	
	ccd_settings : {
	    objects : {
	    cooling_enabled: {
		name : "Cooling enabled",
		type: "string"
	    },
	    cooling_setpoint : {
		name : "Cooling setpoint",
		type: "number"
	    },
	    frametyp : {
		name : "Frame type",
		type: "string"
	    },
	    binning : {
		name : "Binning mode",
		type: "string"
	    },
	    subframe : {
		name : "Subframe definition",
		objects : {
		    x0 : {
			name : "X0",
			type : "number"
		    },
		    y0 : {
			name : "Y0",
			type : "number"
		    },
		    xf : {
			name : "XF",
			type : "number"
		    },
		    yf : {
			name : "YF",
			type : "number"
		    }
		}
	    }
	    }
	}
    }
};



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
		
	    },

	    get_ob_template : function(msg, reply){
		reply(ob_tpl);
	    },

	    submit_ob : function(msg, reply){
		console.log("Executing OB " + JSON.stringify(msg.data, null, 10));
	    }
	    
	    
	}
    }
    
};

return new sbig_driver();
