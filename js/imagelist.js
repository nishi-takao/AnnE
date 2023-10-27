//
//  
//
"use strict";

const FS=require('fs');
const Path=require('path');
const FileType=require('file-type');
const ImageSize=require("image-size");

const ImageFileExtRegexp=/\.((gif)|(jpg)|(jpeg)|(png))/i;
const AnnoFileExt='.json';

////////////////////////////////////////////////////////////////////////
//
//
//
function ImageItem(fn,is_dir)
{
    this.path=fn;
    if(is_dir)
	this.is_dir=true;
    else{
	this.is_dir=false;
	this.annotation_path=this.img2ann(fn);
	this.has_annotation=FS.existsSync(this.annotation_path);
    }
};

ImageItem.prototype.img2ann=function(fn)
{
    var dir=Path.dirname(fn);
    var ext=Path.extname(fn);
    var basename=Path.basename(fn,ext);

    return Path.resolve(Path.join(dir,basename+AnnoFileExt));
};

ImageItem.prototype.basename=function()
{
    return Path.basename(this.path);
};

ImageItem.prototype.image_size=function()
{
    if(!this.img_sz)
	this.img_sz=ImageSize(this.path);

    return this.img_sz;
}

ImageItem.prototype.read_image=function()
{
    var content=FS.readFileSync(this.path);
    var ft=FileType(content);
    
    return 'data:'+ft.mime+';base64,'+content.toString('base64');
};

ImageItem.prototype.read_annotation=function()
{
    var anno=null;

    if(this.annotation_path){
	FS.readFile(this.path,function(err,content){
	    if(err){
		errCallback(err);
		return;
            }

	    anno=JSON.parse(content);
	});
    }

    return anno;
};

ImageItem.prototype.write_annotation=function(anno)
{
    if(!this.annotation_path)
	this.annotation_path=self.img2ann(this.path);

    FS.writeFile(this.annotation_path,
		 JSON.stringify(anno,null,"\t"),
		 (err)=>{
		     if(err)
			 throw err;
		 });
};
ImageItem.prototype.dump=function(opt)
{
    var obj={
	is_dir:this.is_dir,
	path:this.path,
	basename:this.basename(),
    };

    if(!this.is_dir){
	obj.annotation_path=this.annotation_path;
	obj.has_annotation=this.has_annotation;

	if(opt){
	    if(opt.with_size)
		obj.image_size=this.image_size();
	}
    }

    
    return obj;
}


////////////////////////////////////////////////////////////////////////
//
//
//
function ImageList(dir)
{
    this.cwd=".";
    this.dirs=[];
    this.images=[];
    if(dir)
	this.scan(dir);
};

ImageList.prototype.scan=function(dir)
{
    var self=this;
    this.cwd=Path.resolve(dir);
    this.dirs.length=0;
    this.images.length=0;

    var files=FS.readdirSync(this.cwd);
    files.forEach(function(fn){
	var fullpath=Path.resolve(Path.join(dir,fn));
	var stat;
	try{
	    stat=FS.statSync(fullpath);
	}
	catch(err){}
	
	if(stat){
	    if(stat.isDirectory()){
		self.dirs.push(new ImageItem(fullpath,true));
	    }
	    else if(stat.isFile()){
		var ext=Path.extname(fn);
		if(ext.match(ImageFileExtRegexp))
		    self.images.push(new ImageItem(fullpath,false));
	    }
	}
    });

    return this;
};

ImageList.prototype.is_root_dir=function()
{
    return this.cwd===Path.resolve(this.cwd,'..');
}

ImageList.prototype.parent_dir=function()
{
    return Path.resolve(this.cwd,'..');
}

ImageList.prototype.path_join=function(fn)
{
    return Path.resolve(this.cwd,fn);
}
ImageList.prototype.get_item_by_path=function(path)
{
    var sz=this.images.length;
    for(var i=0;i<sz;i++){
	if(this.images[i].path==path){
	    return this.images[i];
	    break;
	}
    }

    return null;
}

ImageList.prototype.dump=function()
{
    return {
	cwd:this.cwd,
	parent_dir: this.is_root_dir()?null:this.parent_dir(),
	dirs:this.dirs.map(function(d){ return d.dump(); }),
	images:this.images.map(function(d){ return d.dump(); })
    };
    
}
module.exports=ImageList;
