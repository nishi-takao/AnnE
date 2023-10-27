//
//
//
"use strict";
const SVGNS='http://www.w3.org/2000/svg';
const XLINKNS='http://www.w3.org/1999/xlink';

const Observer=require('../observer');

function cvt_mouseevent(event)
{
    if(!(event instanceof MouseEvent))
	return event;

    var now=Date.now();

    switch(event.type){
    case 'mousedown':
	cvt_mouseevent.mousedown={at:now,event:event};
	break;
    case 'mouseup':
	if(!cvt_mouseevent.mousedown)
	    return event;

	var dt=now-cvt_mouseevent.mousedown.at;
	if(dt<=150.0 &&
	   cvt_mouseevent.mousedown.event.button==event.button){
	    var prop={};
	    for(var p in event){ prop[p]=event[p]; }
	    var e=new MouseEvent('click',prop);
	    
	    if(cvt_mouseevent.click){
		dt=now-cvt_mouseevent.click.at;
		if(dt<=300.0 &&
		   cvt_mouseevent.click.event.button==event.button){
		    cvt_mouseevent.click={at:now,event:e};
		    return new MouseEvent('dblclick',prop);
		}
	    }
	    cvt_mouseevent.click={at:now,event:e};
	    return e;
	}
	break;
    }
    return event;
}


////////////////////////////////////////////////////////////////////////
//
// Node - Event Map (as sigleton)
//
var EventMap;
(function(){
    var instance;
    EventMap=function EventMap(){
	if(instance)
	    return instance;

	this.listeners=new Map();

	EventMap.prototype=this;
	
	//////////////////////////////////////////////////////////////
	//
	//
	//
	EventMap.prototype.add_listener=function(target,event,func,opt){
	    var obj=this.listeners.get(target)||{}
	    
	    if(obj[event])
		target.removeEventListener(event,
					   obj[event].f,
					   obj[event].o);
	    obj[event]={f: func,o: opt};
	    this.listeners.set(target,obj);
	    target.addEventListener(event,func,opt);
	};

	//////////////////////////////////////////////////////////////
	//
	//
	//
	EventMap.prototype.remove_listener=function(target,event){
	    var obj=this.listeners.get(target);
	    if(!obj)
		return;

	    if(event){
		if(obj[event])
		    target.removeEventListener(event,
					       obj[event].f,
					       obj[event].o);
		delete obj[event];
	    }
	    else{
		for(var event in obj){
		    target.removeEventListener(event,
					       obj[event].f,
					       obj[event].o);
		    delete obj[event];
		}
	    }
	};

	//////////////////////////////////////////////////////////////
	//
	// clear all event-listener map
	//
	EventMap.prototype.clear=function(){
	    this.listeners.forEach(function(v,k){
		this.remove_listener(k);
	    },this);
	    this.listeners.clear();
	};

	//////////////////////////////////////////////////////////////
	//
	// pause listener
	//
	EventMap.prototype.pause_listener=function(target,event){
	    var obj=this.listeners.get(target);
	    if(!obj)
		return;
	    if(event){
		if(obj[event]){
		    target.removeEventListener(event,
					       obj[event].f,
					       obj[event].o);
		    obj[event].paused=true;
		}
	    }
	    else{
		for(var event in obj){
		    target.removeEventListener(event,
					       obj[event].f,
					       obj[event].o);
		    obj[event].paused=true;
		}
	    }
	};

	//////////////////////////////////////////////////////////////
	//
	// resume paused listener
	//
	EventMap.prototype.resume_listener=function(target,event){
	    var obj=this.listeners.get(target);
	    if(!obj)
		return;
	    if(event){
		if(obj[event] && obj[event].paused){
		    target.addEventListener(event,
					    obj[event].f,
					    obj[event].o);
		    delete obj[event].paused;
		}
	    }
	    else{
		for(var event in obj){
		    if(obj[event].paused){
			target.addEventListener(event,
						obj[event].f,
						obj[event].o);
			delete obj[event].paused;
		    }
		}
	    }
	};

	//////////////////////////////////////////////////////////////
	//
	//
	//
	EventMap.prototype.has_listener=function(target,event){
	    var obj=this.listeners.get(target);
	    if(!obj)
		return null;

	    if(event)
		return obj[event];
	    else{
		var ar=Object.keys(obj);
		if(ar.length)
		    return ar;
		else
		    return null;
	    }
	};

	//////////////////////////////////////////////////////////////
	//
	// return target-event tied function
	//
	EventMap.prototype.func=function(target,event){
	    var obj=this.listeners.get(target);
	    if(!obj)
		return undefined;

	    return obj[event].f;
	}

	instance=this;
	instance.constructor=EventMap;
    };
}());

////////////////////////////////////////////////////////////////////////
//
// Color Director (as sigleton)
//
var ColorTable;
(function(){
    var instance;
    ColorTable=function ColorTable(){
	if(instance)
	    return instance;

	this.index=-1;
	this.COLORS=Object.freeze(['#ff0000',
				   '#00ff00',
				   '#0000ff',
				   '#ffff00',
				   '#ff00ff',
				   '#00ffff',
				   '#ffffff',
				   '#800000',
				   '#008000',
				   '#000080',
				   '#808000',
				   '#800080',
				   '#008080',
				   '#808080',
				   '#000000']);

	ColorTable.prototype=this;

	//////////////////////////////////////////////////////////////
	//
	//
	ColorTable.prototype.next_color=function(){
	    this.index=(this.index+1)%this.COLORS.length;
	    return this.COLORS[this.index];
	};

	//////////////////////////////////////////////////////////////
	//
	//
	ColorTable.prototype.reset=function(){
	    this.index=-1;
	};

	//////////////////////////////////////////////////////////////
	//
	//
	ColorTable.prototype.rewind=function(){
	    if(this.index>=0)
		this.index--;
	};

	instance=this;
	instance.constructor=ColorTable;

	return instance;
    };
}());

function PolarCoord(xy,c)
{
    this.x=xy.x;
    this.y=xy.y;
    this.cx=c.x;
    this.cy=c.y;

    var dx=this.x-this.cx;
    var dy=this.y-this.cy;
    this.r=Math.sqrt(dx*dx+dy*dy);
    this.cos=dx/this.r;
    this.sin=dy/this.r;

    return this;
}
PolarCoord.prototype.resize=function(rx_scale,ry_scale)
{
    if(isNaN(this.cos)||isNaN(this.sin))
	return {x:this.x,y:this.y};

    var rx=this.r*rx_scale;
    var ry=this.r*ry_scale;

    return {x:rx*this.cos+this.cx,y:ry*this.sin+this.cy};
}

////////////////////////////////////////////////////////////////////////
//
// SVG shape wrapper skeleton
//
function SVGShape(parent,shape,primitive_shape)
{
    this.parent=parent;
    this.root=this.parent.root;
    this.shape=shape;
    this.primitive_shape=primitive_shape||this.shape;
    
    this.envelope=document.createElementNS(SVGNS,'g');
    this.envelope.setAttribute('class','segment-envelope');
    this.title=document.createElementNS(SVGNS,'title');
    this.envelope.appendChild(this.title);

    this.node=document.createElementNS(SVGNS,this.primitive_shape);
    this.node.setAttribute('class','segment');
    this.envelope.appendChild(this.node);
    this.id=null;

    this.parent.node.appendChild(this.envelope);

    this.points=[];

    //
    // cache of this.node.transform.baseVal.consolidate().matrix
    // It presents local->container coord. transform matrix.
    //
    this.matrix=null;
    this.matrix_inv=null;
    this._xy=this.root.node.createSVGPoint();    

    this.children=new Map();

    this.color=null;

    this.event_map=new EventMap();

    this.active=true;
    this.selected=false;
    this.shape_box=new ShapeBox(this);
    this.shape_edge=null;

    this.edit_mode=null;

    Observer.prototype.constructor.call(this,this.parent);
}
Observer.mixin(SVGShape);

SVGShape.prototype.event_at=function(e,global)
{
    //
    // returns shape local coord within transform. 
    //
    if(global)
	return this.root.event_at(e);
    else
	return this.global2local(this.root.event_at(e));
}
SVGShape.prototype.local2global=function(x,y)
{
    var xy;
    if(x instanceof SVGPoint)
	xy=x;
    else{
	xy=this._xy;

	try{
	    if('x' in x){
		xy.x=x.x;
		xy.y=x.y;
	    }
	    else
		throw 'catch me';
	}
	catch(e){
	    xy.x=x;
	    xy.y=y;
	}
    }
    
    if(this.matrix)
	return xy.matrixTransform(this.matrix);
    else
	return {x:xy.x,y:xy.y};
}
SVGShape.prototype.global2local=function(x,y)
{
    var xy;
    if(x instanceof SVGPoint)
	xy=x;
    else{
	xy=this._xy;

	if(('x' in x) && ('y' in x)){
	    xy.x=x.x;
	    xy.y=x.y;
	}
	else{
	    xy.x=x;
	    xy.y=y;
	}
    }

    if(this.matrix_inv)
	return xy.matrixTransform(this.matrix_inv);
    else
	return {x:xy.x,y:xy.y};
}

