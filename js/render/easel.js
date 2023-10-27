//
//
//
const Electron=require("electron");
const Ipc=Electron.ipcRenderer;
const Remote=Electron.remote;
const SVGEditor=require('../js/render/SVGEditor');
const Observer=require('../js/observer');
const Util=require('../js/util');

const ProductName=Remote.require('electron').app.getName();

const MIN_ZOOM_SCALE=0.05;
const MAX_ZOOM_SCALE=8.00;
const MIN_IMG_PIXEL_SZ=32;

const MIN_BORDER_SIZE=1;
const MAX_BORDER_SIZE=99;


////////////////////////////////////////////////////////////////////////
//
// view director
//
function Director()
{
    this.base_image=null;
    this.image_sz=null;

    this.title_bar_opend=true;
    this.side_menu_opened=false;
    this.context_menu_opened=false;

    this.zoom_scale=-1.0; // <=0: auto scale; else indicated scale
    this.current_scale=null;
    this.zoom_scale_min_limit=null;

    this.editor=new SVGEditor(this,document.getElementById('draw-area'));

    //
    // object caches
    //
    this.win=Remote.getCurrentWindow();

    this.element={};
    this.element.title=document.getElementsByTagName('title')[0];
    this.element.menu_guard=document.getElementById('menu-guard');
    this.element.side_menu=document.getElementById('menu');
    this.element.menu_button=document.getElementById('menu-button');

    this.element.menu_edit_mode=document.getElementById('menu-mode');

    this.element.picture_frame=document.getElementById('picture-frame');

    //
    // custom cursor
    //
    this.cursor_shape=new Object();
    this.cursor_shape.rotate=this._fa_cursor('\uf021',{origin:"10 10"});
    //this.cursor_shape.triangle=this._fa_cursor('\uf04b',{origin:"0 0"});
    this.cursor_shape.angle=this._fa_cursor('\uf053',
					    {deg:45,origin:"3 3"});
    this.cursor_shape.plus=this._fa_cursor('\uf067',{origin:"10 10"});

    this._add_listeners();

    Observer.prototype.constructor.call(this,this.container);
    this.add_downstream(this.editor);
}
Observer.mixin(Director);

