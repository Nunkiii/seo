#!/usr/bin/env node

"use strict";

const fs = require('fs');
const http = require('http');
const glob = require("glob");

const ws=require("../node_modules/ws_protocol_layer/lib/common/ws.js");
const ws_server=require("../node_modules/ws_protocol_layer/lib/node/ws_server.js");


var config = {
    plugin_dir : "mods"
}

class session{

    constructor(address){
	this.address=address;
	this.clients={};
	this.n_clients=0;
	this.id=Math.random().toString(36).substring(2);

    }

    add_client(cli){
	this.clients[cli.id]=cli;
	this.n_clients++;
	cli.session=this;
	if(this.inactive_start!==undefined)
	    delete this.inactive_start;
    }

    remove_client(cli){
	delete this.clients[cli.id];
	this.n_clients--;
	cli.session=undefined;
    }

    broadcast(station, msg,data, bin_data){
	for(var c in this.clients){
	    if(this.clients[c].stations[station]!==undefined)
		this.clients[c].send("system/broadcast", { msg : msg, data: data}, bin_data);
	}
    }

    toString(){
	return "Session[" + this.id +", "+ this.address+", NC="+this.n_clients+"]"; 
    }
};

class session_manager{
    constructor(){
	var sm=this;
	this.sessions={};
	
	setInterval(function(){
	    for(var si in sm.sessions){
		var s=sm.sessions[si];
		var inactive=s.inactive_start;
		if(inactive!==undefined){
		    var delta = new Date() - inactive;
		    console.log("Session Inactive  " + s + " remaining " + 0.001*(20000-delta));
		    //console.log("Delta is " + delta);
		    if(delta > 20000)
			delete sm.sessions[si];
		}else{
		    console.log("Session active:  " + s);
		}
	    }
	}, 5000);
    }

    register_client(cli){
	for(var c in this.sessions){
	    var s=this.sessions[c];
	    if(s.address==cli.request.remoteAddress){
		s.add_client(cli);
		//this.broadcast("monitor","new_client", { peer : cli.get_info() });
		return s;
	    }
	}
	
	var s=new session(cli.request.remoteAddress);
	this.sessions[s.id]=s;
	s.add_client(cli);
	//this.broadcast("monitor","new_client", { peer : cli.get_info() });
	return s;
    }

    release_client(cli){
	var sid=cli.session.id;
	var s=this.sessions[sid];
	console.log("Releasing client " + cli.id + " from session " + s );
	if(s!==undefined){
	    s.remove_client(cli);
	    console.log("Removed "+ cli.id+ " Remains " + s.n_clients + " clients in session " + s);
	    if(s.n_clients==0){
		s.inactive_start=new Date();
	    }
	    
	    //	delete this.sessions[sid];
	    
	}else{
	    console.log("Bug: no session attached to client " + cli.id + " session " + cli.session);
	}
	
    }

    broadcast(station,msg,data, bin_data){
	//console.log("Broadcast " + msg + " : " + JSON.stringify(data));
	var S=this.sessions;
	for(var s in S) S[s].broadcast(station,msg,data,bin_data);
    }
    
};

class seo extends ws_server.server{
    constructor(http_server){
	super(http_server);
	const seo=this;
	this.plugins={};
	this.mongo=require('./mongo.js').mongo;
	
	this.sm=new session_manager();
	
	//this.server=new ws_server.server(this.http_server);
	
	this.on("client_event",function(evt){
	    var cli=evt.client;

	    if(evt.type=="join"){
		seo.sm.register_client(cli);
		console.log((new Date()) + " : Connection "+evt.type+" from origin " + cli.request.remoteAddress + " N=" + seo.nclients);
	    }
	    
	    if(evt.type=="leave"){
		seo.sm.release_client(cli);
		console.log(cli.id + " " + (new Date()) + " : Connection "+evt.type+" N=" + seo.nclients);
	    }
	});

	this.load_plugins();
    }

    load_plugins() {
	var m=this;
	m.require=require;
	glob(config.plugin_dir+"/*.js", function (er, files) {
	    files.forEach(function(f){
		fs.readFile(f, 'utf8', function (err,data) {
		    if (err) {
			console.log(err);
		    }else{
			var func = new Function(data);
			var wname=f.split('.')[0].split('/')[1];
			console.log("Installing plugin [" + wname+"]...");
			
			///var X=func();
			//m.install_mod(func(), wname);
			var p=m.plugins[wname]=func(m);
			if(p.mods!==undefined){
			    m.install_mod(p.mods,wname);
			}
			//console.log("X="+JSON.stringify(X));
		    }
		});
		
	    });
	    // files is an array of filenames.
	    // If the `nonull` option is set, and nothing
	    // was found, then files is ["**/*.js"]
	    // er is an error object or null.
	});
	
    }

};

var http_server=http.createServer(
    function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end("Dummy HTTP response ...");
    }
);

const SEO=new seo(http_server);

var tcp_port=(process.argv.length>2)?process.argv[2]:9999

console.log("SEO: listening on " + tcp_port);
http_server.listen(tcp_port);