SVGShape.prototype.set_color=function(color)
{
    if(color)
	this.color=color;
    else
	this.color=(new ColorTable()).next_color();

    this.node.setAttribute('stroke',this.color);
}

SVGShape.prototype.vertexes=function(global)
{
    throw 'not implemented';
}

SVGShape.prototype.update=function(event,suppress_draw)
{
    if(this._lock)
	return;

    this._lock=true;
    
    var xy,dx,dy,m;
    if(this.edit_mode){
	switch(this.edit_mode.name){
	case 'rotate':
	    //
	    // create rotation matrix using global coord. and folowing;
	    //
	    //  p0: center of bbox     ; this.edit_mode.center_at
	    //  p1: mouse down point
	    //  p2: currnt mouse point
	    //
	    //  v0 = vec(p0, p1)       ; this.edit_mode.start_at.[xy]
	    //  v1 = vec(p0, p2)
	    //
	    //  cos(t) = v0 . v1
	    //  sin(t) = v0 x v1
	    //
	    //      | cos(t) -sin(t) p0.x | | 1 0 -p0.x|
	    //  m = | sin(t)  cos(t) p0.y | | 0 1 -p0.y|
	    //      |   0       0     1   | | 0 0   1  |
	    //

	    //
	    // calc v1
	    //
	    xy=this.event_at(event,global);
	    dx=xy.x-this.edit_mode.center_at.x;
	    dy=xy.y-this.edit_mode.center_at.y;
	    var d=Math.sqrt(dx*dx+dy*dy);
	    dx=dx/d;
	    dy=dy/d;

	    //
	    // calc cos(t) and sin(t)
	    //
	    var c=this.edit_mode.start_at.x*dx+this.edit_mode.start_at.y*dy;
	    var s=this.edit_mode.start_at.x*dy-this.edit_mode.start_at.y*dx;
	    var d=Math.sqrt(c*c+s*s);
	    if(d && !isNaN(d)){
		c=c/d;
		s=s/d;
	    }
	    else{
		c=1;
		s=0;
	    }

	    //
	    // create current rotation matrix
	    //
	    m=this.root.node.createSVGTransform().matrix;
	    m.a=c;
	    m.b=s;
	    m.c=-s;
	    m.d=c;
	    m.e=this.edit_mode.center_at.x;
	    m.f=this.edit_mode.center_at.y;

	    var t=this.root.node.createSVGTransform().matrix;
	    t.a=1;
	    t.b=0;
	    t.c=0;
	    t.d=1;
	    t.e=-this.edit_mode.center_at.x;
	    t.f=-this.edit_mode.center_at.y;

	    m=m.multiply(t);

	    //
	    // apply old transformation matrix
	    //
	    if(this.edit_mode.start_at.m)
		m=m.multiply(this.edit_mode.start_at.m);

	    break;
	case 'resize':
	    //
	    // resizing works under local polar-coord. sys. to keep shape.
	    //
	    //  * center is opposide of active (clicked) handle
	    //      eg; clicked: lefttop -> center: rightbottom
	    //
	    //  * each point XY coord is determined
	    //      x = r * cos(theta) * x_scale
	    //      y = r * sin(theta) * y_scale
	    //
	    // * each scale is determined
	    //      [xy]_scale = (p2 - c) / (p1 - c)
	    //
	    //  where
	    //  c: center
	    //  p1: mouse down point
	    //  p2: currnt mouse point
	    //
	    xy=this.event_at(event);
	    dx=(xy.x-this.edit_mode.center_at.x)/
		(this.edit_mode.start_at.x-this.edit_mode.center_at.x);
	    dy=(xy.y-this.edit_mode.center_at.y)/
		(this.edit_mode.start_at.y-this.edit_mode.center_at.y);

	    break;
	case 'move':
	default:
	    xy=this.event_at(event);
	    dx=xy.x-this.edit_mode.start_at.x;
	    dy=xy.y-this.edit_mode.start_at.y;
	}
    }
    else
	xy=this.event_at(event);

    this._update(event,xy,{x:dx,y:dy},m);

    //
    // cacheing current transformation matrix
    //
    var tfl=this.node.transform.baseVal;
    if(tfl.numberOfItems){
	this.matrix=tfl.consolidate().matrix;
	this.matrix_inv=this.matrix.inverse();
    }
    else{
	this.matrix=null;
	this.matrix_inv=null;
    }

    if(!suppress_draw)
	this.draw();

    this._lock=null;
}
SVGShape.prototype._update=function(event,xy,d,m)
{
    if(this.edit_mode){
	switch(this.edit_mode.name){
	case 'move':
	    this.points=this._points.map(function(p){
		return {x:p.x+d.x,y:p.y+d.y};
	    });
	    break;
	case 'resize':
	    switch(this.edit_mode.button){
	    case 'top':
	    case 'bottom':
		d.x=1;
		break;
	    case 'left':
	    case 'right':
		d.y=1;
		break;
	    }
	    this.points=this._points.map(function(polar){
		return polar.resize(d.x,d.y);
	    });
	    break;
	case "rotate":
	    this.node.setAttribute('transform','matrix('+
				   m.a+','+
				   m.b+','+
				   m.c+','+
				   m.d+','+
				   m.e+','+
				   m.f+')');
	    break;
	case 'reshape':
	default:
	    throw 'fix me';
	}
    }
}
SVGShape.prototype.draw=function()
{
    throw 'not impremented';
}
SVGShape.prototype.commit=function(id,suppress_notify)
{
    if(this.edit_mode){
	switch(this.edit_mode.name){
	case 'move':
	    this.move_end();
	    break;
	case 'resize':
	    this.resize_end();
	    break;
	case 'rotate':
	    this.rotate_end();
	    break;
	case 'reshape':
	    this.reshape_end();
	    break;
	default:
	    throw 'unknown mode';
	}
	if(!suppress_notify)
	    this.retract('update');
    }
    else{
	this.id=id;
	this.envelope.setAttribute('id',this.id+".envelope");
	this.title.textContent=this.id;
	this.node.setAttribute('id',this.id);
	if(!suppress_notify)
	    this.retract('append');
    }

    this.draw();
}

SVGShape.prototype.revert=function()
{
    if(this.id){
	if(this._points){
	    this.points=this._points.map(function(p){
		return {x:p.x,y:p.y};
	    });
	    delete this._points;
	    this.draw();
	    this.set_select();
	}
	else if(this._matrix){
	    if(this._matrix instanceof SVGMatrix){
		var m=this._matrix
		this.node.setAttribute('transform','matrix('+
				       m.a+','+
				       m.b+','+
				       m.c+','+
				       m.d+','+
				       m.e+','+
				       m.f+')');
	    }
	    else
		this.node.removeAttribute('transform');
	    
	    var tfl=this.node.transform.baseVal;
	    if(tfl.numberOfItems){
		this.matrix=tfl.consolidate().matrix;
		this.matrix_inv=this.matrix.inverse();
	    }
	    else{
		this.matrix=null;
		this.matrix_inv=null;
	    }

	    delete this._matrix;
	    this.draw();
	    this.set_select();
	}
	else
	    this.unset_select();
    }
    else{
	this.parent.node.removeChild(this.envelope);
	(new ColorTable()).rewind();
	this.retract('unselected');
    }
}

SVGShape.prototype.bbox=function()
{
    return this.node.getBBox();
}

SVGShape.prototype.to_polygon=function(points)
{
    throw 'not implemented';
}

SVGShape.prototype.dump=function()
{
    var obj={shape:this.shape,
	     id:this.id,
	     color:this.color};
    if(this.matrix){
	obj.matrix={};
	['a','b','c','d','e','f'].forEach(function(x){
	    obj.matrix[x]=this.matrix[x];
	},this);
    }

    obj.points=this.points.map(function(p){
	return {x:p.x,y:p.y};
    });

    return obj;
}

//
// not prototype method
//
SVGShape.restore=function(obj)
{
    var seg=null;
    switch(obj.shape){
    case 'box':
	seg=new Box(this,null,obj.color);
	break;
    case 'oval':
	seg=new Oval(this,null,obj.color);
	break;
    case 'polygon':
	seg=new Polygon(this,null,obj.color);
	break;
    default:
	// ignore
	console.warn('ignored',obj);
	return null;
    }

    try{
	seg.points=obj.points.map(function(p){
	    return {x:p.x,y:p.y};
	})

	if(obj.matrix){
	    seg.matrix=this.node.createSVGTransform().matrix;
	    for(var prop in obj.matrix)
		seg.matrix[prop]=obj.matrix[prop];
	    seg.matrix_inv=seg.matrix.inverse();
	    seg.node.setAttribute('transform','matrix('+
				  seg.matrix.a+','+
				  seg.matrix.b+','+
				  seg.matrix.c+','+
				  seg.matrix.d+','+
				  seg.matrix.e+','+
				  seg.matrix.f+')');
	}

	seg.commit(obj.id,true);
    }
    catch(e){
	console.error(e);
	seg=null;
    }

    return seg;
}