Director.prototype._add_listeners=function()
{
    var self=this;

    this.element.menu_button.addEventListener('click',function(event){
	event.stopPropagation();
	self.toggle_side_menu();
    });

    this.element.menu_guard.addEventListener('click',function(event){
	event.stopPropagation();
	if(self.side_menu_opened)
	    self.hide_side_menu();
    });
    this.element.side_menu.addEventListener('click',function(event){
	event.stopPropagation();
    });


    if(this.editor.config.allow_shape.box){
	document.getElementById('menu-shape-box')
	    .addEventListener('click',function(event){
		self.editor.set_draw_mode('box');
	    });
    }
    else{
	document.getElementById('menu-shape-box')
	    .setAttribute('class','disable');
    }

    if(this.editor.config.allow_shape.polygon){
	document.getElementById('menu-shape-polygon')
	    .addEventListener('click',function(event){
		self.editor.set_draw_mode('polygon');
	    });
    }
    else{
	document.getElementById('menu-shape-polygon')
	    .setAttribute('class','disable');
    }

    if(this.editor.config.allow_shape.oval){
	document.getElementById('menu-shape-oval')
	    .addEventListener('click',function(event){
		self.editor.set_draw_mode('oval');
	    });
    }
    else{
	document.getElementById('menu-shape-oval')
	    .setAttribute('class','disable');
    }

    if(this.editor.config.allow_shape.box){
	document.getElementById('menu-shape-none')
	    .addEventListener('click',function(event){
		self.editor.set_draw_mode('none');
	    });
    }
    else{
	document.getElementById('menu-shape-none')
	    .setAttribute('class','disable');
    }


    document.getElementById('menu-zoom-in')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.zoom_in();
	});
    document.getElementById('menu-zoom-out')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.zoom_out();
	});
    document.getElementById('menu-original-size')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.zoom_as_original();
	});
    document.getElementById('menu-fit-screen')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.zoom_as_window();
	});

    var el=document.getElementById('menu-zoom-scale');
    el.addEventListener('blur',function(event){
	self.show_current_zoom_scale();
    });
    el.addEventListener('keydown',function(event){
	if(event.key=='Escape'){
	    event.stopPropagation();
	    self.show_current_zoom_scale();
	    this.blur();
	}
    });
    el.addEventListener('keypress',function(event){
	event.stopPropagation();
	//
	// allow less than 5 digits or 4 digits and one period.
	//
	if(event.key){
	    if(event.key.match(/\d/) && this.innerText.length<5)
		return;
	    else if(event.key=='.' && this.innerText.indexOf('.')==-1)
		return;
	    else if(event.key=='Enter'){
		var text=this.innerText;
		self.zoom(parseFloat(text)/100.0);
		this.blur();
	    }
	}
	event.preventDefault();
    });

    document.getElementById('menu-fileinfo-button')
	.addEventListener('click',function(event){
	    self.toggle_title_bar();
	});


    document.getElementById('menu-border-size-dec')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.border_size_dec();
	});
    document.getElementById('menu-border-size-inc')
	.addEventListener('click',function(event){
	    var text=this.getAttribute('class');
	    if(!text||!text.includes('disable'))
		self.border_size_inc();
	});
    el=document.getElementById('menu-border-size');
    el.addEventListener('blur',function(event){
	self.show_current_border_sz();
    });
    el.addEventListener('keydown',function(event){
	if(event.key=='Escape'){
	    event.stopPropagation();
	    self.show_current_border_sz();
	    this.blur();
	}
    });
    el.addEventListener('keypress',function(event){
	event.stopPropagation();
	//
	// allow less than 2 digits.
	//
	if(event.key){
	    if(event.key.match(/\d/) && this.innerText.length<2)
		return;
	    else if(event.key=='Enter'){
		var text=this.innerText;
		self.set_border_size(parseInt(text));
		this.blur();
	    }
	}
	event.preventDefault();
    });

    document.getElementById('menu-border-scale-button')
	.addEventListener('click',function(event){
	    self.toggle_border_scale_independent();
	});


    //
    // mouse wheel
    //
    window.addEventListener('wheel',function(event){
	if(event.ctrlKey){
	    if(event.shiftKey){
		if(event.deltaY>0){
		    self.border_size_inc();
		}
		else if(event.deltaY<0){
		    self.border_size_dec();
		}
	    }
	    else{
		if(event.deltaY>0){
		    self.zoom_in();
		}
		else if(event.deltaY<0){
		    self.zoom_out();
		}
	    }
	}
    },{passive:true});

    //
    // hooks to global window event
    //
    window.addEventListener('keydown',function(event){
	switch(event.key){
	case 'Escape':
	    if(event.shiftKey)
		self.toggle_side_menu();
	    else if(self.side_menu_opened)
		self.hide_side_menu();
	    else
		self.editor.post(self,'keypress',event);
	    break;
	case 'Control':
	case 'Insert':
	case 'Delete':
	case 'F3':
	    self.editor.post(this,'keypress',event);
	    break;
	case '+':
	    if(event.ctrlKey)
		self.border_size_inc();
	    else
		self.zoom_in();
	    break;
	case '-':
	    if(event.ctrlKey)
		self.border_size_dec();
	    else
		self.zoom_out();
	    break;
	case '=':
	    self.zoom_as_original();
	    break;
	case '0':
	    self.zoom_as_window();
	    break;
	case 'F8':
	    if(event.shiftKey)
		self.editor.bw_draw_mode();
	    else
		self.editor.fw_draw_mode();
	    break;
	default:
	    //console.log(event);
	}
    });
    window.addEventListener('keyup',function(event){
	switch(event.key){
	case 'Control':
	    self.editor.post(this,'keyup',event);
	    break;
	}
    });

    //
    // add short cut key description to tool tip
    //
    var text=null;
    text=(this.element.menu_button.getAttribute('title')||'')+' [Esc]';
    this.element.menu_button.setAttribute('title',text.trim());

    var el=document.getElementById('menu-draw-mode');
    text=(el.getAttribute('title')||'')+
	' [F8]/[Shift]+[F8] to change shape (Forward/Backward)';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-zoom-in');
    text=(el.getAttribute('title')||'')+' [+]';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-zoom-out');
    text=(el.getAttribute('title')||'')+' [-]';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-original-size');
    text=(el.getAttribute('title')||'')+' [=]';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-fit-screen');
    text=(el.getAttribute('title')||'')+' [0]';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-border-size-dec');
    text=(el.getAttribute('title')||'')+' [[Ctrl]+[-]]';
    el.setAttribute('title',text.trim());

    el=document.getElementById('menu-border-size-inc');
    text=(el.getAttribute('title')||'')+' [[Ctrl]+[+]]';
    el.setAttribute('title',text.trim());


    if(this.element.menu_edit_mode){
	text=(this.element.menu_edit_mode.getAttribute('title')||'')+' [Ins] to toggle';
	this.element.menu_edit_mode.setAttribute('title',text.trim());
    }

    // declaring as oneshot event for avoiding re-entrance
    window.addEventListener('resize',function(event){
	if(!self.zoom(self.zoom_scale))
	    	event.preventDefault();
	window.addEventListener('resize',arguments.callee,{once:true});
    },{once:true});
}

