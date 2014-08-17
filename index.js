var GRID_ROWS = 9,
    GRID_COLUMNS = 9,
    INIT_RANDOM_NUM = 13;

var randomGridArr = initRandomGrid(GRID_ROWS, GRID_COLUMNS, INIT_RANDOM_NUM);

var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    path = require('path');

var mine = {
    ".css": "text/css",
    ".gif": "image/gif",
    ".html": "text/html",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".swf": "application/x-shockwave-flash",
    ".tiff": "image/tiff",
    ".txt": "text/plain",
    ".wav": "audio/x-wav",
    ".wma": "audio/x-ms-wma",
    ".wmv": "video/x-ms-wmv",
    ".xml": "text/xml"
}; 

var server = http.createServer(function(req, res) {
	
	var pathname = url.parse(req.url).pathname;

	if(pathname === '/'){
		pathname = "index.html";
	}

	pathname = "view/" + pathname;

	fs.exists(pathname, function(exists){ 
        if(exists){
            var type = path.extname(pathname);
            if(mine[type]){
                res.writeHead(200, {"Content-Type": mine[type]}); 
            }else{
                res.writeHead(200, {"Content-Type": "application/octet-stream"});
            }

            fs.readFile(pathname,function (err,data){ 
                res.end(data); 
            }); 
        } else { 
            res.writeHead(404, {"Content-Type": "text/html"}); 
            res.end("<h1>404 Not Found</h1>"); 
        } 
    });

}).listen(8000);


var io = require('socket.io').listen(server);
var waitingClients = [];
var allRooms = {};
var allSocket = {};

io.on('connection', function(socket) {
	// console.log('connection ' + socket.id + ' successful!');

    var client = {
        socketId:socket.id,
        name:false
    }

    socket.emit('open', {
        client : client,
        row : GRID_ROWS,
        column :GRID_COLUMNS
    });

    socket.on('createClient', function(clientInfo) {
        allSocket[socket.id] = socket;

        waitingClients.push(clientInfo);

        // console.log(waitingClients)
        
        if(waitingClients.length === 2){
            var room = new Room(waitingClients[0], waitingClients[1]);

            allSocket[waitingClients[0].socketId].emit('startGame', room);
            allSocket[waitingClients[1].socketId].emit('startGame', room);

            allRooms[waitingClients[0].socketId] = allRooms[waitingClients[1].socketId] = room;
            waitingClients = [];
        }
    });

    socket.on('run', function(data) {
        var room = data.room;
        var turn = data.turn === 'cat' ? 'people' : 'cat';
        allSocket[room.members[turn].socketId].emit('run', data);
    });

    socket.on('disconnect', function() {
        console.log('disconnect : ');
        console.log(socket.id)

        if(waitingClients[0].socketId === socket.id) {
            waitingClients = [];
        }else{
            if(allClients[socket.id]) {
                var rmRoom = allClients[socket.id];
                var OppClientId = rmRoom.getOpponent(socket.id);
                delete allClients[socket.id];
                delete allClients[OppClientId];

                allSocket[OppClientId].emit('restart');
                // waitingClients.push()
            }
        }



    });

	
});

function initRandomGrid(rows, columns, randomNum) {
    var randomArr = [];
    for(var i = 0; i<randomNum; i++) {
        var r = [Math.floor(Math.random() * rows), Math.floor(Math.random() * columns)];
        randomArr.push(r);
    }

    return randomArr;
}

function Room(client1, client2) {
    this.roomId = client1.socketId + client2.socketId;

    this.members = {
        cat : client1,
        people : client2
    };
    this.randomGridArr = [];
    this.initRandomGrid();
}

Room.prototype.initRandomGrid = function() {
    var rows = GRID_ROWS, 
        columns = GRID_COLUMNS, 
        randomNum = INIT_RANDOM_NUM,
        randomArr = [];

    for(var i = 0; i<randomNum; i++) {
        var r = [Math.floor(Math.random() * rows), Math.floor(Math.random() * columns)];
        randomArr.push(r);
    }

    this.randomGridArr = randomArr;
    return randomArr;
};

Room.prototype.getOpponent = function(clientId) {
    return this.roomId.replace(clientId, '');
};