SVGShape.prototype.on_recv=function(sender,channel,...args)
{
    switch(channel){
    case 'remove':
	this.on_remove(sender);
	return;
	break;
    case 'append':
    case 'update':
    default:
	this.relay(sender,channel,...args);
    }
    throw 'not impremented';
}

SVGShape.prototype.on_remove=function(sender)
{
    if(sender==this.parent){
	this.notify('remove');
    
	this.unset_select(true);
	this.parent.node.removeChild(this.envelope);
	this.retract('remove');
    }
    else if(this.children.has(sender.id)){
	this.children.delete(sender.id);
	this.remove_downstream(sender);
	this.relay(sender,'remove');
    }
    else
	this.relay(sender,'remove');

}

SVGShape.prototype.on_click=function(obj,event)
{
    event.stopPropagation();
    this.toggle_select();
}

SVGShape.prototype.set_active=function()
{
    this.event_map.add_listener(this.node,
				'click',
				this.on_click.bind(this,this.node));
    this.active=true;
}
SVGShape.prototype.unset_active=function()
{
    this.shape_box.unset_active();
    this.event_map.remove_listener(this.node,'click');
    this.active=false;
}
SVGShape.prototype.toggle_active=function()
{
    if(this.active)
	this.unset_active();
    else
	this.set_active();
}

SVGShape.prototype.set_select=function(suppress_notify)
{
    this.shape_box.set_active();

    if(this.selected)
	return;
    this.selected=true;

    var text=(this.node.getAttribute('class')||'')+' selected';
    this.node.setAttribute('class',text.trim());

    this.shape_box.update();

    if(!suppress_notify)
	this.retract('selected');
}
SVGShape.prototype.unset_select=function(suppress_notify)
{
    if(!this.selected)
	return;
    this.selected=false;

    var text=(this.node.getAttribute('class')||'').replace(/selected/,'');
    this.node.setAttribute('class',text.trim());
    this.shape_box.unset_active();
    if(!suppress_notify)
	this.retract('unselected');
}
SVGShape.prototype.toggle_select=function()
{
    if(this.selected)
	this.unset_select();
    else
	this.set_select();
}
SVGShape.prototype.move_start=function(event)
{
    this.edit_mode={name:'move',
		    start_at:this.event_at(event)};

    delete this._matrix;
    this._points=this.points.map(function(xy){
	return {x:xy.x,y:xy.y};
    });
}
SVGShape.prototype.move_end=function(event)
{
    this.edit_mode=null;
}

SVGShape.prototype.resize_start=function(event,button_name)
{
    this.edit_mode={name:'resize',
		    start_at:this.event_at(event),
		    button:button_name};

    var box=this.bbox();
    var lx=box.x;
    var cx=box.x+box.width/2;
    var rx=box.x+box.width;

    var ty=box.y;
    var my=box.y+box.height/2;
    var by=box.y+box.height;
    var c;
    switch(button_name){
    case 'lefttop':
	c={x:rx,y:by};
	break;
    case 'top':
	c={x:cx,y:by};
	break;
    case 'righttop':
	c={x:lx,y:by};
	break;
    case 'right':
	c={x:lx,y:my};
	break;
    case 'rightbottom':
	c={x:lx,y:ty};
	break;
    case 'bottom':
	c={x:cx,y:ty};
	break;
    case 'leftbottom':
	c={x:rx,y:ty};
	break;
    case 'left':
	c={x:rx,y:my};
	break;
    }
    this.edit_mode.center_at=c;

    delete this._matrix;
    this._points=this.points.map(function(xy){
	return new PolarCoord(xy,c);
    });
}
SVGShape.prototype.resize_end=function(event)
{
    this.edit_mode=null;
}
SVGShape.prototype.rotate_start=function(event)
{
    var box=this.bbox();
    var cx=box.x+box.width/2;
    var cy=box.y+box.height/2;
    var c=this.local2global(cx,cy);

    var s=this.event_at(event,global);
    var sx=s.x-c.x;
    var sy=s.y-c.y;
    var d=Math.sqrt(sx*sx+sy*sy);
    sx=sx/d;
    sy=sy/d;
    var m=null;
    if(this.matrix){
	var m=this.root.node.createSVGTransform().matrix;
	for(var prop in this.matrix)
	    m[prop]=this.matrix[prop];
    }
    this.edit_mode={name:'rotate',
		    start_at:{x:sx,y:sy,m:m},
		    center_at:c};

    delete this._points;
    if(this.matrix){
	this._matrix=this.root.node.createSVGTransform().matrix;
	for(var prop in this.matrix)
	    this._matrix[prop]=this.matrix[prop];
    }
    else
	this._matrix='none';
}
SVGShape.prototype.rotate_end=function(event)
{
    this.edit_mode=null;
}
SVGShape.prototype.reshape_start=function(xy)
{
    this.shape_box.unset_active();
    this.edit_mode={name:'reshape',
		    edge:new ShapeEdge(this)};
    this.unset_select(true); // clear internal selected flag
}
SVGShape.prototype.reshape_end=function(xy)
{
    if(this.edit_mode){
	this.edit_mode.edge.unset_select();
	delete this.edit_mode.edge;
    }
    this.edit_mode=null;
    this.set_select();
}

////////////////////////////////////////////////////////////////////////
//
// Rect wrapper
//
function Rect(parent,xy,color)
{
    SVGShape.prototype.constructor.call(this,parent,'rect','polygon');
    if(xy){
	if(xy instanceof MouseEvent)
	    this._points_from_point(this.event_at(xy));
	else if('width' in xy)
	    this._points_from_rect(xy);
	else
	    this._points_from_point(xy);
    }

    this.set_color(this.color||color);
}
Rect.prototype=Object.create(SVGShape.prototype,{
    constructor:{
	value:Rect,
	enumerable: false,
	writable: true,
	configurable: true
    }});
Rect.prototype._points_from_rect=function(rect)
{
    this.points=[{x:rect.x,y:rect.y},
		 {x:rect.x+rect.width,y:rect.y+rect.height}];
    this.color=rect.getAttribute('stroke');
}
Rect.prototype._points_from_point=function(pt)
{
    this.points=[{x:pt.x,y:pt.y},{x:pt.x,y:pt.y}];
}
Rect.prototype._update=function(event,xy,d,m)
{
    if(this.edit_mode)
	SVGShape.prototype._update.call(this,event,xy,d,m);
    else
	this.points[1]={x:xy.x,y:xy.y};
}
Rect.prototype.draw=function()
{
    var str='';
    [this.points[0],
     {x:this.points[1].x,y:this.points[0].y},
     this.points[1],
     {x:this.points[0].x,y:this.points[1].y}].forEach(function(xy){
	 str+=xy.x+" "+xy.y+" ";
     });
    this.node.setAttribute('points',str.trim());

    this.shape_box.update();
}
Rect.prototype.commit=function(id)
{
    //
    // reorder left-top and right-bottom
    //
    var x=this.points[0].x;
    var y=this.points[0].y;
    var width=this.points[1].x-this.points[0].x;
    var height=this.points[1].y-this.points[0].y;
    if(width<0){
	width=-width;
	x=this.points[1].x;
    }
    if(height<0){
	height=-height;
	y=this.points[1].y;
    }
    
    this.points=[{x:x,y:y},{x:x+width,y:y+height}];

    SVGShape.prototype.commit.call(this,id);
}
Rect.prototype.vertexes=function(global)
{
    var ar=[
	{x:this.points[0].x,y:this.points[0].y},
	{x:this.points[1].x,y:this.points[0].y},
	{x:this.points[1].x,y:this.points[1].y},
	{x:this.points[0].x,y:this.points[1].y}
    ];

    if(global)
	return ar.map(function(p){
	    return this.local2global(p);
	},this);
    else
	return ar;
}
Rect.prototype.to_polygon=function(points)
{
    if(points)
	this.points=points.map(function(p){
	    return {x:p.x,y:p.y};
	});
    else
	this.points=this.vertexes(true)
    
    if(this.node.getAttribute('transform'))
	this.node.removeAttribute('transform');
    this.matrix=null;
    this.matrix_inv=null;

    this.shape='polygon';
    this.polyline=document.createElementNS(SVGNS,'polyline');
    this.polygon=document.createElementNS(SVGNS,'polygon');
    this.vertex=[];
    
    this.polygon.setAttribute('id',this.node.getAttribute('id'));
    this.polygon.setAttribute('class','segment');
    this.polygon.setAttribute('stroke',this.color);
    
    this.envelope.replaceChild(this.polygon,this.node);
    this.node=this.polygon;

    this.__proto__=Polygon.prototype;
    this.draw();
}


