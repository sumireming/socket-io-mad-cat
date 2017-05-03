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

var GAME_DATA = {
    appid : 'h5_testh5_pfBhAtb',
    app_secret : '1B3B06D1-BF59-D7E5-E9C4-156EE38BBB5C'
};

var server = http.createServer(function(req, res) {
	
	var pathname = url.parse(req.url).pathname;

	if(pathname === '/'){
		pathname = "view/index.html";
	}

    // if(pathname === '/test') {

    //     if(req.method == 'POST') {
    //         var body = '';

    //         req.on('data', function(data) {
    //             body += data;
    //         });

    //         req.on('end', function() {
    //             console.log(body)
    //         })

    //     }

    //     return;

    // }else{
    pathname = "view/" + pathname;
    // }


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

        }else{ 
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

	console.log('connection ' + socket.id + ' successful!');

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
        allSocket[socket.id].ext = clientInfo.ext;
        waitingClients.push(clientInfo);

        updateLoc(allSocket[socket.id].ext);

        if(waitingClients.length === 1) {
            console.log('waitingClient: ' + clientInfo.name)
        }
        
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
        console.log('disconnect : ' + socket.id);

        if(allSocket[socket.id] && allSocket[socket.id].ext) {
            updateLoc(allSocket[socket.id].ext, 'del');
        }

        if(waitingClients[0] && waitingClients[0].socketId === socket.id) {
            waitingClients = [];
        }else if(allSocket[socket.id]) {
            var rmRoom = allSocket[socket.id];
            if(rmRoom.getOpponent) {
                var OppClientId = rmRoom.getOpponent(socket.id);
                delete allSocket[socket.id];
                delete allSocket[OppClientId];

                allSocket[OppClientId].emit('restart');
            }
            
            // waitingClients.push()
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

function updateLoc(userinfo, type) {

    var postData = {
        'appid' : GAME_DATA.appid,
        'app_secret' : GAME_DATA.app_secret,
        'data' : type == 'del' ? JSON.stringify([userinfo.userid]) : JSON.stringify([{
            'gameid' : userinfo.userid,
            'sex' : userinfo.sex,
            'lat' : userinfo.lat,
            'lng' : userinfo.lng
        }])
    };

    var querystring = require("querystring");
    var qs = querystring.stringify(postData);
    var qslength = qs.length;
    var options = {
        hostname: "game-api.immomo.com",
        port: 80,
        path: type == 'del' ? '/3/server/location/del-loc' : '/3/server/location/update-loc',
        method: 'POST',
        headers:{
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': qslength
        }
    };

    var buffer = "";
    var req = http.request(options, function(res) {
        res.on('data', function (chunk) {
           buffer+=chunk;
        });
        res.on('end', function() {
            console.log(buffer);
        });
    });

    req.write(qs);
    req.end();

}


function getParam(query, name) {
    var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
    var r = query.match(reg);
    if (r!=null) {
        return unescape(r[2]);
    }
    return null;
};