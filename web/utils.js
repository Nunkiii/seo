    /// Utility functions
    
    function ce(n){
	return document.createElement(n);
    }
    
    function cc(n, parent, prep){
	return prep ? parent.prependChild(document.createElement(n)) : parent.appendChild(document.createElement(n));
    }
    
    HTMLElement.prototype.remove_class = function(class_name) {
	this.className =this.className.replace(new RegExp("(?:^|\\s)"+class_name+"(?!\\S)","g"), '' );
	return this;
    };
    
    HTMLElement.prototype.add_class = function(class_name) {
	
	if(!this.has_class(class_name)){
	    if(this.className=="") this.className=class_name; else
		this.className +=' '+class_name;
	}
	return this;
    };
    
    HTMLElement.prototype.has_class=function(cls) {
	return (' ' + this.className + ' ').indexOf(' ' + cls + ' ') > -1;
    }
    
    HTMLElement.prototype.prependChild = function(child) { return this.insertBefore(child, this.firstChild); };


    //==============================================================================================
    //Generic Event system
    
    function new_event(obj, event_name){
	
	if(typeof obj.event_callbacks==='undefined'){
	    obj.event_callbacks=[];

	    obj.listen=function(event_name, cb, persist){
		if(persist===undefined) persist=false;
		var cbn=obj.event_callbacks[event_name];
		
		if(cbn===undefined) {
		    cbn=obj.event_callbacks[event_name]=[]; //throw "No such event " + event_name ;
		}
		
		for(var c=0;c<cbn.length;c++){
		    if(cb===cbn[c]){
			console.log("That function is already listenning to !" + event_name);
			return undefined;
		    }
		};
		cb.persist=persist;
		cbn.push(cb);
		if(obj.name=="Parameters")
		    console.log(obj.name + " : new listener for ["+event_name+"] persist " + persist + " N= " + cbn.length);
		return this;
	    };

	    obj.unlisten=function(event_name, cb){
		var cbn=obj.event_callbacks[event_name];
		if(typeof cbn=='undefined') 
		    throw "unlisten: no such event " + event_name ;
		for( var c=0;c<cbn.length;c++) {
		    if(cbn[c]==cb){
			//console.log("Found CB to be removed..");
			cbn.splice(c,1);//remove(c);
			return obj;
		    }
		}
		throw "unlisten: callback not found " ;
		return undefined;
	    }
	    
	    obj.trigger=function(event_name, data,data2){
		var cbs=obj.event_callbacks[event_name];
		if(typeof cbs=='undefined')
		    cbs=obj.event_callbacks[event_name]=[]; //throw "No such event " + event_name ;
		
		// if(event_name=="data_loaded") 
		// 	console.log(obj.name + " : trigger event [" + event_name +"] to " + cbs.length +" listeners");
		
		cbs.forEach(function(cb){
		    cb.call(obj,data,data2);
		});
		return obj;
	    };

	    obj.has_event=function(event_name){
		return obj.event_callbacks[event_name]!==undefined;
	    }
	}
	
	
	if(obj.event_callbacks[event_name]===undefined){
	    obj.event_callbacks[event_name]=[];
	    
	    // if(obj.name=="Parameters"){
	    //     //console.log("Creating callback for event ["+event_name+"] on " + obj.name  );
	    //     //for (var e in obj.event_callbacks) console.log("     -->Event " + e + " NL=" + obj.event_callbacks[e].length );
	    // }

	    
	}
    }

    //==============================================================================================
    // creates a global "addWheelListener" method
    // example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );

    (function(window,document) {
	
	var prefix = "", _addEventListener, onwheel, support;
	
	// detect event model
	if ( window.addEventListener ) {
            _addEventListener = "addEventListener";
	} else {
            _addEventListener = "attachEvent";
            prefix = "on";
	}
	
	function wheel(e) {
	    preventDefault(e);
	}
	
	window.disable_scroll=function() {
	    if (window.addEventListener) {
		window.addEventListener('DOMMouseScroll', wheel, false);
	    }
	    window.onmousewheel = document.onmousewheel = wheel;
	    //document.onkeydown = keydown;
	}
	
	window.enable_scroll=function() {
	    if (window.removeEventListener) {
		window.removeEventListener('DOMMouseScroll', wheel, false);
	    }
	    window.onmousewheel = document.onmousewheel /*= document.onkeydown*/ = null;
	}
	
	
	// detect available wheel event
	support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
	document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
	"DOMMouseScroll"; // let's assume that remaining browsers are older Firefox
	
	window.addWheelListener = function( elem, callback, useCapture ) {
            _addWheelListener( elem, support, callback, useCapture );
	    
            // handle MozMousePixelScroll in older Firefox
            if( support == "DOMMouseScroll" ) {
		_addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
            }
	};
	
	function preventDefault(e) {
	    e = e || window.event;
	    if (e.preventDefault)
		e.preventDefault();
	    e.returnValue = false;
	}
	
	function _addWheelListener( elem, eventName, callback, useCapture ) {
            elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
		!originalEvent && ( originalEvent = window.event );
		
		// create a normalized event object
		var event = {
                    // keep a ref to the original event object
                    originalEvent: originalEvent,
                    target: originalEvent.target || originalEvent.srcElement,
                    type: "wheel",
                    deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                    deltaX: 0,
                    delatZ: 0,
		    preventDefault: preventDefault(originalEvent)
		};
		
		// calculate deltaY (and deltaX) according to the event
		if ( support == "mousewheel" ) {
                    event.deltaY = - 1/40 * originalEvent.wheelDelta;
                    // Webkit also support wheelDeltaX
                    originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
		} else {
                    event.deltaY = originalEvent.detail;
		}
		
		// it's time to fire the callback
		return callback( event );

            }, useCapture || false );
	}
	
    })(window,document);