////////////////////////////////////////////////////////////////////////
//
// Oval wrapper (sub class of Rect)
//
function Oval(parent,xy,color)
{
    SVGShape.prototype.constructor.call(this,parent,'oval','ellipse');
    if(xy){
	if(xy instanceof MouseEvent)
	    this._points_from_point(this.event_at(xy));
	else if('width' in xy)
	    this._points_from_rect(xy);
	else
	    this._points_from_point(xy);
    }

    this.set_color(this.color||color);
}
Oval.prototype=Object.create(Rect.prototype,{
    constructor:{
	value:Oval,
	enumerable: false,
	writable: true,
	configurable: true
    }});
Oval.prototype.draw=function()
{
    this.node.setAttribute('cx',(this.points[0].x+this.points[1].x)/2);
    this.node.setAttribute('cy',(this.points[0].y+this.points[1].y)/2);
    this.node.setAttribute('rx',
			   Math.abs(this.points[0].x-this.points[1].x)/2);
    this.node.setAttribute('ry',
			   Math.abs(this.points[0].y-this.points[1].y)/2);

    this.shape_box.update();
}
Oval.prototype.vertexes=function(global)
{
    var cx=(this.points[0].x+this.points[1].x)/2;
    var cy=(this.points[0].y+this.points[1].y)/2;
    var rx=Math.abs(this.points[0].x-this.points[1].x)/2;
    var ry=Math.abs(this.points[0].y-this.points[1].y)/2;

    const step=Math.PI*2/16; // hexadodecagon

    var ar=[];
    for(var d=0;d<2*Math.PI;d+=step){
	ar.push({
	    x:rx*Math.cos(d)+cx,
	    y:ry*Math.sin(d)+cy
	});
    }

    if(global)
	return ar.map(function(p){
	    return this.local2global(p);
	},this);
    else
	return ar;
}


////////////////////////////////////////////////////////////////////////
//
// Polygon Wrapper
//
function Polygon(parent,xy,color)
{
    SVGShape.prototype.constructor.call(this,parent,'polygon','polyline');

    this.polyline=this.node;
    this.polygon=document.createElementNS(SVGNS,'polygon');
    this.vertex=[]

    if(xy){
	if(xy instanceof MouseEvent)
	    var xy=this.event_at(xy);

	this.points=[{x:xy.x,y:xy.y},{x:xy.x,y:xy.y}]
    }

    this.set_color(color);
}
Polygon.prototype=Object.create(SVGShape.prototype,{
    constructor:{
	value:Polygon,
	enumerable: false,
	writable: true,
	configurable: true
    }});

Polygon.prototype._update=function(event,xy,d,m)
{
    if(this.edit_mode)
	SVGShape.prototype._update.call(this,event,xy,d,m);
    else
	this.points[this.points.length-1]={x:xy.x,y:xy.y};
}
Polygon.prototype.draw=function()
{
    var str='';
    this.points.forEach(function(xy){
	 str+=xy.x+" "+xy.y+" ";
     });
    this.node.setAttribute('points',str.trim());

    this.shape_box.update();
}
Polygon.prototype.append_point=function(event)
{
    var xy=this.event_at(event);
    var dx=this.points[0].x-xy.x;
    var dy=this.points[0].y-xy.y;
    var d=Math.sqrt(dx*dx+dy*dy);

    if(d>this.root.polygon_closing_radius){
	if(this.vertex.length==0){
	    var v=document.createElementNS(SVGNS,'circle');
	    v.setAttribute('cx',this.points[0].x);
	    v.setAttribute('cy',this.points[0].y);
	    v.setAttribute('class','vertex');

	    this.vertex.push(v);
	    this.envelope.appendChild(v);
	}

	this.points.push({x:xy.x,y:xy.y});
	var v=document.createElementNS(SVGNS,'circle');
	v.setAttribute('cx',xy.x);
	v.setAttribute('cy',xy.y);
	v.setAttribute('class','vertex');
	this.vertex.push(v);
	this.envelope.appendChild(v);
    }
    else{
	this.points.pop();

	this.vertex.forEach(function(v){
	    this.envelope.removeChild(v);
	},this);
	this.vertex.length=0;

	var attrs=Array.prototype.slice.call(this.polyline.attributes);
	attrs.forEach(function(a){
	    this.polygon.setAttribute(a.name,a.value);
	},this);
	this.envelope.replaceChild(this.polygon,this.polyline);
	this.node=this.polygon;
    }
}
Polygon.prototype.force_close=function(event)
{
    var xy=this.event_at(event);
    this.points[this.points.length-1]={x:xy.x,y:xy.y};
    var pp=this.points.length-1;
    var ppp=pp-1;
    if(this.points[pp].x==this.points[ppp].x &&
       this.points[pp].y==this.points[ppp].y)
	this.points.pop();

    this.vertex.forEach(function(v){
	this.envelope.removeChild(v);
    },this);
    this.vertex.length=0;

    var attrs=Array.prototype.slice.call(this.polyline.attributes);
    attrs.forEach(function(a){
	this.polygon.setAttribute(a.name,a.value);
    },this);
    this.envelope.replaceChild(this.polygon,this.polyline);
    this.node=this.polygon;
}
Polygon.prototype.closed=function(){
    return (this.node==this.polygon);
}

Polygon.prototype.revert=function()
{
    if(this.id)
	SVGShape.prototype.revert.call(this);
    else{
	if(this.points.length>2){
	    this.points.pop();
	    var el=this.vertex.pop();
	    try{
		this.envelope.removeChild(el);
	    }
	    catch(e){}
	    this.draw();
	    this.root.current_obj=this;
	    this.event_map.add_listener(
		this.root.node,
		'mousemove',
		this.root.handlers['draw-polygon'].mousemove.bind(this.root,
								  this.root.node));
	    this.event_map.add_listener(
		this.root.node,
		'mouseup',
		this.root.handlers['draw-polygon'].mouseup.bind(this.root,
								this.root.node),
    		{once:true});
	}
	else{
	    SVGShape.prototype.revert.call(this);
	    this.root.handlers['draw-polygon'].call(this.root);
	}
    }
}

Polygon.prototype.vertexes=function(global)
{
    var ar=this.points.map(function(p){
	return {x:p.x,y:p.y};
    });

    if(global)
	return ar.map(function(p){
	    return this.local2global(p);
	},this);
    else
	return ar;
}
Polygon.prototype.to_polygon=function(points)
{
    if(points){
	if(this.node.getAttribute('transform'))
	    this.node.removeAttribute('transform');

	this.points=points.map(function(p){
	    return {x:p.x,y:p.y};
	});
    }
    else if(this.node.getAttribute('transform')){
	this.points=this.points.map(function(p){
	    return this.local2global(p);
	},this);
	this.node.removeAttribute('transform');
    }

    this.matrix=null;
    this.matrix_inv=null;

    this.draw();
}



////////////////////////////////////////////////////////////////////////
//
// Resize, Reshape handle
//
function ShapeHandle(parent,name)
{
    this.parent=parent;
    this.xy=null;
    this.node=document.createElementNS(SVGNS,'circle');
    this.name=name;
    if(this.name)
	this.node.setAttribute('class','handle '+name);
    else
	this.node.setAttribute('class','handle');

    this.parent.node.appendChild(this.node);

    this.event_map=new EventMap();
}
ShapeHandle.prototype.update=function(event,xy,d,m,suppress_draw)
{
    this.xy={x:this._xy.x+d.x,y:this._xy.y+d.y};
    if(!suppress_draw)
	this.draw();
}
ShapeHandle.prototype.draw=function()
{
    this.node.setAttribute('cx',this.xy.x);
    this.node.setAttribute('cy',this.xy.y);
}
ShapeHandle.prototype.add_listener=function(func)
{
    this.event_map.add_listener(this.node,
				'mousedown',
				func,
				{once:true});

}
ShapeHandle.prototype.remove_listener=function()
{
    this.event_map.add_listener(this.node,
				'mousedown');
}
ShapeHandle.prototype.remove=function()
{
    this.remove_listener();
    try{
	this.parent.node.removeChild(this.node);
    }
    catch(e){};
}

////////////////////////////////////////////////////////////////////////
//
// Bounding box and handles for resizing and moving
//
function ShapeBox(associate)
{
    this.associate=associate
    this.parent=this.associate.parent;
    this.root=this.parent.root;
    this.node=document.createElementNS(SVGNS,'g');
    this.node.setAttribute('class','shape-box');

    this.title=document.createElementNS(SVGNS,'title');
    this.node.appendChild(this.title);

    this.box=document.createElementNS(SVGNS,'rect');
    this.node.appendChild(this.box);

    this.handle={};
    Object.keys(this.HandleList).forEach(function(name){
	this.handle[name]=new ShapeHandle(this,name);
    },this);

    this.event_map=new EventMap();

    this.active=false;
}
ShapeBox.prototype.HandleList=Object.freeze({
    lefttop:     (b)=>{return {x: b.x,           y: b.y}},
    top:         (b)=>{return {x: b.x+b.width/2, y: b.y}},
    righttop:    (b)=>{return {x: b.x+b.width,   y: b.y}},
    right:       (b)=>{return {x: b.x+b.width,   y: b.y+b.height/2}},
    rightbottom: (b)=>{return {x: b.x+b.width,   y: b.y+b.height}},
    bottom:      (b)=>{return {x: b.x+b.width/2, y: b.y+b.height}},
    leftbottom:  (b)=>{return {x: b.x,           y: b.y+b.height}},
    left:        (b)=>{return {x: b.x,           y: b.y+b.height/2}}
});
    
