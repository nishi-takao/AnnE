//
//
//

function AnnotationNode()
{
    this.id=null;
    this.parent=null;
    this.children=null;
    this.content=null;
}

function Annotator(config)
{
    this.config={
	model:'tree', // flat, tree, forest
	max_depth:1,  // -1:unlimited; in case of model=='flat', this will be ignored
	link_by:'id', // val, id, index
	mapping:{
	    uniq_id:'id', // null, prop or function
	    parent: 'parent',
	    children: 'children',
	    segment_shape:'shape',  // prop or function 
	    segment_points:'points',// prop or function 
	},
	autoprops:{
	    // property name: function
	}
    }
    for(var prop in config)
	this.config[prop]=config[prop];

    this.nodes=[];
}
Annotator.prototype.append=function(obj)
{
    if(!obj.id)
	obj.id=this.new_id();

    this.items[obj.id]=obj;
}
Annotator.prototype.remove=function(obj)
{

}
