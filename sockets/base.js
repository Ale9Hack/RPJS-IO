'use strict';

var jwt = require('jsonwebtoken');
var cookie= require('cookie');
var chatController=require('./controllers/chat.js');
var validate = require('./lib/validate.js');
var userController=require('./controllers/user.js');
function usersTemplateSystem(){
/*jshint validthis: true */
this.online={}
this.assign = function (name,socket){
this.online[name]={socket:socket}	
}
this.del = function (name){
delete this.online[name];	
}
}

module.exports = function (io) { 

var users= new usersTemplateSystem();
var userCount=0;

var chat = io
.of('/chat')
// Socket Auth
.use(function (socket,next){
	 var auth = cookie.parse(socket.handshake.headers.cookie);
	 var decoded = false
	 try {
	   decoded = jwt.verify(auth.token, 'omg');
	 } catch(err) {
	  console.log('Token invalido');
	  //userCount=userCount-1;
	  //socket.disconnect();
	 }
	 finally {	
	 	if(decoded !==false){
	 	console.log('Token Valido');
	 	userController.tokenValidate(function(name){
	 	console.log('El token es de '+name);
	 	});	
	 	}
	 	else
	 	{

	 	}
	 	next();
	 }
	
})
.on('connection', function(socket){
     // On conection
      var address = socket.handshake.address;
      userCount=userCount+1;
      socket.StreamB64file = {};
	  console.log(address+': '+socket.id+' Contectado');
	  console.log(userCount+' Usuarios conectados');
	  socket.emit('connection successful',{usersOnLine:Object.keys(users.online)})

	 // On socket login
	 socket.on('login',function(name){
	 try {
	 	validate.name(name);
	 }

	 catch(err) {
 		console.log(err);
	 	socket.emit('chat message', {
	 	username:'SISTEMA',
	 	msg:'Nombre no permitido, por favor recargue la pagina y ingrese otro nombre.'
	 	});
	 	socket.disconnect();
		return -1;	
	 }
	 
	 if (!users.online[name]){
	 	if (!socket.username) {socket.username=name} //for devs
		 users.assign(name,socket);
		 console.log(socket.id+' como '+name);
		 socket.emit('login finish',{username:name});
		 chat.emit('users public connects',name);
	 }

	else {	
	 	socket.emit('chat message', {
	 	username:'SISTEMA',
	 	msg:'Nombre en uso. Por favor recargue la pagina y ingrese otro nombre'
	 	});
	 	socket.disconnect();
	}		 
	 });


	socket.on('disconnect', function(){
	userCount=userCount-1;
	 console.log(( socket.username || socket.id +' Usuario sin identificar.')
	 +' Desconectado');
	 console.log(userCount+' Usuarios conectados');
	 if (socket.username) {
	 	users.del(socket.username);
	 }
  });

// socket data received validate
	socket.on('file validate', function(file){
		socket.StreamB64file.validate = {};
		socket.StreamB64file.validate.type = file.type;
		socket.StreamB64file.validate.dataBase64Key= file.dataBase64Key;
		socket.StreamB64file.validate.length = file.length;
		console.log(file);
		validate.file(socket.StreamB64file.validate);
		if (validate.next){
		socket.emit('file validate',{next:validate.next});
		}
		else {
		socket.emit('file validate',{err:validate.err});
		}
	
	});

	socket.on('file upload',function(base64){
	if (typeof socket.username !== 'undefined'){	

	socket.StreamB64file.file = validate.upload(base64.file,socket.StreamB64file.validate);

	socket.emit('file validate',{uploadComplete:'true'});
	}
	else {
		socket.emit('file validate', {err:'Method not allowed'});
	}
     //event error here

	});

  socket.on('chat message', function(msg){
  	var image;
  	if( typeof socket.username !== 'undefined'){
  		
 		if (socket.StreamB64file.file !== false){
 			 image=socket.StreamB64file.file;
 			 delete socket.StreamB64file.file;
 			 delete socket.StreamB64file.validate;
 		}

  		chat.emit('chat message',{
  		msg:msg.body,
  		image: image,
  		username:socket.username
  		});
        console.log(socket.username+' Envio un mensaje el '+new Date());
        chatController.databaseSave(socket.username,msg.text);
       // chatController.chatShow();

  }
  else {
		socket.emit('chat message', {
			msg:'Debes ingresar un nombre',
			username:'SISTEMA'
			}
			);
		//socket.disconnect();

}

});

 socket.on('private message', function (from,to,msg) {
    console.log('mensaje privado');
  });

});


};

