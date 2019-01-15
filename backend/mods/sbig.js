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

    usb_scan(){
	var sbd=this;
	this.cams={};
	return new Promise(function(ok, fail){
	    sbig.usb_info(function(data){
		
		console.log("USB Info :" + JSON.stringify(data,null,4));
		
		if(data.length==0){
		    console.log("No SBIG camera found!");
		    fail("No SBIG camera found!");
		    return;
		}
		data.forEach(function(cam){
		    sbd.cams[cam.id]=cam;
		    sbd.cams[cam.id].uid=undefined;

		    
		    
		});
		ok(sbd.cams);
	    });
	});
	
    }
    
    constructor(){
	var sbd=this;
	
	this.usb_scan().catch(function(m){});
	
	this.mods={
	    
	    cam_info : function(msg, reply){
	    
		reply(sbd.cams);
	    },
	    
	    usb_scan : function(msg, reply){
		sbd.usb_scan().then(function(cams){
		    reply(cams);
		}).catch(function(m){
		    reply({ error : m});
		});
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
		    
		    sbd.open_device(cid, function(msg){
			console.log("OpenDevice Info " + JSON.stringify(msg.type));
			
			if(msg.type=="success"){
			}
			if(msg.type=="error"){ 
			    console.log("OpenDevice Error " + msg);
			}
			
			if(msg.type=="success"){
			    reply(msg);
			}else
			    reply(msg, true);
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
		    if(cam.dev.shutdown==undefined){
			console.log("ERREUUrre");
			for(var b in cam.dev) console.log("--> " + b);
		    }
		    cam.dev.shutdown(function(msg){
			console.log(cam.name + " SHUTDOWN message : " + JSON.stringify(msg));
			//console.log("UNLOCKED!!OK");
			if(msg.type=="success"){
			    reply({ok : "OK!"});
			    
			    console.log("Cam unlocked");
			}
		    });
		    
		}else
		    reply({ error : "Camera not in use or you are not owner!"});
		
	    },
	    get_cooling_info : function(msg, reply){
		var cid=msg.data.cam_id;
		if(cid===undefined) return reply({ error : "no cid"});
		var cam=sbd.cams[cid];
		if(cam===undefined) return reply({ error : "no cam"});
		if(cam.dev===undefined)return reply({ error : "dev not open"});

		try{
		    var cooling_info=cam.dev.get_temp();
		    //console.log("Getting cooling info " + JSON.stringify(cooling_info));
		    reply(cooling_info);
		}catch(e){
		    reply({error : e});
		}
	    },
	    set_cooling_info : function(msg, reply){
		var cid=msg.data.cam_id;
		if(cid===undefined) return reply({ error : "no cid"});
		var cam=sbd.cams[cid];
		if(cam===undefined) return reply({ error : "no cam"});
		if(cam.dev===undefined)return reply({ error : "dev not open"});

		try{
		    cam.dev.set_temp(msg.data.cooling_info);
		    //console.log("Getting cooling info " + JSON.stringify(cooling_info));
		    reply({});
		}catch(e){
		    reply({error : e});
		}
		
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
	cam.dev.set_temp(opts.cooling_enabled, opts.cooling_setpoint); //Setting temperature regulation 
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
	
	cam.dev.start_exposure(cam_options, function (expo_message){
	    
	    console.log("EXPO message : " + JSON.stringify(expo_message));
	    
	    if(expo_message.started){
		return console.log(expo_message.started);
	    }
	    
	    if(expo_message.type=="new_image"){
		//var img=expo_message.content;  BUG HERE!
		var img=cam.dev.last_image; //tbr...
		
		
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
	if(cam.dev !== undefined){
	    cam.dev.shutdown();
	    delete cam.dev;
	    cam.dev=undefined;
	}
    }
    open_device(cam_id, cb){
	var cam=this.cams[cam_id];
	if(cam.dev !== undefined) cam.dev=new sbig.cam();
	
	//return new Promise(function(ok, fail){

	    
	    
	cam.dev.initialize(cam_id,function (init_message){
	    
	    console.log("CAM1 Init message : " + JSON.stringify(init_message));
	    
	    if(init_message.type=="success") {
		init_message.ccd_info=cam.dev.ccd_info();
		console.log(cam.name + " ready:\n" + JSON.stringify(init_message,null,5));
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
	    };
	    if(init_message.type=="error") {
		//console.log(cam.name + " error : " + init_message.content );
	    }
	    cb(init_message);
	});
	
    }
    
    
    

};

return new sbig_driver();
