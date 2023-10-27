//
//
//
const Electron=require("electron");
const Ipc=Electron.ipcRenderer;
const Remote=Electron.remote;
const Util=require('../js/util');

const ProductName=Remote.require('electron').app.getName();

function Director()
{
    this.cwd=null;
    this.prev_dir=null;
    this.opend_image=null;
    this._lock=null;
    this.image_files={};

    //
    // object caches
    //
    this.win=Remote.getCurrentWindow();

    this.element={};
    this.element.title=document.getElementsByTagName('title')[0];
    this.element.cwd=document.getElementById('cwd');
    this.element.reload_button=document.getElementById('reload-button');
    this.element.list=document.getElementById('list');

    this._add_listeners();
}

Director.prototype._add_listeners=function()
{
    var self=this;
    this.element.cwd.addEventListener('click',function(event){
	this.blur();
	Electron.remote.dialog.showOpenDialog(null,{
	    properties: ['openDirectory'],
	    title: 'Select Folder',
	    defaultPath:self.cwd||'.'
	},(folderNames)=>{
	    if(folderNames)
		self.chdir(folderNames[0]);
	});
    });
    this.element.reload_button.addEventListener('click',
						this.reload.bind(this));

    var Ctrl_r=String.fromCharCode(18);
    window.addEventListener('keypress',function(event){
	switch(event.key){
	case Ctrl_r:
	case 'F5':
	    self.reload();
	    break;
	default:
	    //console.log([event,event.key.charCodeAt()]);
	}
    });

    //
    // add short cut key description to tool tip
    //
    var text=null;
    text=(this.element.reload_button.getAttribute('title')||'')+' [F5]';
    this.element.reload_button.setAttribute('title',text.trim());
    

    // declaring as oneshot event for avoiding re-entrance
    window.addEventListener('resize',function(event){
	self.resize();
	window.addEventListener('resize',arguments.callee,{once:true});
    },{once:true});

}
Director.prototype.resize=function()
{
    var cw,ch;
    [cw,ch]=this.win.getContentSize();
    ch-=document.getElementById('title-bar').offsetHeight;
    //this.element.list_frame.style.width=cw+'px';
    this.element.list.style.height=ch+'px';
}

Director.prototype.render=function(imagelist)
{
    if(this._lock)
	return;

    this._lock=true;

    this.cwd=imagelist.cwd;
    this.element.title.innerText=ProductName+' - '+this.cwd;
    this.element.cwd.innerText=Util.escapeHTML(this.cwd);

    //
    // clear list
    //
    while(this.element.list.firstChild)
	this.element.list.removeChild(this.element.list.firstChild);

    for(var key in this.image_files)
	delete this.image_files[key];

    //
    // draw parent directory
    //
    var parent_dir_element=null;
    if(imagelist.parent_dir){
	var span=document.createElement('span');
	span.setAttribute('class','fa fa-angle-double-up');
	span.setAttribute('aria-hidden','true');
	var dt=document.createElement('dt');
	dt.appendChild(span);
	
	var dd=document.createElement('dd');
	dd.textContent='..';
	
	var dl=document.createElement('dl');
	dl.setAttribute('tabIndex','0');
	dl.appendChild(dt);
	dl.appendChild(dd);
	dl.addEventListener("click",
			    this.chdir.bind(this,imagelist.parent_dir),
			    false);
	this.element.list.appendChild(dl);

	parent_dir_element=dl;
    }

    //
    // draw directories
    //
    var previous_dir_element=null;
    imagelist.dirs.forEach(function(obj){
	var span=document.createElement('span');
	span.setAttribute('class','fa fa-folder-o');
	span.setAttribute('aria-hidden','true');
	var dt=document.createElement('dt');
	dt.appendChild(span);
	
	var dd=document.createElement('dd');
	dd.textContent=Util.escapeHTML(obj.basename);
	
	var dl=document.createElement('dl');
	dl.setAttribute('tabIndex','0');
	dl.appendChild(dt);
	dl.appendChild(dd);
	dl.addEventListener("click",
			    this.chdir.bind(this,obj.path),
			    false);

	if(obj.path==this.prev_dir)
	    previous_dir_element=dl;

	this.element.list.appendChild(dl);
    },this);

    //
    // draw images
    //
    imagelist.images.forEach(function(obj){
	var img=document.createElement('img');
	img.setAttribute('src',obj.path);
	var dt=document.createElement('dt');
	dt.appendChild(img);

	var dd=document.createElement('dd');
	dd.textContent=Util.escapeHTML(obj.basename);
	
	var dl=document.createElement('dl');
	dl.setAttribute('tabIndex','0');
	dl.appendChild(dt);
	dl.appendChild(dd);
	if(obj.has_annotation)
	    dl.setAttribute('class','image has-annotation');
	else
	    dl.setAttribute('class','image');

	dl.addEventListener("click",
			    this.open_image.bind(this,obj.path,dl),
			    false);
	
	this.element.list.appendChild(dl);
	this.image_files[obj.path]=dl;
    },this);

    this.resize();
    this.element.reload_button.removeAttribute('class');

    if(previous_dir_element)
	previous_dir_element.focus();
    else if(parent_dir_element){
	parent_dir_element.focus();
	parent_dir_element.blur(); // for scroll to top
    }

    this._lock=null;
}
Director.prototype.chdir=function(dir)
{
    this.element.reload_button.setAttribute('class','loading');

    this.prev_dir=this.cwd;
    Ipc.send('gallery-chdir',dir);
}
Director.prototype.reload=function()
{
    this.chdir(this.cwd);
}

Director.prototype.open_image=function(path,obj)
{
    Ipc.send('gallery-open-file',path);
    obj.focus();
}


Director.prototype.set_opened_image=function(path)
{
    var obj=this.image_files[path];
    if(obj){
	var str;
	if(this.opened_image){
	    str=this.opened_image.getAttribute('class')||'';
	    this.opened_image.setAttribute('class',str.replace(/opened/,'').trim());
	}

	str=obj.getAttribute('class')||'';
	obj.setAttribute('class',str.trim()+' opened');
	obj.focus();
	this.opened_image=obj;
    }
}    
Director.prototype.unset_opened_image=function(path)
{
    var obj=this.image_files[path];
    if(obj){
	var str=obj.getAttribute('class')||'';
	obj.setAttribute('class',str.replace(/opened/,'').trim());
	obj.blur();
	this.opened_image=null;
    }
}

window.onload=function(){
    document.director=new Director();
    Ipc.on('gallery-cwd-entries',(event,obj)=>{
	document.director.render(obj);
    });
    Ipc.on('gallery-open-file',(event,obj)=>{
	document.director.set_opened_image(obj.path);
    });
    Ipc.on('gallery-close-file',(event,obj)=>{
	document.director.unset_opened_image(obj.path);
    });

    document.director.chdir();
};
