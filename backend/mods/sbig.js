"use strict"

var seo = arguments[0];

const EventEmitter = seo.require('events').EventEmitter

var fits = seo.require('../../node-sbig/node_modules/node-fits/build/Release/fits.node');
var sbig = seo.require('../../node-sbig/build/Release/sbig.node');

var last_image_fname="";

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
	},

	files : {
	    name : "Files",
	    objects : {

	    }
	    
	}
    }
};

var file_tpl = {

    name : "Astro Image",
    
    objects : {
	
	file_name : {
	    name : "File",
	    type: "string"
	},
	snap : {
	    name : "Snapshot",
	    type : "binary"
	},
	ob : {
	    name : "Observation Block",
	    type : "link"
	}
    }
}



function image_reply(name, image, func){
    return func( { width : image.width(), height: image.height()}, [{ name : name, data : image.get_data()}] );
}


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
	
	this.usb_scan().catch(function(m){

	});
	
	this.mods={
	    
	    cam_info : function(msg, reply){
		var rep={};
		for(var c in sbd.cams){
		    rep[c]={ id : sbd.cams[c].id, name : sbd.cams[c].name, serial: sbd.cams[c].serial, uid :sbd.cams[c].uid };
		}
		console.log("Cam info : " + JSON.stringify(rep));
		
		reply(rep);
	    },
	    
	    usb_scan : function(msg, reply){
		sbd.usb_scan().then(function(cams){
		    reply(cams);
		}).catch(function(m){
		    reply({ error : m});
		});
	    },
	    use_camera : function(msg, reply){
		let cid=msg.data.cam_id;
		let cam=sbd.cams[cid];
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


			if(cam.temp_report!==undefined) clearInterval(cam.temp_report);
			
			cam.temp_report=setInterval(function(){
			    if(cam.dev!==undefined){
				try{
				    var cooling_info=cam.dev.get_temp();
				    console.log("cam "+cid + ": Cooling info : " + JSON.stringify(cooling_info));
				    seo.sm.broadcast("sbig","temp_report", { cid: cid, cooling_info : cooling_info});
				}
				catch(e){
				    seo.sm.broadcast("sbig","temp_report", { cid: cid, cooling_info : { error : e.toString()}});
				    clearInterval(cam.temp_report);
				}
			    }else
				clearInterval(cam.temp_report);
			    
			}, 5000);
		    });
		    
		}else
		    reply({ error : "Camera is in use!"});

		
	    },
	    release_camera : function(msg, reply){
		var cid=msg.data.cam_id;
		var cam=sbd.cams[cid];
		
		if(cam===undefined)
		    return reply({ error : "No such camera!"});

		if(cam.temp_report!==undefined) clearInterval(cam.temp_report);
		
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
		    console.log("setting cooling info " + JSON.stringify(msg.data.cooling_info));
		    cam.dev.set_temp(msg.data.cooling_info.enabled,msg.data.cooling_info.setpoint);
		    reply({});
		}catch(e){
		    reply({error : e.toString()});
		}
		
	    },
	    get_ob_template : function(msg, reply){
		reply(ob_tpl);
	    },
	    get_last_image : function(msg, reply){
		var cam_id=msg.data.cam_id;
		var cam=sbd.cams[cam_id];
		if(cam.dev!==undefined){
		var image=cam.dev.last_image;
		if(image!==undefined){
		    reply({ width : image.width(), height: image.height()}, [{ name : last_image_fname, data : cam.dev.last_image.get_data()}] );
		}else
		    reply({ error : "No image!"});
		}else
		    reply({ error : "No dev!"});
	    },
	    submit_ob : function(msg, reply){
		var cam_id=msg.data.cam_id;
		var cam=sbd.get_locked_cam(this, cam_id);
		if(cam===undefined){
		    return reply({ error : "Camera is in use"});
		    
		}
	//	console.log("Ok, we are owner of cam " + cam.name +" Executing OB " + JSON.stringify(msg.data.ob, null, 10));

		sbd.take_image(cam_id, msg.data.ob, function(expo_message){

		    console.log("Expo message : " +  expo_message.type );
		    
		    switch(expo_message.type){
			
		    case "expo_progress":
			console.log("Expo progress " +  expo_message.content );
			seo.sm.broadcast("sbig","expo_progress",
					 {
					     uid : cam.uid,
					     cid: cam_id,
					     progress : expo_message.content
					 }
					);
			
			break;
		    case "grab_progress":
			console.log("Grab progress " +  expo_message.content );
			seo.sm.broadcast("sbig","grab_progress",
					 {
					     uid : cam.uid,
					     cid: cam_id,
					     progress : expo_message.content
					 }
					);
			
			break;
			
		    case "new_image":
			var image=expo_message.content;
//			    cam.dev.last_image; //

			image.swapx();
			
			var idata=image.get_data();
			
			//console.log("New image: Broadcasting to peers ! Bytes="+idata.length);
			//var idata=cam.dev.last_image.get_data(); //image.get_data();
			
			console.log("Data check... " + idata[0] + ", " + idata[1]);
			//console.log("Data check... UINT " + idata.readInt16LE(0) + ", " +  idata.readInt16LE(2));

			var date=new Date();
			var fname="Nunki_Monitor";

			if(cam.expo_mode=="exposure"){
			    
			    fname="NUNKI."+date.getUTCFullYear()+"-"+(date.getUTCMonth()+1)+"-"+date.getUTCDate()+"T"
				+date.getUTCHours()+":"+date.getUTCMinutes()+":"+date.getUTCSeconds()+"."+date.getUTCMilliseconds()+".fits";
			    
			    
			    
			    
			    //var img=image; //cam.dev.last_image;
			    //console.log("Fits creation...");
			    
			    var fifi=new fits.file;
			    
			    fifi.file_name=fname;
			    
			    console.log("New image captured,  w= " + image.width() + " h= " + image.height() + " , Date "  + date + " month " + date.getUTCMonth() + " : writing FITS file " + fifi.file_name );
			    
			    fifi.write_image_hdu(image);

			}
			last_image_fname=fname;
			    
			seo.sm.broadcast("sbig","image",
					 {
					     uid : cam.uid, cid: cam_id,
					     width : image.width(),
					     height: image.height()
					 },
					 [{date: date,  name : fname, data : idata}]
					);
			
			
			// console.log("EX DATA : L= " + idata.length );
			// for(var i=0;i<20;i++)
			// 	console.log("Data " + i + " = " + idata[i] );
			reply({ date: date, file_name : fname});
			//reply({ width : image.width(), height: image.height()}, [{ name : "imaging_data", data : idata}] );
			
			
			break;
		    default: break;
		    }
		    
		    
		});

		
	    },

	    abort : function(msg, reply){
		var cam_id=msg.data.cam_id;
		var cam=sbd.get_locked_cam(this, cam_id);
		if(cam===undefined){
		    return reply({ error : "Camera is in use"});
		    
		}
		cam.dev.stop_exposure();
		reply({});
	    }
	}
    }
    
    set_cooling(cam_id, opts){
	
	var cam=this.cams[cam_id];
	cam.dev.set_temp(opts.cooling_enabled, opts.cooling_setpoint); //Setting temperature regulation 
	console.log("Cam cooling info = " + JSON.stringify(cam.get_temp()));
    }
    
    
    take_image(cam_id, opts, cb){

	var expo_mode=this.expo_mode=opts.mode;
	var ccd_opts=opts.objects.ccd_settings.objects;
	var obj_opts=opts.objects.object_settings.objects;

	//console.log("Take image CCD OPTS = " + JSON.stringify(ccd_opts,null,5));
	//console.log("Take image OBJ OPTS = " + JSON.stringify(obj_opts,null,5));

	console.log("Take Image " + expo_mode);
	
	var cam=this.cams[cam_id];
	
	
	
	var cam_options = {
	    
	    exptime : obj_opts.exptime.value,
	    nexpo : obj_opts.nexpo.value,
	    fast_readout : true,
	    dual_channel : true,
	    //light_frame: true,
	    readout_mode: ccd_opts.binning.value+"x"+ccd_opts.binning.value
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
	
	switch(obj_opts.imagetype){
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

	console.log("Starting exposure " + JSON.stringify(cam_options, null, 4));

	// const emitter = new EventEmitter();

	// emitter.on('grab', (pc) => {
	//     console.log('### GRAB ...' + pc);
	// })
	// emitter.on('data', (evt) => {
	//     console.log(evt);
	// })
	
	// emitter.on('end', () => {
	//     console.log('### END ###')
	// })
	
	if(expo_mode == "exposure"){
	    cam.dev.start_exposure(cam_options, cb).then(function(msg){
		console.log("Exposure Promise done ! " + JSON.stringify(msg));
	    }).catch(function(e){
		console.error("Exposure Error SBIG " + e);
	    });
	}else 	if(expo_mode == "monitor"){
	    cam.dev.monitor(cam_options, cb).then(function(msg){
		console.log("Monitor Promise done ! " + JSON.stringify(msg));
	    }).catch(function(e){
		console.error("Monitor Error SBIG " + e);
	    });
	}
	
	    
	
	// cam.dev.start_exposure(cam_options, function (expo_message){
	    
	//     console.log("EXPO message : " + JSON.stringify(expo_message));
	    
	//     if(expo_message.started){
	// 	console.log("Started !");
	// 	return console.log(expo_message.started);
	//     }
	    
	//     if(expo_message.type=="new_image"){
	// 	//var img=expo_message.content;  BUG HERE!
	// 	console.log("NEW IMAGE !!");
	// 	var img=cam.dev.last_image; //tbr...
	// 	cb({ image : img });
	// 	//var idata=img.get_data();
		
		
	// 	/*
	// 	var fifi=new fits.file;
	// 	var date=new Date();
		
	// 	fifi.file_name=date.format() +".fits";
		
	// 	console.log("New image captured,  w= " + img.width() + " h= " + img.height() + " type " + (typeof img) + ", writing FITS file " + fifi.file_name );
		
	// 	fifi.write_image_hdu(img);
	// 	*/
	//     }
	// });
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

	    
	    
	cam.dev.initialize(cam_id).then(function (init_message){
	    //init_message.ccd_info=cam.dev.ccd_info();
	    console.log(cam.name + " ready:\n" + JSON.stringify(init_message,null,5));
	    if(init_message.type=="info") {
	    }
	    cb(init_message);
	}).catch(function(){
	    console.log(cam.name + " error : " + init_message.content );
	});
	
    }
    
    
    

};

return new sbig_driver();
