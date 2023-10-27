//
// AnnE -- ANNotation Editor for machine-learning training image 
// NISHI, Takao <nishi.t.es@osaka-u.ac.jp>
//
/*
Copyright 2017-2023 NISHI, Takao <nishi.t.es@osaka-u.ac.jp>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
"use strict";

const DEBUG=true;

const Electron=require('electron');
const App=Electron.app;
const BrowserWindow=Electron.BrowserWindow;
const Ipc=Electron.ipcMain;
//const Config = require('electron-config');
//const config = new Config();

const ImageList=require('./js/imagelist');

const WINDOW_MIN_WIDTH=128;
const WINDOW_MIN_HEIGHT=128;

let config={
    gallery:{
	window:{
	    x:null,
	    y:null,
	    width:900,
	    height:600
	},
	cwd:'.'
    },
    easel:{
	window:{
	    x:null,
	    y:null,
	    width:900,
	    height:600
	}
    },
    note:{
	window:{
	    x:null,
	    y:null,
	    width:900,
	    height:600
	}
    }
};


let gallery=null;
let easel=null;

let imagelist=new ImageList();;


function open_easel(file)
{
    var obj=imagelist.get_item_by_path(file).dump({with_size:true});
    if(!obj)
	throw 'file not found';

    if(easel){
	easel.webContents.send('easel-open-file',obj);
	easel.focus();
    }
    else{
	easel=new BrowserWindow({width:config.easel.window.width,
				 height:config.easel.window.width,
				 useContentSize:true,
				 //frame:false
				});
	if(DEBUG)
	    easel.openDevTools();
	easel.setMenu(null);
	easel.setMinimumSize(WINDOW_MIN_WIDTH,
			     WINDOW_MIN_HEIGHT);
	easel.loadURL('file://'+__dirname+'/html/easel.html');
	easel.on("closed",()=>{
	    if(gallery)
		gallery.webContents.send('gallery-close-file',
					      easel.open_file);
	    easel=null;
	});
    }
    easel.open_file=obj;
}


App.on("window-all-closed",()=>{
    if(process.platform!="darwin"){
	App.quit();
    }
});


App.on("ready",()=>{
    gallery=new BrowserWindow({
	width:config.gallery.window.width,
	height:config.gallery.window.height,
	useContentSize:true
    });
    if(DEBUG)
	gallery.openDevTools();
    gallery.setMenu(null);
    gallery.setMinimumSize(WINDOW_MIN_WIDTH,
				WINDOW_MIN_HEIGHT);
    gallery.loadURL('file://'+__dirname+'/html/gallery.html');
    gallery.on("closed",()=>{
	gallery=null;
    });
});


var cwd=imagelist.cwd||config.gallery.cwd;
Ipc.on('gallery-chdir',function(event,arg){
    event.sender.send('gallery-cwd-entries',
		      imagelist.scan(arg||cwd).dump());
});
Ipc.on('gallery-open-file',function(event,arg){
    open_easel(arg);
    event.sender.send('gallery-open-file',
		      easel.open_file);
});
Ipc.on('easel-file-query',function(event,arg){
    event.sender.send('easel-open-file',
		      easel.open_file);
});
