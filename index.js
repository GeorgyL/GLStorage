const http = require('http');
const url = require('url');
const events = require('events');
const fs = require('fs');
const querystring = require('querystring');

var emitter = new events.EventEmitter();

var dump;
var buffer;

var methods = {};
methods["/"] = library;
methods["/library"] = library;
methods["/auth"] = auth;
methods["/upload"] = upload;
methods["/open"] = open;

var files = {};

var ignore = {};
ignore["/style.css"] = "/style.css";
ignore["/favicon.ico"] = "/favicon.ico";

var session = {};
session["username"] = "";
session["password"] = "";
session["user_id"] = 0;
session["user_dir"] = "";

http.createServer((request, response) => {

  request.setEncoding("utf8");

  var pathname = url.parse(request.url).pathname;
  if (~pathname.indexOf("?")) {
    pathname = pathname.split(0, pathname.indexOf("?"));
  }

  if (typeof methods[pathname] === "function") {

    console.log("request to "+pathname+" recived.");

    if (session["username"] == "admin" && session["password"] == "admin") {
      console.log("user "+session["username"]+" use "+pathname);
      methods[pathname](request, response);
    } else {
      if (session["username"] == "guest") {
        switch (pathname) {
          case "/auth":
            auth(request, response);
            break;
          case "/upload":
            upload(request, response);
            break;
          default:
            response.writeHead(200, {"Content-Type": "text/html"});
            response.end();
            break;
        }
      } else {
        console.log("new guset.");
        session["username"] = "guest";
        console.log("rerouting to http://192.168.100.5:8000/auth.\n");
        response.writeHead(301, {Location: "http://192.168.100.5:8000/auth"});
        response.end();
      }
    }
  } else {
    if (ignore[pathname] == pathname) {
      console.log("requset to "+pathname+" reqived.\n");
      response.end();
    } else {
      console.log("unknown request to "+pathname+".\n");
      response.writeHead(404, {"Content-Type": "text/html"});
      response.end("404 Not found.");
    }
  }

}).listen(8000);
console.log("server listening on 8000.\n");

function auth(request, response) {
  console.log("---auth---\n");
  if (session["username"] != "admin" && session["password"] != "admin") {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(fs.readFileSync("auth.html"));
    response.end();
  } else {
    console.log("rerouting to http://192.168.100.5:8000/library.\n");
    response.writeHead(301, {Location: "http://192.168.100.5:8000/library"})
    response.end();
  }
}

function library(request, response) {
  console.log("---library---\n");
  session["user_id"] = 1;
  session["user_dir"] = "storage/"+session["user_id"];

  fs.readdir(session["user_dir"], (error, items) => {
    var str;

    if (error) console.error(error);
    str = "";
    for (var i = 0; i < items.length; i++) {
      str += "<a href=\"/open?file="+items[i]+"\"> "+items[i]+" </a> </br>";
      files[items[i]] = items[i];
    };

    contentWrite(response, str);
  });

}

function upload(request, response) {
  console.log("---upload---\n");
  request.on("data", (data) => {
    console.log("http post data: "+data);
    session["username"] = querystring.parse(data).username;
    session["password"] = querystring.parse(data).password;
    console.log("username: "+session["username"]);
    console.log("password: "+session["password"]+"\n");
    if (session["username"] == "admin" && session["password"] == "admin"){
      response.writeHead(301, {Location: "http://192.168.100.5:8000/library"});
      response.end();
      console.log("user "+session["username"]+" succsesfully logined.");
    } else {
      console.log("nnn");
    }
  });
}

function queryExtr(query, argument) {
  if (~query.indexOf(argument+"=")) {
    var str = query.slice((query.indexOf(argument+"=")+argument.length+1), query.length);
    if (~str.indexOf("&")) {
      return str.slice(0, str.indexOf("&"));
    } else {
      return str;
    }
  } else {
    return "unknown";
  }
}

function open(request, response) {
  console.log("---open---\n");
  var querystring = url.parse(request.url).query;
  console.log("pathname = "+querystring);
  var filename = queryExtr(querystring, "file");
  filename = session["user_dir"]+"/"+filename;
  console.log("filename = "+filename);

  var extension;
  if (~filename.indexOf(".")) {
    extension = filename.slice(filename.lastIndexOf(".")+1, filename.length);
  } else {
    extension = "unknown"
  }
  console.log(extension);

  var fileContent;
  switch (extension) {
    case "txt":
      fileContent = fs.readFileSync(response, filename);
      break;
    default:

  }

  contentWrite(fileContent);
}

function contentWrite(response, content) {
  dump = fs.readFileSync("main.html", "utf8").replace(/<%= username %>/g, session["username"]);
  dump = dump.replace(/<%= style %>/g, ("<style>"+fs.readFileSync("style.css", "utf8")+"</style>"));
  dump = dump.replace(/<%= content %>/g, content);

  response.writeHead(200, {"Content-Type": "text/html"});
  response.write(dump);
  response.end();
}
