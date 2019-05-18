"use strict";

var seo=arguments[0];

class db extends seo.mongo{

    constructor(){
	super();
	var db=this;
	this.mods={

	    bootstrap : function(msg, reply){
		db.bootstrap.then(function(){
		    reply({ status : "done"});
		});
	    },

	    templates : function(msg, reply){
		//console.log("Reply " + JSON.stringify(db.templates.find({}).toArray));
		db.templates.find({},{template_name : 1}).toArray().then(function(data){
		    reply(data);
		});
	    },

	    collections : function(msg, reply){
		//console.log("Reply " + JSON.stringify(db.templates.find({}).toArray));
		db.collections.find({}).toArray().then(function(data){
		    reply(data);
		});
	    },

	    get_template : function(msg, reply){
		db.templates.findOne({template_name:msg.data.template_name}).then(function(data){
		    reply(data);
		}).catch(function(e){
		    reply({ error : e});
		});
	    },

	    get : function(msg, reply){
		
		db.get_collection(msg.data).then(function(collection){
		    if(collection==null)
			return reply({ error : "No such collection " });
		    
		    db.get_database(collection).then(function(database){
			if(database==null)
			    return reply({ error : "No such database " });
			
			var db_object=db.client.db(database.database_name);
			var collection_object=db_object.collection(collection.collection_name);
			var query=msg.data.query;
			if(query===undefined) query={};
			var options=msg.data.options;
			if(options===undefined) options={};
			
			var cursor=collection_object.find(query,options);

			cursor.toArray().then(function(results){
			    console.log("R=" + JSON.stringify(results));
			    reply(results);
			}).catch(function(e){
			    reply({ error : "Not found :" + e});
			});
			
		    }).catch(function(e){
			reply({ error : "Invalid database : " + e});
		    });
		    
		}).catch(function(e){
		    reply({ error : "Invalid collection : "+  e});
		});
	    },

	    create_collection : function(msg, reply){

		var dbn=msg.data.dbname;
		var collection_name=msg.data.collection_name;
		var collection_template=msg.data.collection_template;
		var cursor=db.collections.find({ collection_name : collection_name });
		cursor.count().then(function(n){
		    if(n!==0){
			reply({ error : "Collection already exists!"});
		    }else{
			db.get_template(collection_template).then(function(template_object){
			    if(template_object==null) return reply({ error : "Template not found"});
			    
			    var doc=db.build_document(template_object.template_code, { collection_name : collection_name, collection_template : collection_template });
			    db.collecions.insertOne(doc).then(function(){
				reply({});
			    }).catch(function(e){
				reply({ error : "Error insert template " + e});
			    });
			}).catch(function(e){
			    console.log("Error looking for template " + e);
			    reply({ error : "Error looking for template " + e});
			});

		    }
		}).catch(function(e){
		    console.log("Errror "+e);
		    reply({ error : e});
		});
	    },

	    new_object : function(msg, reply){
		
	    },

	    info : function(msg, reply){
		var dbn=msg.data.dbname;
	    }
	    
	    
	};
	
	this.startup().then(function(client){
	    
	    db.system=db.client.db("seo_system");

	    db.templates=db.system.collection("templates");
	    db.collections=db.system.collection("collections");
	    db.databases=db.system.collection("databases");

	    db.bootstrap().then(function(){
		db.templates.find({}).toArray().then(function(cursor){
		    console.log("BOOT " + cursor + ": "+ JSON.stringify(cursor));
		});
	    });
	});
    }

    
    build_document(template, data, doc){
	if(doc===undefined) doc={};
	for(let k in template){
	    if(data[k]!==undefined){
		if(k==="objects"){
		    doc[k]={};
		    build_document(template[k],data[k],doc[k]);
		}else
		    doc[k]=data[k];
		
	    }
	    
	}

	return doc;
    }
    
    async get_template(template_name){
	var object= await this.templates.findOne({ template_name : template_name});
	console.log("Found template " + JSON.stringify(object));
	return object;
    }
    
    async read(options){
    }

    async write(options, docs){	
    }
    
    async create_collection(database, collection_name, template){
    } 

    async get_database(options){
	var database= await this.databases.findOne({database_name:options.database_name});
	if(database==null)
	    throw("No such database "+options.database_name);
	return database;
    }

    async get_collection(options){
	var collection= await this.collections.findOne({collection_name:options.collection_name});
	if(collection==null)
	    throw("No such collection "+options.collection_name);
	return collection;
	
    }
    