ShapeBox.prototype.update=function()
{
    if(this.associate.id){
	this.node.setAttribute('id',this.associate.id+'.shape-box');
	this.title.textContent=this.associate.id;
    }

    if(this.associate.matrix){
	var m=this.associate.matrix;
	this.node.setAttribute('transform','matrix('+
			       m.a+','+
			       m.b+','+
			       m.c+','+
			       m.d+','+
			       m.e+','+
			       m.f+')');
    }
    else if(this.node.hasAttribute('transform'))
	this.node.removeAttribute('transform');

    var rect=this.associate.node.getBBox();
    this.box.setAttribute('x',rect.x);
    this.box.setAttribute('y',rect.y);
    this.box.setAttribute('width',rect.width);
    this.box.setAttribute('height',rect.height);

    Object.keys(this.HandleList).forEach(function(name){
	var xy=this.HandleList[name](rect);
	this.handle[name].xy=this.HandleList[name](rect);
	this.handle[name].draw();
    },this);
}
ShapeBox.prototype.draw=ShapeBox.prototype.update;

ShapeBox.prototype.set_active=function()
{
    this._add_listeners();
    if(this.active)
	return;
    this.active=true;

    this.root.node.appendChild(this.node);
}

ShapeBox.prototype.unset_active=function()
{
    if(!this.active)
	return;
    this.active=false;

    this._remove_listeners();
    try{
	this.root.node.removeChild(this.node);
    }
    catch(e){}
}

ShapeBox.prototype._add_listeners=function()
{
    this.event_map.add_listener(this.box,
				'mousedown',
				this.on_move_start.bind(this),
				{once:true});
    Object.keys(this.handle).forEach(function(name){
	this.handle[name].add_listener(
	    this.on_resize_start.bind(this,name));
    },this);
}
ShapeBox.prototype._remove_listeners=function()
{
    this.event_map.remove_listener(this.box,'mousedown');
    Object.keys(this.handle).forEach(function(name){
	this.handle[name].remove_listener();
    },this);
}

ShapeBox.prototype.on_move_start=function(event)
{
    this._remove_listeners();
    this.root.handlers['move'].call(this.root,this,event);
}
ShapeBox.prototype.on_resize_start=function(button_name,event)
{
    this._remove_listeners();
    if(event.ctrlKey && this.root.config.allow_rotate){
	this.root.handlers['rotate'].call(this.root,this,button_name,event);
    }
    else
	this.root.handlers['resize'].call(this.root,this,button_name,event);
}


////////////////////////////////////////////////////////////////////////
//
// Outline polygon and handles for reshaping
//
function ShapeEdge(associate)
{
    this.associate=associate
    this.parent=this.associate.parent;
    this.root=this.parent.root;
    this.node=document.createElementNS(SVGNS,'g');
    this.node.setAttribute('class','shape-box');

    this.polygon=document.createElementNS(SVGNS,'polygon');
    this.polygon.setAttribute('stroke',this.associate.color);
    this.polygon.style.cursor=this.root.container.cursor_shape.angle;
    this.node.appendChild(this.polygon);

    this.handle_idx=0;
    this.handle={}
    this.points=this.associate.vertexes(true).map(function(p){
	return this.new_handle(p);
    },this);

    this.event_map=new EventMap();
    this.current_handle=null;

    this.set_select();
}
ShapeEdge.prototype.new_handle=function(xy)
{
    this.handle_idx+=1;
    var name='vertex-'+this.handle_idx;
    this.handle[name]=new ShapeHandle(this,name);
    if(xy)
	this.handle[name].xy={x:xy.x,y:xy.y};

    this.handle[name].node.style.cursor=
	this.root.container.cursor_shape.angle;

    return this.handle[name];
}

ShapeEdge.prototype.update=function(event,suppress_draw)
{
    if(this.associate.id)
	this.node.setAttribute('id',this.associate.id+'.reshape-edge');

    var xy=this.associate.event_at(event,true);

    if(this.current_handle)
	this.current_handle.update(event,
				   xy,
				   {x:xy.x-this.current_handle.start_at.x,
				    y:xy.y-this.current_handle.start_at.y},
				   null,
				   true);

    if(!suppress_draw)
	this.draw();
}
ShapeEdge.prototype.draw=function()
{
    this.points.forEach(function(p){
	p.draw(); 
    },this);

    var str='';
    this.points.forEach(function(p){
	 str+=p.xy.x+" "+p.xy.y+" ";
     });
    this.polygon.setAttribute('points',str.trim());
}

ShapeEdge.prototype.set_active=function()
{
    this._add_listeners();
}
ShapeEdge.prototype.unset_active=function()
{
    this._remove_listeners();
}
ShapeEdge.prototype.set_select=function()
{
    this.set_active();
    this.associate.envelope.setAttribute('display','none');
    this.root.node.appendChild(this.node);
    this.draw();
}
ShapeEdge.prototype.unset_select=function()
{
    this.unset_active();
    try{
	this.root.node.removeChild(this.node);
    }
    catch(e){}
    this.associate.envelope.removeAttribute('display');
}

ShapeEdge.prototype._add_listeners=function()
{
    this.event_map.add_listener(this.polygon,
				'mousedown',
				this.on_mousedown.bind(this));
    this.points.forEach(function(p){
	p.add_listener(
	    this.on_reshape_start.bind(this,p));
    },this);
}
ShapeEdge.prototype._remove_listeners=function()
{
    this.event_map.remove_listener(this.polygon);
    this.points.forEach(function(p){
	p.remove_listener(); 
    });
}
ShapeEdge.prototype.on_mousedown=function(event)
{
    event.stopPropagation();

    cvt_mouseevent(event); // for detect click
    this.event_map.add_listener(this.polygon,
				'mouseup',
				this.on_mouseup.bind(this),
				{once:true});
}
ShapeEdge.prototype.on_mouseup=function(event)
{
    event.stopPropagation();
    var e=cvt_mouseevent(event); // for detect click
    if(e.type=='dblclick')
	this.insert_point(event);
}

ShapeEdge.prototype.insert_point=function(event)
{
    var xy,pos;
    if(event){
	var xy=this.associate.event_at(event,true);
	pos=this._insert_at(xy);
    }
    else{
	var i=this.points.indexOf(this.current_handle);
	if(i<0)
	    i=0;
	pos=(i+1)%this.points.length;
	xy={x:(this.points[i].xy.x+this.points[pos].xy.x)/2,
	    y:(this.points[i].xy.y+this.points[pos].xy.y)/2};
    }

    var obj=this.new_handle(xy);
    obj.add_listener(this.on_reshape_start.bind(this,obj));
    this.points.splice(pos,0,obj);
    this.current_handle=obj;

    this.draw();
}
ShapeEdge.prototype._insert_at=function(xy)
{
    //
    // search nearest edge
    //
    var sz=this.points.length;
    var min_i=null;
    var x0=this.points[sz-1].xy.x;
    var y0=this.points[sz-1].xy.y;
    for(var ci=0;ci<sz;ci++){
	var x1=this.points[ci].xy.x;
	var y1=this.points[ci].xy.y;
	if(x0==x1 && y0==y1)
	    continue;

	var a=y1-y0;
	var b=x0-x1;

	var c=-(a*x0+b*y0);
	var h=Math.abs(a*xy.x+b*xy.y+c)/Math.sqrt(a*a+b*b);

	if(!min_i||min_i.h>h)
	    min_i={i:ci,h:h};

	[x0,y0]=[x1,y1];
    }
    if(min_i)
	return min_i.i;
    else
	return 0;
}

ShapeEdge.prototype.remove_point=function(event)
{
    if(!this.current_handle)
	return;

    var idx=this.points.indexOf(this.current_handle);
    if(idx>=0){
	this.current_handle.remove();
	this.points.splice(idx,1);
	delete this.handle[this.current_handle.name];
    }
    this.current_handle=null;

    this.draw();

    return this.points.length;
}

ShapeEdge.prototype.on_reshape_start=function(obj,event)
{
    this.unset_active();
    this.current_handle=obj;
    this.current_handle.start_at=this.associate.event_at(event,true);
    this.current_handle._xy={x:this.current_handle.xy.x,y:this.current_handle.xy.y}
    this.root.handlers['reshape'].mousedown.call(this.root,this,obj,event);
}

