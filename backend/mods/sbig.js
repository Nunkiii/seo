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


class sbig_cam {

    constructor(){}

};


class sbig_driver{

    get_locked_cam(sock, cam_id){
	
	var cam=this.cams[cam_id];

	if(cam===undefined) return undefined; 

	if(cam.uid===undefined || cam.uid!=sock.session.id)
	    return undefined;
	return cam;
    }
    
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
		    for(var p in cam) console.log("Cam prop " + p);
		    
		    sbd.open_device(cid).then(function(msg){
			console.log("OpenDevice Info " + msg.type);
			
			if(init_message.type=="success") 
			    reply({});
		    }).catch(function(msg){
			console.log("OpenDevice Error " + msg.content);
			reply({ error : msg.content});
		    });
		    
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
		    cam.shutdown(function(msg){
			console.log(cam.name + " SHUTDOWN : " + JSON.stringify(msg));
			reply({});
			console.log("Cam unlocked");
		    });
		    
		}else
		    reply({ error : "Camera not in use or you are not owner!"});
		
	    },
	    get_cooling_info : function(msg, reply){
		
	    },
	    set_cooling_info : function(msg, reply){
		
	    },
	    get_ob_template : function(msg, reply){
		reply(ob_tpl);
	    },
	    submit_ob : function(msg, reply){
		var cam=sbd.get_locked_cam(this, msg.data.cam_id);
		if(cam===undefined){
		    return reply({ error : "Camera is in use"});
		    
		}
		console.log("Ok, we are owner of cam " + cam.name +" Executing OB " + JSON.stringify(msg.data.ob, null, 10));
		
	    }
	}
    }
    
    set_cooling(cam_id, opts){

	var cam=this.cams[cam_id];
	cam.set_temp(opts.cooling_enabled, opts.cooling_setpoint); //Setting temperature regulation 
	console.log("Cam cooling info = " + JSON.stringify(cam.get_temp()));
    }
    
    take_image(cam_id, opts){
	var ccd_opts=opts.objects.ccd_settings.objects;
	var obj_opts=opts.objects.object_settings.objects;
	
	var cam=this.cams[cam_id];

	
	
	var cam_options = {
	    
	    exptime : ccd_opts.exptime,
	    nexpo : ccd_opts.nexpo,
	    fast_readout : false,
	    dual_channel : false,
	    //light_frame: true,
	    readout_mode: ccd_opts.binning+"x"+ccd_opts.binning
	};
	
	switch(opts.frametyp){
	case "full":
	    break;
	case "crop":
	    break;
	case "custom":
	    var sf=ccd_opts.subframe.objects;
	    cam_options.subframe = [sf.x0.value, sf.y0.value, sf.xf.value-sf.x0.value, sf.yf.value-sf.y0.value];
	    break;
	default: break;
	};
	
	switch(object_opts.imagetype){
	case "science":
	    cam_options.light_frame= true;
	    break;
	case "flat":
	    cam_options.light_frame= true;
	    break;
	case "dark":
	    cam_options.light_frame= false;
	    break;
	case "bias":
	    cam_options.light_frame= false;
	    break;
	default: break;
	}

	console.log("Starting exposure " + JSON.strigify(cam_options, null, 4));
	
	cam.start_exposure(cam_options, function (expo_message){
	    
	    console.log("EXPO message : " + JSON.stringify(expo_message));
	    
	    if(expo_message.started){
		return console.log(expo_message.started);
	    }
	    
	    if(expo_message.type=="new_image"){
		//var img=expo_message.content;  BUG HERE!
		var img=cam.last_image; //tbr...
		
		
		var fifi=new fits.file;
		var date=new Date();
		
		fifi.file_name=date.format() +".fits";
		
		console.log("New image captured,  w= " + img.width() + " h= " + img.height() + " type " + (typeof img) + ", writing FITS file " + fifi.file_name );
		
		fifi.write_image_hdu(img);
	    }
	});
    }
    
    
    close_device(cam_id){
	var cam=this.cams[cam_id];
    }
    open_device(cam_id){
	return new Promise(function(ok, fail){
	    var cam=this.cams[cam_id];
	    
	    cam.initialize(cam_id,function (init_message){
		
		console.log("CAM1 Init : " + JSON.stringify(init_message));
		
		
		if(init_message.type=="success") {
		    console.log("CCD INFO : " + JSON.stringify(cam.ccd_info(),null,5));
		    
		    ok(init_message);
		    
		    //console.log(init_message.content + " --> starting exposure.");
		    //take_image(cam,otions);
		    
		    // try{
		    // 	cam1.filter_wheel(1);
		    // }
		    // catch( e){
		    // 	console.log("Cannot move any filterwheel " + e);
		    // }
		}
		if(init_message.type=="info") {
		    ok(init_message);
		};
		
		if(init_message.type=="error") {
		    fail(init_message);
		    //console.log(cam.name + " error : " + init_message.content );
		}
	    });
	});
    }
			   
			   
    

};

return new sbig_driver();