//
// create data-URL of custom cursor using FontAwasome icon
//
// https://stackoverflow.com/questions/24093263/set-font-awesome-icons-as-cursor-is-this-possible/36820863
//
Director.prototype._fa_cursor=function(str,opts)
{
    var stroke="#000000";
    var fill="#ffffff";
    var sz="20px";
    var deg=0.0;
    var ox=10.0;
    var oy=10.0;
    var origin="0 0";

    if(opts){
	if(opts.stroke)
	    stroke=opts.stroke;
	if(opts.fill)
	    fill=opts.fill;
	if(opts.sz)
	    sz=opts.sz;
	if(opts.deg)
	    deg=parseFloat(opts.deg);
	if(opts.origin)
	    origin=opts.origin;
    }

    var canvas=document.createElement("canvas");
    canvas.width=20;
    canvas.height=20;
    var ctx=canvas.getContext("2d");

    ctx.font=sz+" FontAwesome";
    ctx.textAlign="center";
    ctx.textBaseline="middle";

    if(deg!=0.0){
	var rad=deg*Math.PI/180.0;
	var c=Math.cos(rad);
	var s=Math.sin(rad);
	var cx=ox*c+oy*s;
	var cy=-ox*s+oy*c;
	ox=cx;
	oy=cy;

	ctx.rotate(rad);
    }

    if(stroke!='none'){
	ctx.setStrokeStyle=stroke;
	ctx.lineWidth=2;
	ctx.strokeText(str,ox,oy);
    }
    if(fill!='none'){
	ctx.fillStyle=fill;
	ctx.fillText(str,ox,oy);
    }

    return 'url('+canvas.toDataURL('image/png')+') '+origin+',auto';
}

Director.prototype.on_recv=function(sender,channel,...args)
{
    switch(channel){
    case 'keypress':
	if(sender==this.editor && args[0].key=='Escape')
	    this.show_side_menu();
	break;
    case 'set-draw-shape':
	this.show_segment_shape(args[0]);
	break;
    }
}

Director.prototype.show_title_bar=function(){
    document.getElementById('title-bar').removeAttribute('class');
    document.getElementById('menu-fileinfo-button').removeAttribute('class');
    this.title_bar_opend=true;
    this.zoom(this.zoom_scale);
}
Director.prototype.hide_title_bar=function(){
    document.getElementById('title-bar').setAttribute('class','hidden');
    document.getElementById('menu-fileinfo-button').setAttribute('class','hidden');
    this.title_bar_opend=null;
    this.zoom(this.zoom_scale);
}
Director.prototype.toggle_title_bar=function(){
    if(this.title_bar_opend)
	this.hide_title_bar();
    else
	this.show_title_bar();
}

Director.prototype.show_side_menu=function()
{
    this.element.menu_guard.style.visibility='visible';
    this.element.menu_button.setAttribute('class','opened');
    this.element.side_menu.setAttribute('class','opened');
    this.side_menu_opened=true;
}