ShapeEdge.prototype.commit=function(force)
{
    var have_diff=false;

    if(force)
	have_diff=true;
    else{
	var vertexes=this.associate.vertexes(true);
	var sz=this.points.length;
	if(sz==vertexes.length){
	    for(var i=0;i<sz;i++){
		if((this.points[i].xy.x!=vertexes[i].x)||
		   (this.points[i].xy.y!=vertexes[i].y)){
		    have_diff=true;
		    break;
		}
	    }
	}
	else
	    have_diff=true;
    }

    if(have_diff){
	this.associate.to_polygon(this.points.map(function(p){
	    return p.xy;
	}));
	this.associate.commit();
    }
    else
	this.revert();
}
ShapeEdge.prototype.revert=function()
{
    this.associate.reshape_end();
}
    

////////////////////////////////////////////////////////////////////////
//
//
//
function SVGEditor(container,el,config)
{
    this.container=container;
    this.node=el;
    this.id=this.node.id;
    this.root=this;
    this.image=null;
    this.children=new Map();

    // for convert event xy 2 SVG xy
    this._xy=this.root.node.createSVGPoint();


    this.mode='draw';
    this.shape=null;

    this.current_obj=null;

    this.seq={};

    this.SHAPES=Object.freeze(['box','polygon','oval','none']);

    //
    // configulation
    //
    this.config={
	allow_shape:{
	    box:true,
	    polygon:true,
	    oval:true,
	    none:true
	},
	allow_rotate:true,
	done_with_select:true,

	keep_segments_on_load_image:false,

	segment_border_size:3,
	segment_border_scale_independent:true,

	segment_border_hover_inc:3,
	segment_bbox_border_size:1,
	segment_bbox_border_dash:2,
	segment_handle_radius:4,
	segment_handle_hover_radius:6,
	segment_vertext_radius:4,
	segment_vertex_hover_radius:6
    };
    if(config){
	for(var prop in this.config){
	    if(prop in config)
		this.config[prop]=config[prop];
	}
    }
    this.config.allow_shape.none=true; // force set
    this.set_mode('draw',this.next_draw_mode());

    //
    // cache of event handlers
    //
    this.event_map=new EventMap();

    //
    // style rule cache
    //
    var selector_id='#'+this.id+' ';
    this.stylesheet={};
    for(var i=0;i<document.styleSheets.length;i++){
	var s=document.styleSheets[i];
	if(s.title!='SVGEditor')
	    continue;

	for(var j=0;j<s.rules.length;j++){
	    switch(s.rules[j].selectorText){
	    case selector_id+'.segment':
		this.stylesheet.segment=s.rules[j].style;
		break;
	    case selector_id+'polyline.segment':
		this.stylesheet.segment_polyline=s.rules[j].style;
		break;
	    case selector_id+'.segment:hover':
		this.stylesheet.segment_hover=s.rules[j].style;
		break;
	    case selector_id+'polyline.segment:hover':
		this.stylesheet.segment_polyline_hover=s.rules[j].style;
		break;
	    case selector_id+'circle.vertex':
		this.stylesheet.vertex=s.rules[j].style;
		break;
	    case selector_id+'circle.vertex:hover':
		this.stylesheet.vertex_hover=s.rules[j].style;
		break;
	    case selector_id+'rect.vertex':
		this.stylesheet.vertex_sq=s.rules[j].style;
		break;
	    case selector_id+'rect.vertex:hover':
		this.stylesheet.vertex_sq_hover=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box rect':
		this.stylesheet.bbox=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box polygon':
		this.stylesheet.reshape_edge=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle':
		this.stylesheet.handle=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle:hover':
		this.stylesheet.handle_hover=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle.lefttop, '+
		    selector_id+'g.shape-box circle.handle.rightbottom':
		this.stylesheet.handle_nw=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle.righttop, '+
		    selector_id+'g.shape-box circle.handle.leftbottom':
		this.stylesheet.handle_ne=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle.top, '+
		    selector_id+'g.shape-box circle.handle.bottom':
		this.stylesheet.handle_n=s.rules[j].style;
		break;
	    case selector_id+'g.shape-box circle.handle.right, '+
		    selector_id+'g.shape-box circle.handle.left':
		this.stylesheet.handle_e=s.rules[j].style;
		break;
	    default:
		//console.log(s.rules[j].selectorText);
	    } // end of switch
	} // end of for each rule
    } // end of for each style-sheet

    Observer.prototype.constructor.call(this,this.container);
}
Observer.mixin(SVGEditor);


SVGEditor.prototype.on_recv=function(sender,channel,...args)
{
    switch(channel){
    case 'selected':
	this.children.forEach(function(v,k,m){
	    if(k==sender.node.id){
		this.current_obj=sender;
	    }
	    else
		v.unset_select(true);
	},this);
	this.next_draw_handler();
	break;
    case 'unselected':
	if(this.current_obj==sender)
	    this.current_obj=null;
	break;
    case 'remove':
	this.children.delete(sender.id);
	if(this.current_obj==sender)
	    this.current_obj=null;
	
	this.remove_downstream(sender);

	// this.container.post(this,'remove',sender.id);
	break;
    case 'append':
	// this.container.post(this,'append',sender.dump());
	break;
    case 'update':
	// this.container.post(this,'update',sender.dump());
	break;
    case 'keypress':
	switch(args[0].key){
	case 'Insert':
	    if(this.mode=='reshape')
		this.current_obj.insert_point();
	    break;
	case 'Delete':
	    if(this.mode=='reshape')
		this.current_obj.remove_point();
	    else
		this.remove_current_obj();
	    break;
	case 'Escape':
	    if(this.current_obj){
		if(this.event_map.has_listener(this.node,'mouseup'))
		    this.event_map.func(this.node,'mouseup')(
			new MouseEvent('mouseup',{button:1}));
		else if(this.current_obj instanceof ShapeEdge)
		    this.current_obj.revert();
		else
		    this.current_obj.unset_select();
		/*
		else if(this.current_obj.selected)
		    this.current_obj.unset_select();
		else{
		    //
		    // fail safe
		    //
		    this.current_obj=null;
		    sender.post(this,channel,...args);
		}
		*/
	    }
	    else
		sender.post(this,channel,...args);
	    break;
	case 'Control':
	    this.stylesheet.handle_nw.cursor=
		this.root.container.cursor_shape.rotate;
	    this.stylesheet.handle_ne.cursor=
		this.root.container.cursor_shape.rotate;
	    this.stylesheet.handle_n.cursor=
		this.root.container.cursor_shape.rotate;
	    this.stylesheet.handle_e.cursor=
		this.root.container.cursor_shape.rotate;
	    break;
	case 'F3':
	    if(this.mode=='reshape')
		this.handlers['reshape'].mouseup.call(
		    this,
		    this.node,
		    new MouseEvent('dblclick',
				   {button:0,
				    shiftKey:args[0].shiftKey}));
	    else if(this.current_obj)
		this.handlers['reshape'].call(this,this.current_obj);
	    break;
	}
	break;
    case 'keyup':
	switch(args[0].key){
	case 'Control':
	    this.stylesheet.handle_nw.cursor='nw-resize';
	    this.stylesheet.handle_ne.cursor='ne-resize';
	    this.stylesheet.handle_n.cursor='n-resize';
	    this.stylesheet.handle_e.cursor='e-resize';
	    break;
	}
	break;
    }
}

SVGEditor.prototype.event_at=function(e)
{
    this._xy.x=e.clientX;
    this._xy.y=e.clientY;

    return this._xy.matrixTransform(this.node.getScreenCTM().inverse());
}

SVGEditor.prototype.append=function(shape)
{
    if(!shape)
	return;

    if(!shape.id){
	var id=shape.node.id||this.new_id(this.shape);
	shape.commit(id);
    }
    this.children.set(shape.id,shape);
    this.add_downstream(shape);
}
SVGEditor.prototype.remove=function(shape)
{
    if(!('node' in shape))
	shape=this.children.get(shape);
    
    if(!shape)
	return;

    shape.post(this,'remove');
}
SVGEditor.prototype.remove_current_obj=function()
{
    if(!this.current_obj)
	return;

    this.current_obj.post(this,'remove');
}


SVGEditor.prototype.load_image=function(path,image_sz)
{
    (new ColorTable()).reset();
    this.seq={};
    this.event_map.clear();

    if(!(this.image && this.config.keep_segments_on_load_image)){
	this.children.clear();
	while(this.node.firstChild)
	    this.node.removeChild(this.node.firstChild);

	this.image=document.createElementNS(SVGNS,'image');
	this.image.setAttribute('id','base-image');
	this.node.appendChild(this.image);
    }

    this.image.setAttribute('x',0);
    this.image.setAttribute('y',0);
    this.image.setAttribute('width',image_sz.width);
    this.image.setAttribute('height',image_sz.height);
    this.image.setAttributeNS(XLINKNS,'href',path);
}

SVGEditor.prototype.load_segments=function(obj)
{
    try{
	if(obj instanceof Array)
	    obj.forEach(function(o){
		this.append(SVGShape.restore(o));
	    },this);
	else
	    this.append(SVGShape.restore(obj));
    }
    catch(e){
	console.error(e);
    }
}