    async get_template(options){
	var template= await this.templates.findOne({collection_name:options.template_name});
	if(template==null)
	    throw("No such template "+options.template_name);
	return template;
    }
    
    async create_doc(options, data){
	var database=await get_database(options);
	var collection=await get_collection(options);
	var template=await get_template(options);
	    
	var db_object=db.client.db(database.database_name);
	var collection_object=db_object.collection(collection.collection_name);
	
	
	var doc=this.build_document(JSON.parse(template.template_code), data );

	var result=await collecion_object.insertOne(doc);
	return result;
    }
    
    async bootstrap(){
	var db=this;
	
	var template_tpl = {
	    template_name : {
		name : "Template name",
		type : "string"
	    },
	    template_desc : {
		name : "Template description",
		type : "text"
	    },
	    template_code : {
		name : "Template JSON code",
		type : "json"
	    }
	};
	
	var collection_tpl = {
	    collection_name : {
		name : "Collection name",
		type: "string"
	    },
	    database_name : {
		name : "Database name",
		type: "string"
	    },
	    collection_desc : {
		name : "Collection description",
		type: "text"
	    },
	    collection_template : {
		name : "Collection's template name",
		type : "text"
	    }
	};

	var database_tpl = {
	    database_name : {
		name : "Database name",
		type: "string"
	    },
	    database_desc : {
		name : "Database description",
		type: "text"
	    },
	    database_host : {
		name : "Host name",
		type : "string"
	    },
	    database_port : {
		name : "Host TCP port",
		type : "number"
	    }
	};

	this.templates.drop();
	this.collections.drop();
	this.databases.drop();
	
	var doc = this.build_document(template_tpl,
                                      { template_name : "template",
                                        template_desc : "Template of a template.",
                                        template_code: JSON.stringify(template_tpl,null,5)
                                      });
	
	await this.templates.findOneAndUpdate({ template_name : "template" }, { $set: doc}, { upsert : true});
	
	doc = this.build_document(template_tpl,
                                  { template_name : "collection",
                                    template_desc : "Template of a collection.",
                                    template_code: JSON.stringify(collection_tpl,null,5)
                                  });
        
	await this.templates.findOneAndUpdate({ template_name : "collection" }, { $set: doc}, { upsert : true});

	doc = this.build_document(template_tpl,
                                  { template_name : "database",
                                    template_desc : "Template of a database.",
                                    template_code: JSON.stringify(database_tpl,null,5)
                                  });
        
	await this.templates.findOneAndUpdate({ template_name : "database" }, { $set: doc}, { upsert : true});
	
	doc = this.build_document(database_tpl,
                                  { database_name : "seo_system",
                                    database_desc : "System database"
                                  });

	await this.databases.findOneAndUpdate({ database_name : "seo_system" }, { $set: doc}, { upsert : true});
	
	doc = this.build_document(database_tpl,
                                  { database_name : "seo_data",
                                    database_desc : "User collection data"
                                  });

	await this.databases.findOneAndUpdate({ database_name : "seo_data" }, { $set: doc}, { upsert : true});

	doc = this.build_document(collection_tpl,
                                  { collection_name : "collections",
                                    database_name : "seo_system",
                                    collection_desc : "System collections",
                                    collection_template : "collection"
                                  });

	await this.collections.findOneAndUpdate({ collection_name : "collections" }, { $set: doc}, { upsert : true});

	doc = this.build_document(collection_tpl,
                                  { collection_name : "data_collections",
                                    database_name : "seo_system",
                                    collection_desc : "Data collections",
                                    collection_template : "collection"
                                  });

	await this.collections.findOneAndUpdate({ collection_name : "data_collections" }, { $set: doc}, { upsert : true});

	doc = this.build_document(collection_tpl,
                                  { collection_name : "databases",
                                    database_name : "seo_system",
                                    collection_desc : "Databases",
                                    collection_template : "database"
                                  });

	await this.collections.findOneAndUpdate({ collection_name : "databases" }, { $set: doc}, { upsert : true});

	doc = this.build_document(collection_tpl,
                                  { collection_name : "templates",
                                    database_name : "seo_system",
                                    collection_desc : "Database templates",
                                    collection_template : "template"
                                  });

	await this.collections.findOneAndUpdate({ collection_name : "templates" }, { $set: doc}, { upsert : true});
	
	return;
    }
    
};

return new db();