Director.prototype.hide_side_menu=function()
{
    this.element.menu_guard.style.visibility='hidden';
    this.element.side_menu.removeAttribute('class');
    this.element.menu_button.removeAttribute('class');
    this.side_menu_opened=false;
}

Director.prototype.toggle_side_menu=function()
{
    if(this.side_menu_opened)
	this.hide_side_menu();
    else
	this.show_side_menu();
}

Director.prototype.show_context_menu=function()
{
    this.context_menu_opened=true;
}

Director.prototype.hide_context_menu=function()
{
    this.context_menu_opened=false;
}

Director.prototype.zoom=function(scale,prohibit_enlarge)
{
    //
    // fit 'picture-frame' to window
    //
    var cw,ch;
    [cw,ch]=this.win.getContentSize();
    ch-=document.getElementById('title-bar').offsetHeight;
    this.element.picture_frame.style.width=cw+'px';
    this.element.picture_frame.style.height=ch+'px';

    //
    // scale value sanitize
    //
    scale=parseFloat(scale);
    if(isNaN(scale))
	scale=-1.0;
    if(scale<=0.0){
	//
	// fit to window if auto-zoom mode
	//
	var x_scale=cw/this.image_sz.width;
	var y_scale=ch/this.image_sz.height;
	scale=(x_scale<y_scale ? x_scale : y_scale);
	if(scale>1.0 && prohibit_enlarge)
	    scale=1.0;

	this.zoom_scale=-1.0;
    }
    else{
	if(scale<=MIN_ZOOM_SCALE)
	    scale=MIN_ZOOM_SCALE;
	else if(scale>=MAX_ZOOM_SCALE)
	    scale=MAX_ZOOM_SCALE;

	if(scale<this.zoom_scale_min_limit)
	    scale=this.zoom_scale_min_limit

	this.zoom_scale=scale;
    }
    this.current_scale=scale;

    //
    // fit svg viewport to scaled image size
    //
    var w=Math.round(this.image_sz.width*scale);
    var h=Math.round(this.image_sz.height*scale);

    if(w<1||h<1)
	return null;

    this.editor.rescale(scale);

    //
    // mergin adjustment
    //
    var left=(cw-w)/2;
    if(left<0)
	left=0;
    var top=(ch-h)/2;
    if(top<0)
	top=0;

    this.editor.set_position(left,top,w,h);

    //
    // menu buttons set up
    //
    if(scale<=MIN_ZOOM_SCALE||scale<=this.zoom_scale_min_limit){
	document.getElementById('menu-zoom-out').setAttribute('class','disable');
	document.getElementById('menu-zoom-in').removeAttribute('class');
    }
    else if(scale>=MAX_ZOOM_SCALE){
	document.getElementById('menu-zoom-out').removeAttribute('class');
	document.getElementById('menu-zoom-in').setAttribute('class','disable');
    }
    else{
	document.getElementById('menu-zoom-out').removeAttribute('class');
	document.getElementById('menu-zoom-in').removeAttribute('class');
    }

    if(this.zoom_scale<=0.0 && (left==0 || top==0))
	document.getElementById('menu-fit-screen').setAttribute('class','disable');
    else
	document.getElementById('menu-fit-screen').removeAttribute('class');

    if(scale==1.0)
	document.getElementById('menu-original-size').setAttribute('class','disable');
    else
	document.getElementById('menu-original-size').removeAttribute('class');

    this.show_current_zoom_scale();
    this.show_current_border_sz();

    return true;
}

Director.prototype.show_current_zoom_scale=function()
{
    var text=Math.round(this.current_scale*1000)/10;
    document.getElementById('menu-zoom-scale').innerText=text;
    document.getElementById('title-zoom-scale').innerText=text;
}

Director.prototype.zoom_in=function()
{
    this.zoom(this.current_scale*1.25);
}
Director.prototype.zoom_out=function()
{
    this.zoom(this.current_scale*0.75);
}
Director.prototype.zoom_as_original=function()
{
    this.zoom(1.0);
}
Director.prototype.zoom_as_window=function()
{
    this.zoom(-1.0);
    this.zoom(this.current_scale*0.9); // hack for hide scrollbar
    this.zoom(-1.0);
}

