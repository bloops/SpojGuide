// ==UserScript==
// @name          SpojGuide
// @namespace     spojguide
// @description   This script helps you out in your perpetual search of the next SPOJ problem to solve!
// @require       http://userscripts.org/scripts/source/107357.user.js
// @include       http://www.spoj.pl/users/*
// @include       https://www.spoj.pl/users/*
// ==/UserScript==

// Do you want to rewrite the links from /status/PROBLEM,user/ to /problems/PROBLEM ?
var rewriteLinks = true;

// Do you want fuzzy colors?
var fuzzyColors = true;

// ----------------------------------------------------------------------
// Color Chooser (chooses a color given number of submissions)
// ----------------------------------------------------------------------

chooseColor = function(val) {
// ----------------------------------------------------------------------
// BEGIN Customize Color Scheme Here
// ----------------------------------------------------------------------

// If fuzzyColors is false, then every AC count is rounded to the
// checkpoint which is the maximum lower bound. Then that checkpoints'
// corresponding color is used.

// If fuzzyColors is true, the color is the weighted average of the
// two neighbouring checkpoints.
// The weight is the distance from each checkpoint.

// After some detailed analysis of spoj's user base,
// I've set the last checkpoint (which acts as infinity),
// to India's population (googled on 24th Jul, 2011).
// Feel free to update it when the population increases!

    var checkpoints = new Array(      0,    20,     40,    80,   160,   480,  1155347700 );
    //                       bright red,   red, purple,  blue, green,    yellow/spoj bg
    var red =         new Array(    255,   255,    200,   200,   150,   246,         246 );
    var green =       new Array(    100,   150,    150,   200,   255,   249,         249 );
    var blue =        new Array(    100,   150,    255,   255,   150,   224,         224 );

// ----------------------------------------------------------------------
// END Customize Color Scheme Here
// ----------------------------------------------------------------------


    var i = 0; // get highest which is <= val
    while(i+1 < checkpoints.length && checkpoints[i+1] <= val) {
        i++;
    }

    var j = 0; // get lowest which is >= val
    while(j < checkpoints.length && checkpoints[j] < val) {
        j++;
    }
    var x,y;
    if(fuzzyColors) {
        x = (val-checkpoints[i]) / (checkpoints[j]-checkpoints[i]),
        y = (checkpoints[j]-val) / (checkpoints[j]-checkpoints[i]);
    }
    else {
        x = 0;
        y = 1;
    }

    var r = y*red[i] + x*red[j], g = y*green[i] + x*green[j], b = y*blue[i] + x*blue[j];
    r = Math.floor(r), g = Math.floor(g), b = Math.floor(b);

    return r.toString(16) + g.toString(16) + b.toString(16);
}

//
// Friendly customization comments end here! Contact me if you want a new feature.
// For each new feature you need to give me a chocolate bar!

// -----------------------------------------------------
// Util Functions
// -----------------------------------------------------

isValidProblemCode = function(pcode) {
    if( pcode==="" || pcode.match("[^A-Z0-9_]"))
        return false;
    return true;
}

Function.prototype.bind = function( thisObject ) {
    var method = this;
    var oldargs = [].slice.call( arguments, 1 );
    return function () {
        var newargs = [].slice.call( arguments );
        return method.apply( thisObject, oldargs.concat( newargs ));
    };
}

log = function(text) {
    unsafeWindow.console.log(text);
}

// -----------------------------------------------------
// Begin Main script
// -----------------------------------------------------

var problems = Array(); // problem code => link


handleProblems = function(responseDetails) {
    var reply = responseDetails.responseText;
    var values = reply.split("\n");
//    log(values);
    for each (var v in values){
        a = v.split(" ");
        p = a[0];
        if(! (p in problems))
            continue;
        u = a[1];
        problems[p].setAttribute("title", u + " ACs");
        problems[p].style.backgroundColor = chooseColor(u);
    }

}

myAccountProcess =  function(responseDetails) {
    var myaccount_doc = parseHtml(responseDetails.responseText);

    var table = myaccount_doc.evaluate("//table[@width='91%']",
                                       myaccount_doc,
                                       null,
                                       XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                       null) ;
    if(table.snapshotLength == 0)
        return;

    table = table.snapshotItem(0);
    var problem_links = table.getElementsByTagName("a");

    for( var i = 0; i < problem_links.length; i++){
        var problem_code = problem_links[i].textContent;
        if(!isValidProblemCode(problem_code))
            continue;
        if(problem_code in problems) {
            var plink = problems[problem_code];
            plink.style.textDecoration = "line-through";
        }
    }
};

var problemLinks;

problemLinks = document.evaluate(
    "//tr/td/a[contains(@href,'/status/')]",
    document,
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null);

for( var i = 0;  i < problemLinks.snapshotLength ; i++) {
    var thisLink = problemLinks.snapshotItem(i);
    var problem_code = thisLink.textContent;

    if( !isValidProblemCode(problem_code))
        continue;

    if(rewriteLinks){
        thisLink.setAttribute("href","/problems/" + problem_code + "/");
    }

    problems[problem_code] = thisLink;

    // GM_xmlhttpRequest({
    //     method: "GET",
    //     url: "http://www.spoj.pl/ranks/" + problem_code,
    //     onload: getProblemInfo.bind( {}, problem_code)
    // });
}


GM_xmlhttpRequest ({
    method: 'GET',
    url: 'https://www.spoj.pl/myaccount/',
    onload: myAccountProcess
});


var pstring = "";
var count = 0;
for (var p in problems) {
    count ++;
    if(count >= 200) {
        GM_xmlhttpRequest({
            method: "GET",
            url:  "http://spojguide.appspot.com/fetch?problem=" + pstring,
            onload: handleProblems
        });
        pstring = "";
        count = 0;
    }
    if(pstring === "")
        pstring += p;
    else
        pstring += ","+p;
}


GM_xmlhttpRequest({
    method: "GET",
    url:  "http://spojguide.appspot.com/fetch?problem=" + pstring,
    onload: handleProblems
});
