"use strict";

var seo = arguments[0];

const EventEmitter = seo.require('events').EventEmitter;

var fits = seo.require('../node_modules/node-fits/build/Release/fits.node');
var sbig = seo.require('../node_modules/node-sbig/build/Release/sbig.node');

var last_image_fname="";

var ob_tpl = {
    
    name : "Observation Block",
    
    objects : {
	
	object_settings : {	    
	    objects : {
		
		imagetyp : {
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
		},
		observer : {
		    name : "Observer name",
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
			x_init : {
			    name : "X0",
			    type : "number"
			},
			y_init : {
			    name : "Y0",
			    type : "number"
			},
			x_final : {
			    name : "XF",
			    type : "number"
			},
			y_final : {
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
		if(cam.dev===undefined) return reply({ error : "dev not open"});

		try{
		    var cooling_info=cam.dev.get_temp();

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
		    cam.dev.set_temp(msg.data.cooling_info.enabled, msg.data.cooling_info.setpoint);
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
		    reply({
                        width : image.width(),
                        height: image.height()},
                          [
                              { name : last_image_fname,
                                data : cam.dev.last_image.get_data()
                              }
                          ]
                         );
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

		var date=new Date();
		var cooling_info=cam.dev.get_temp();
		
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

			image.swapx();

			var idata=image.get_data();

			console.log("New image received : Data check... " + idata[0] + ", " + idata[1] + " Expo mode " + cam.mode);
			
			var fname="Nunki_Monitor";

			if(cam.mode=="exposure"){
			    
			    var date_end = new Date();
			    fname="NUNKI."+date_end.toISOString()+".fits";
			    
			    var fifi=new fits.file;
			    
			    fifi.file_name=fname;

			    console.log("Writing FITS file, size="+image.width()+ "x" + image.height() + " : File " + fifi.file_name );
			    
			    fifi.write_image_hdu(image);

			    var fits_keys=[];
			    function write_ob_key(key, obdata, path){

				fits_keys.push({
				    key: key.toUpperCase(),
				    value: obdata.type=="number" ? (obdata.value*1.0) : obdata.value,
				    comment: obdata.name
				});
			    }
			    
			    function parse_ob(obdata,key){

				if(obdata.objects!==undefined){

				    for(var key in obdata.objects){

					parse_ob(obdata.objects[key],key);
				    }					
				    
				}
				if(obdata.value!==undefined)
				    write_ob_key(key, obdata);									
			    }

			    var obdata=msg.data.ob; //JSON.parse(msg.data.ob);
			    parse_ob(obdata, "root");
                            
			    var obj_opts=obdata.objects.object_settings.objects;
			    if(	obj_opts.filter.value != undefined &&
                                ( obj_opts.imagetyp.value != "bias" &&
                                  obj_opts.imagetyp.value !="dark" )
                              ){
			    	fits_keys.push({
				    key: "FILTER",
				    value: obj_opts.filter.value, 
				    comment: "Filter"
				});
                            }else{
                                fits_keys = fits_keys.filter(obj => obj.key !== "FILTER"); 
                            }
                            
			    if( obj_opts.imagetyp.value == "bias" ){
                                 fits_keys = fits_keys.filter(obj => obj.key !== "EXPTIME"); 
                            }
			    
			    fits_keys.push({
				key: "DATE-OBS",
				value: date.toISOString(), 
				comment: "Observation start time"
			    });
			    
			    fits_keys.push({
				key: "CCDTEMP",
				value: Math.floor(cooling_info.ccd_temp*100.0)/100.0, 
				comment: "CCD temperature at the end of exposure"
			    });
                            
			    fits_keys.push({
			        key: "IMAGETYP",
			        value: obj_opts.imagetyp.value.toUpperCase(),
			        comment: "Image type"
			    });
                            
			    fifi.set_header_key(fits_keys, function(){
				//console.log("Done writing keys !");
			    });			    
			    
			}
			
			last_image_fname=fname;

			seo.sm.broadcast("sbig","image",
					 {
					     uid : cam.uid,
                                             cid: cam_id,
					     width : image.width(),
					     height: image.height()
					 },
					 [
                                             {
                                                 date: date,
                                                 name : fname,
                                                 data : idata
                                             }
                                         ]
					);

			reply({ date: date, file_name : fname});

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
            
	};
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

	var cam=this.cams[cam_id];
	cam.mode=expo_mode;

	console.log("CAM["+cam_id+"] Take Image MODE : " + cam.mode);

	var cam_options = {
	    expo_mode: opts.mode,
	    exptime : obj_opts.imagetyp.value=="bias" ? 0 : obj_opts.exptime.value,
	    nexpo : obj_opts.nexpo.value,
	    fast_readout : true,
	    dual_channel : true,
	    readout_mode: ccd_opts.binning.value+"x"+ccd_opts.binning.value
	};
        
	if(	obj_opts.filter.value != undefined &&
                ( obj_opts.imagetyp.value != "bias" &&
                  obj_opts.imagetyp.value !="dark" )
          ){

	    var filters = { // Filters configuration
		U : 1,
		B : 2,
		V : 3,
		R : 4,
		I : 5
	    };
	    
	    try{
		cam.dev.filter_wheel( filters[obj_opts.filter.value]);
	    }
	    catch( e){
		console.log("Sorry, Cannot move any filter wheel " + e);
	    }            
            console.log("Setting filter");
        }else{
            console.log("Don't setting filter");
        }
	
	switch(obj_opts.imagetyp.value){
	case "science":
	case "flat":
	    cam_options.light_frame= true;
	    break;
	case "dark":
	    cam_options.light_frame= false;
            break;
	case "bias":
	    cam_options.light_frame= false;
	    cam_options.exptime = 0;
	    break;
	default: break;
	}
        
	switch(ccd_opts.frametyp.value){
	case "full":
	    delete ccd_opts.subframe;
	    break;
	case "crop":
	    break;
	case "custom":
	    var sf=ccd_opts.subframe.objects;
	    cam_options.subframe = [
                sf.x_init.value, // nLeft
                sf.y_init.value, // nTop
                sf.x_final.value - sf.x_init.value, // nWidth
                sf.y_final.value - sf.y_init.value // nHeight
            ];
	    break;
	default: break;
 	};

	console.log("Starting exposure " + JSON.stringify(cam_options, null, 4));

	if(expo_mode == "exposure"){
	    cam.dev.start_exposure(cam_options, cb).then(function(msg){
		console.log("Exposure Promise done ! " + JSON.stringify(msg));
	    }).catch(function(e){
		console.error("Exposure Error SBIG " + e);
	    });
	} else if(expo_mode == "monitor"){
	    cam.dev.monitor(cam_options, cb).then(function(msg){
		console.log("Monitor Promise done ! " + JSON.stringify(msg));
	    }).catch(function(e){
		console.error("Monitor Error SBIG " + e);
	    });
	}

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