Director.prototype.set_border_size=function(sz)
{
    if(sz==null)
	return;

    sz=Math.round(parseFloat(sz));
    if(isNaN(sz))
	sz=MIN_BORDER_SIZE;
	
    if(sz<=MIN_BORDER_SIZE){
	sz=MIN_BORDER_SIZE;

	var el=document.getElementById('menu-border-size-dec');
	var text=(el.getAttribute('class')||'')+' disable';
	el.setAttribute('class',text.trim());

	el=document.getElementById('menu-border-size-inc');
	text=el.getAttribute('class')||'';
	el.setAttribute('class',text.replace(/disable/,'').trim());
    }
    else if(sz>=MAX_BORDER_SIZE){
	sz=MAX_BORDER_SIZE;
	    
	var el=document.getElementById('menu-border-size-dec');
	var text=el.getAttribute('class')||'';
	el.setAttribute('class',text.replace(/disable/,'').trim());

	el=document.getElementById('menu-border-size-inc');
	text=(el.getAttribute('class')||'')+' disable';
	el.setAttribute('class',text.trim());
    }
    else{
	var el=document.getElementById('menu-border-size-dec');
	var text=el.getAttribute('class')||'';
	el.setAttribute('class',text.replace(/disable/,'').trim());
	
	el=document.getElementById('menu-border-size-inc');
	text=el.getAttribute('class')||'';
	el.setAttribute('class',text.replace(/disable/,'').trim());
    }
    this.editor.config.segment_border_size=sz;
    this.editor.apply_segment_border_size();
    this.show_current_border_sz();
}
Director.prototype.border_size_dec=function()
{
    this.set_border_size(this.editor.config.segment_border_size-1);
}
Director.prototype.border_size_inc=function()
{
    this.set_border_size(this.editor.config.segment_border_size+1);
}
Director.prototype.set_border_scale_independent=function()
{
    this.editor.config.segment_border_scale_independent=true;
    this.set_border_size(this.editor.config.segment_border_size);
}
Director.prototype.unset_border_scale_independent=function()
{
    this.editor.config.segment_border_scale_independent=false;
    this.set_border_size(this.editor.config.segment_border_size);
}
Director.prototype.toggle_border_scale_independent=function()
{
    if(this.editor.config.segment_border_scale_independent)
	this.unset_border_scale_independent();
    else
	this.set_border_scale_independent();
}
Director.prototype.show_current_border_sz=function()
{
    document.getElementById('menu-border-size').innerText=
	this.editor.config.segment_border_size;
    if(this.editor.config.segment_border_scale_independent)
	document.getElementById('menu-border-scale-button').setAttribute('class','on');
    else
	document.getElementById('menu-border-scale-button').setAttribute('class','off');
}

Director.prototype.show_segment_shape=function(shape)
{
    ['box','polygon','oval','none'].forEach(function(s){
	if(this.editor.config.allow_shape[s]){
	    var el=document.getElementById('menu-shape-'+s);
	    if(s==shape)
		el.setAttribute('class','selected');
	    else if(el.getAttribute('class'))
		el.removeAttribute('class');
	}
    },this);

    document.getElementById('title-segment-shape').innerText=shape;
}

Director.prototype.open_file=function(obj)
{
    this.element.title.innerText=ProductName+' - '+obj.path;

    this.base_image=obj;
    this.image_sz=obj.image_size;
    
    var x_scale=MIN_IMG_PIXEL_SZ/this.image_sz.width;
    var y_scale=MIN_IMG_PIXEL_SZ/this.image_sz.height;
    this.zoom_scale_min_limit=(x_scale>y_scale ? x_scale : y_scale);


    this.hide_side_menu();
    this.hide_context_menu();

    document.getElementById('filename').innerText=Util.escapeHTML(obj.basename);
    document.getElementById('title-image-size').innerText=
	this.image_sz.width+'x'+this.image_sz.height;

    this.editor.load_image(obj.path,this.image_sz);
    this.zoom(-1.0,true);

    this.editor.set_draw_mode();
}

function log(item)
{
    console.log(item);
}

window.onload=function(){
    document.director=new Director();
    Ipc.send('easel-file-query',null);
};
Ipc.on('easel-open-file',(event,obj)=>{
    document.director.open_file(obj);
});