SVGEditor.prototype.rescale=function(scale)
{
    this.node.currentScale=scale;

    if(this.config.segment_border_scale_independent)
	this.apply_segment_border_size();

    var w=this.config.segment_bbox_border_size/scale;
    if(w<0.1)
	w=0.1;
    var d=this.config.segment_bbox_border_dash/scale;
    if(d<0.1)
	d=0.1;
    var r=this.config.segment_handle_radius/scale;
    if(r<0.1)
	r=0.1;
    var hr=this.config.segment_handle_hover_radius/scale;
    if(hr<0.1)
	hr=0.1;

    this.stylesheet.vertex['stroke-width']=w;
    this.stylesheet.vertex['r']=r;
    this.stylesheet.vertex_hover['r']=hr;

    this.stylesheet.bbox['stroke-width']=w;
    this.stylesheet.bbox['stroke-dasharray']=""+d+","+d;

    this.stylesheet.handle['stroke-width']=w;
    this.stylesheet.handle['r']=r;
    this.stylesheet.handle_hover['r']=hr;

    this.polygon_closing_radius=
	this.config.segment_handle_hover_radius/scale;
}
SVGEditor.prototype.set_position=function(left,top,width,height)
{
    this.node.setAttribute('width',width);
    this.node.setAttribute('height',height);
    this.node.setAttribute('viewbox',"0 0 "+width+" "+height);
    this.node.style.left=left;
    this.node.style.top=top;
}

SVGEditor.prototype.apply_segment_border_size=function()
{
    var sz=this.config.segment_border_size;
    if(this.config.segment_border_scale_independent){
	var sz=sz/this.node.currentScale;
	if(isNaN(sz)||sz<1)
	    sz=1;
    }
    this.stylesheet.segment['stroke-width']=sz;
    this.stylesheet.segment_polyline['stroke-dasharray']=sz+','+sz;
    this.stylesheet.segment_polyline_hover['stroke-width']=sz;
    this.stylesheet.segment_hover['stroke-width']=
	sz+this.config.segment_border_hover_inc/this.node.currentScale;

    this.stylesheet.reshape_edge['stroke-width']=sz;
    this.stylesheet.reshape_edge['stroke-dasharray']=sz+','+sz;
}

SVGEditor.prototype.new_id=function(){
    if(!this.shape)
	return;

    if(!this.seq[this.shape])
	this.seq[this.shape]=0;

    var id;
    do{
	this.seq[this.shape]+=1;
	id=this.shape+'-'+this.seq[this.shape];
    } while(this.node.getElementById(id));

    return id;
}

SVGEditor.prototype.set_draw_mode=function(shape)
{
    if(this.mode=='reshape'||
       this.event_map.has_listener(this.node,'mousemove')||
       this.event_map.has_listener(this.node,'mouseup')){
	//this.reserve_draw_mode(shape);
	return;
    }
    else
	this.next_draw_handler(shape);
}
SVGEditor.prototype.fw_draw_mode=function()
{
    this.set_draw_mode(this.next_draw_mode());
}
SVGEditor.prototype.bw_draw_mode=function()
{
    this.set_draw_mode(this.prev_draw_mode());
}

SVGEditor.prototype.next_draw_handler=function(shape)
{
    if(shape && this.config.allow_shape[shape]){
	this.shape=shape;
    }
    else if(this._shape){
	this.shape=this._shape;
    }
    delete this._shape;

    this.handlers['draw-'+(this.shape||'none')].call(this);
}

SVGEditor.prototype.set_mode=function(major,minor)
{
    this.mode=major;
    if(minor)
	this.shape=minor;

    if(major)
	this.mode_name=(minor ? major+'-'+minor : major);
    else
	this.mode_name='none';
}
SVGEditor.prototype.next_draw_mode=function()
{
    var sz=this.SHAPES.length;
    var i=this.SHAPES.indexOf(this.shape)+1;
    for(var j=0;j<sz;j++){
	var idx=(i+j)%sz;
	if(this.config.allow_shape[this.SHAPES[idx]])
	   return this.SHAPES[idx];
    }

    return 'none';
}
SVGEditor.prototype.prev_draw_mode=function()
{
    var sz=this.SHAPES.length;
    var i=this.SHAPES.indexOf(this.shape)-1;
    for(var j=0;j<sz;j++,i--){
	if(i<0)
	    i=sz-1;
	if(this.config.allow_shape[this.SHAPES[i]])
	   return this.SHAPES[i];
    }

    return 'none';
}
SVGEditor.prototype.reserve_draw_mode=function(shape)
{
    if(this.config.allow_shape[shape])
	this._shape=shape;
    else
	this._shape='none';
}


SVGEditor.prototype.handlers={}

////////////////////////////////////////////////////////////////////////
//
// drow-box mode (basic mode) mouse event handlers
//
SVGEditor.prototype.handlers['draw-box']=function(){
    this.set_mode('draw','box');
	
    this.children.forEach(function(v,k,m){
	v.set_active();
    },this);
    
    this.event_map.remove_listener(this.node);
    this.event_map.add_listener(
	this.node,
	'mousedown',
	this.handlers[this.mode_name].mousedown.bind(this,this.node),
	{once:true});

    this.node.style.cursor='default';
    this.container.post(this,'set-draw-shape','box');
}
SVGEditor.prototype.handlers['draw-box'].mousedown=function(obj,event)
{
    cvt_mouseevent(event); // for detecting click and dblclick

    //
    // clear all selected items
    //
    this.children.forEach(function(v,k,m){
	v.unset_select();
    },this);

    if(event.buttons&1!=1){
	this.handlers[this.mode_name].call(this);
	return;
    }

    this.node.style.cursor='crosshair';
    this.children.forEach(function(v,k,m){
	v.unset_active();
    },this);

    event.stopPropagation();
    this.event_map.remove_listener(obj,'mousedown');

    switch(this.shape){
    case 'box':
	this.current_obj=new Rect(this,event);
	break
    case 'polygon':
	this.current_obj=new Polygon(this,event);
	break
    case 'oval':
	this.current_obj=new Oval(this,event);
	break
    case 'none':
    default:
	throw 'fix me (Unknown shape)';
    }

    this.event_map.add_listener(
	obj,
	'mousemove',
	this.handlers[this.mode_name].mousemove.bind(this,obj));
    this.event_map.add_listener(
	obj,
	'mouseup',
	this.handlers[this.mode_name].mouseup.bind(this,obj),
    	{once:true});
}
SVGEditor.prototype.handlers['draw-box'].mousemove=function(obj,event)
{
    event.stopPropagation();

    //
    // mousemove event raises very high freqency, and
    // SVGShape#update() method is too havey to real-time drawing.
    //
    // So this process is throttled every 33msec.
    //
    if(this.handlers[this.mode_name].mousemove.timeout)
	return;
    this.handlers[this.mode_name].mousemove.timeout=-1;

    //
    // work around for dropping mouse-up event issue
    //
    if(!(event.buttons&1) && this.mode_name!='draw-polygon'){
	return this.event_map.func(obj,'mouseup')(event);
    }

    this.current_obj.update(event);

    var self=this;
    this.handlers[this.mode_name].mousemove.timeout=setTimeout(function(){
	delete self.handlers[self.mode_name].mousemove.timeout;
    },33);
}
SVGEditor.prototype.handlers['draw-box'].mouseup=function(obj,event)
{
    event.stopPropagation();

    if(this.handlers[this.mode_name].mousemove.timeout){
	try{
	    clearTimeout(this.handlers[this.mode_name].mousemove.timeout);
	    delete this.handlers[this.mode_name].mousemove.timeout;
	}
	catch(e){}
    }

    this.event_map.remove_listener(obj,'mouseup');
    this.event_map.remove_listener(obj,'mousemove');

    if(this.current_obj){
	var e=cvt_mouseevent(event);

	if(this.mode=='move' &&
	   e.type=='dblclick' &&
	   !e.button &&
	   this.config.allow_shape.polygon){
	    this.handlers['reshape'].call(this,this.current_obj);
	    return;
	}
	else if(event.button || e.type!='mouseup'){
	    this.current_obj.revert();
	}
	else{
	    switch(this.mode){
	    case 'reshape':
		this.handlers['reshape'].call(this);
		return;
		break;
	    case 'draw':
		var bbox=this.current_obj.bbox();
		if(bbox.width>1 && bbox.height>1){
		    this.append(this.current_obj);
		    if(this.config.done_with_select)
			this.current_obj.set_select();
		    else
			this.current_obj=null;
		}
		else{
		    this.current_obj.revert();
		}
		break;
	    case 'move':
	    case 'resize':
	    case 'rotate':
	    default:
		this.current_obj.commit();
		this.current_obj.set_select(true);
		break;
	    }
	}
    }

    
    this.next_draw_handler();
}


