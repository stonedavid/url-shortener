// server.js
const express = require("express");
const mongodb = require("mongodb").MongoClient;
const dns = require("dns");

var app = express();
var url = process.env.MONGOLAB_URI;
var appURL = "https://stonedavid-url-shortener.herokuapp.com/";
var domain;
console.log(url);

function testDNS(res,dom,callback) {
    console.log(dom);
    dns.lookup(dom, function(err,addresses,family) {
        if (err) {
            res.end("Not a valid url: ",dom);
            return;
            }
        callback("https://www." + dom);
    });
}

app.get("/new/*",function(req,res) {
    domain = req.url.slice(5);
    domain = domain.replace(/https*:\/\//,"").replace("www.","");
    mongodb.connect(url,function(err,db) {
        if (err) throw err;
        var coll = db.collection("urls");
        testDNS(res,domain, function(str) {
            var query = { 
                long_url: str 
            };
            
            coll.find(query,{}).toArray(function(err,docs) {
                if (err) throw err;
                if (docs.length) {
                    db.close();
                    res.end(JSON.stringify(docs[0],null,2));
                } else {
                    coll.stats().then(function(stats) {
                        var short_url = appURL + (Number(stats.count) + 1).toString(16);
                        var outObject = {long_url: str,short_url: short_url};
                        coll.insert(outObject);
                        res.setHeader("Content-Type", "text/html");
                        res.end("<p>Long URL: " + "<a href='" + str + "'>" + str + "</a></p></br>" +
                        "<p>Short URL: " + "<a href='" + short_url + "'>" + short_url + "</a></p>");
                        db.close();
                    }
                    , function(failed) {
                        console.log("failed stats");
                        db.close();
                        res.end();
                            });
                        }
                    });
                });
            });
        });

app.get("/*",function(req,res) {
    if (req.url.slice(1,4) === "new") {
        res.end();
    } else {
        var domain = appURL + req.url.slice(1);
        console.log("Short URL",domain);
        mongodb.connect(url,function(err,db) {
        if (err) throw err;
            var coll = db.collection("urls");
        
            var query = { short_url: domain };
        
            coll.find(query,{long_url: 1}).toArray(function(err,docs) {
                if (err) throw err;
                if (docs.length) {
                    res.redirect(docs[0].long_url);
                    db.close();
                } else {
                    res.end("URL not in database\nTry /new/<url> to get short url");
                    db.close();
                    }
                });
            });
        }
    });
 

app.listen(process.env.PORT || 8080,function() {
    console.log("Listening...", process.env.PORT);
});
