//
//
//
function Observer(upstream)
{
    this.upstream=upstream;
    this.downstream=[];
}
Observer.prototype.add_downstream=function(obj)
{
    if(('on_recv' in obj)){
	this.downstream.push(obj);
	obj.upstream=this;
    }
    else
	throw 'does not have Observer interfaces';
}
Observer.prototype.remove_downstream=function(obj)
{
    var idx=this.downstream.indexOf(obj);
    if(idx>=0){
	this.downstream[idx].upstream=null;
	this.downstream.splice(idx,1);
    }
}
Observer.prototype.remove_me=function(rechain)
{
    if(this.upstream){
	var us=this.upstream;
	this.upstream.remove_downstream(this);
	if(rechain)
	    this.downstream.forEach(function(o){
		us.add_downstream(o);
	    });
    }
    else if(rechain)
	this.downstream.forEach(function(o){
	    o.upstream=null;
	});
}
Observer.prototype.include=function(obj)
{
    return this.downstream.indexOf(obj)>=0;
}

Observer.prototype.retract=function(channel,...args)
{
    if(this.upstream && (('on_recv' in this.upstream)))
	this.upstream.on_recv(this,channel,...args);
}
Observer.prototype.notify=function(channel,...args)
{
    this.downstream.forEach(function(v,k,m){
	v.post(this,...args);
    },this);
}
Observer.prototype.broadcast=function(channel,...args)
{
    this.retract(channel,...args);
    this.downstream.forEach(function(v,k,m){
	v.post(this,...args);
    },this);
}
Observer.prototype.relay=function(sender,channel,...args)
{
    this.upstream.post(sender,channel,...args);
}
Observer.prototype.post=function(sender,channel,...args)
{
    this.on_recv(sender,channel,...args);
}
Observer.prototype.on_recv=function(sender,channel,...args)
{
    throw 'not implemented'
}

Observer.mixin=function(klass)
{
    for(prop in Observer.prototype)
	klass.prototype[prop]=Observer.prototype[prop]
}

module.exports=Observer;