////////////////////////////////////////////////////////////////////////
//
// draw-polygon mode mouse event handlers
//
SVGEditor.prototype.handlers['draw-polygon']=function(){
    this.set_mode('draw','polygon');
	
    this.children.forEach(function(v,k,m){
	v.set_active();
    },this);
    
    this.event_map.remove_listener(this.node);
    this.event_map.add_listener(
	this.node,
	'mousedown',
	this.handlers[this.mode_name].mousedown.bind(this,this.node),
	{once:true});

    this.node.style.cursor='default';
    this.container.post(this,'set-draw-shape','polygon');
}
SVGEditor.prototype.handlers['draw-polygon'].mousedown=
    SVGEditor.prototype.handlers['draw-box'].mousedown;
SVGEditor.prototype.handlers['draw-polygon'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['draw-polygon'].mouseup=function(obj,event)
{
    if(!this.handlers['draw-polygon'].mouseup.main.call(this,obj,event))
	this.next_draw_handler();
}

SVGEditor.prototype.handlers['draw-polygon'].mouseup.main=function(obj,event)
{
    event.stopPropagation();

    if(this.handlers[this.mode_name].mousemove.timeout){
	try{
	    clearTimeout(this.handlers[this.mode_name].mousemove.timeout);
	    delete this.handlers[this.mode_name].mousemove.timeout;
	}
	catch(e){}
    }

    this.event_map.remove_listener(obj,'mousedown');
    this.event_map.remove_listener(obj,'mouseup');
    this.event_map.remove_listener(obj,'mousemove');

    if(!this.current_obj)
	return;

    var e=cvt_mouseevent(event);
    if(event.button){
	this.current_obj.revert();
	return true;
    }

    //
    // for catch click and dblclick
    //
    this.event_map.add_listener(
	obj,
	'mousedown',
	cvt_mouseevent,
	{once:true});

    if(e.type=='dblclick')
	this.current_obj.force_close(event);
    else
	this.current_obj.append_point(event);

    if(this.current_obj.closed()){
	if(this.current_obj.points.length<=2)
	    this.current_obj.revert();
	else{
	    var bbox=this.current_obj.bbox();
	    if(bbox.width>1 && bbox.height>1){
		this.append(this.current_obj);
		if(this.config.done_with_select)
		    this.current_obj.set_select();
		else
		    this.current_obj=null;
		}
	    else{
		this.current_obj.revert();
	    }
	}
    }
    else{
	this.event_map.add_listener(
	    obj,
	    'mousemove',
	    this.handlers['draw-polygon'].mousemove.bind(this,obj))
	this.event_map.add_listener(
	    obj,
	    'mouseup',
	    this.handlers['draw-polygon'].mouseup.bind(this,obj),
    	    {once:true});
	
	return(true);
    }
}

////////////////////////////////////////////////////////////////////////
//
// drow-oval mode mouse event handlers
//
SVGEditor.prototype.handlers['draw-oval']=function(){
    this.set_mode('draw','oval');
	
    this.children.forEach(function(v,k,m){
	v.set_active();
    },this);
    
    this.event_map.remove_listener(this.node);
    this.event_map.add_listener(
	this.node,
	'mousedown',
	this.handlers[this.mode_name].mousedown.bind(this,this.node),
	{once:true});

    this.node.style.cursor='default';
    this.container.post(this,'set-draw-shape','oval');
}
SVGEditor.prototype.handlers['draw-oval'].mousedown=
    SVGEditor.prototype.handlers['draw-box'].mousedown;
SVGEditor.prototype.handlers['draw-oval'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['draw-oval'].mouseup=
    SVGEditor.prototype.handlers['draw-box'].mouseup;


////////////////////////////////////////////////////////////////////////
//
// draw-none mouse event handlers
//
SVGEditor.prototype.handlers['draw-none']=function(){
    //
    // fix me: sweap and select
    //
    this.node.style.cursor='default';
    this.container.post(this,'set-draw-shape','none');
}

////////////////////////////////////////////////////////////////////////
//
// move mode mouse event handlers
//
SVGEditor.prototype.handlers['move']=function(target,event){
    this.set_mode('move');

    cvt_mouseevent(event); // for detect click/dblclick

    this.children.forEach(function(v,k,m){
	if(target.associate.node.id!=k)
	    v.unset_active();
    },this);
    
    this.event_map.remove_listener(this.node);

    event.stopPropagation();
    this.event_map.remove_listener(this.node,'mousedown');

    this.current_obj=target.associate;
    this.current_obj.move_start(event);

    this.event_map.add_listener(
	this.node,
	'mousedown',
	cvt_mouseevent,
	{once:true});
    this.event_map.add_listener(
	this.node,
	'mousemove',
	this.handlers['move'].mousemove.bind(this,this.node))
    this.event_map.add_listener(
	this.node,
	'mouseup',
	this.handlers['move'].mouseup.bind(this,this.node),
    	{once:true});
}
SVGEditor.prototype.handlers['move'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['move'].mouseup=
    SVGEditor.prototype.handlers['draw-box'].mouseup;


////////////////////////////////////////////////////////////////////////
//
// resize mode mouse event handlers
//
SVGEditor.prototype.handlers['resize']=function(target,button_name,event){
    this.set_mode('resize');

    this.children.forEach(function(v,k,m){
	if(target.associate.node.id!=k)
	    v.unset_active();
    },this);
    
    this.event_map.remove_listener(this.node);

    event.stopPropagation();
    this.event_map.remove_listener(this.node,'mousedown');

    this.current_obj=target.associate;
    this.current_obj.resize_start(event,button_name);

    this.event_map.add_listener(
	this.node,
	'mousemove',
	this.handlers['resize'].mousemove.bind(this,this.node))
    this.event_map.add_listener(
	this.node,
	'mouseup',
	this.handlers['resize'].mouseup.bind(this,this.node),
    	{once:true});
}
SVGEditor.prototype.handlers['resize'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['resize'].mouseup=
    SVGEditor.prototype.handlers['draw-box'].mouseup;


SVGEditor.prototype.handlers['rotate']=function(target,button_name,event){
    this.set_mode('rotate');

    this.children.forEach(function(v,k,m){
	if(target.associate.node.id!=k)
	    v.unset_active();
    },this);
    
    this.event_map.remove_listener(this.node);

    event.stopPropagation();
    this.event_map.remove_listener(this.node,'mousedown');

    this.current_obj=target.associate;
    this.current_obj.rotate_start(event,button_name);

    this.event_map.add_listener(
	this.node,
	'mousemove',
	this.handlers['rotate'].mousemove.bind(this,this.node))
    this.event_map.add_listener(
	this.node,
	'mouseup',
	this.handlers['rotate'].mouseup.bind(this,this.node),
    	{once:true});
}
SVGEditor.prototype.handlers['rotate'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['rotate'].mouseup=
    SVGEditor.prototype.handlers['draw-box'].mouseup;


////////////////////////////////////////////////////////////////////////
//
// resize mode mouse event handlers
//
SVGEditor.prototype.handlers['reshape']=function(target,event){
    this.set_mode('reshape');

    this.event_map.remove_listener(this.node);

    this.event_map.add_listener(
	this.node,
	'mousedown',
	this.handlers['reshape'].mousedown.bind(this,this.node,null))

    if(target){
	target.reshape_start();
	this.current_obj=target.edit_mode.edge;
    }
    else
	this.current_obj.set_active();
	
}
SVGEditor.prototype.handlers['reshape'].mousedown=function(target,vertex,event)
{
    event.stopPropagation();

    cvt_mouseevent(event);

    if(target==this.node){
	this.event_map.add_listener(
	    this.node,
	    'mouseup',
	    this.handlers['reshape'].mouseup.bind(this,this.node),
    	    {once:true});
    }
    else{
	this.event_map.add_listener(
	    this.node,
	    'mousemove',
	    this.handlers['reshape'].mousemove.bind(this,target));
	this.event_map.add_listener(
	    this.node,
	    'mouseup',
	    this.handlers['reshape'].mouseup.bind(this,target),
    	    {once:true});
    }
}
SVGEditor.prototype.handlers['reshape'].mousemove=
    SVGEditor.prototype.handlers['draw-box'].mousemove;
SVGEditor.prototype.handlers['reshape'].mouseup=function(obj,event)
{
    event.stopPropagation();

    if(this.handlers[this.mode_name].mousemove.timeout){
	try{
	    clearTimeout(this.handlers[this.mode_name].mousemove.timeout);
	    delete this.handlers[this.mode_name].mousemove.timeout;
	}
	catch(e){}
    }

    this.event_map.remove_listener(obj,'mouseup');
    this.event_map.remove_listener(obj,'mousemove');

    var e=cvt_mouseevent(event);

    if(event.button && e.type!='mouseup')
	this.current_obj.revert();
    else if((event.type=='dblclick' || e.type=='dblclick')){
	if(obj instanceof ShapeEdge){
	    if(obj.remove_point()<=1){
		this.current_obj.commit();
		this.remove_current_obj();
	    }
	    else{
		return this.handlers['reshape'].call(this);
	    }
	}
	else{
	    this.current_obj.commit(e.shiftKey);
	}
    }
    else
	return this.handlers['reshape'].call(this);

    this.next_draw_handler();
}


module.exports=SVGEditor;
