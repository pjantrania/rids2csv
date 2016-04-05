var http = require("http"),
    urlparse = require("url"),
    htmlparser = require("htmlparser2");

var port = process.env.PORT || 8080;

http.createServer(
    function(request, response) {
        var qs = urlparse.parse(request.url, true).query;
        var date;
        if (qs) {
            date = qs.date;
        }

        var requestUrl = process.env.REQUEST_URL;
        if (date) {
            requestUrl += "&fdate=" + date;
        }
        var xml = '';
        var previousColor = null;
        var inTable = false;
        var inCell = false;
        var headers = ["Date", "Incident Number", "Unit", "Location", "Call Type", "Call Received", "Call Dispatch",
            "Unit Enroute", "Staged Near Scene", "Arrived On Scene", "Left Scene", "Arrived Hosp", "In Service"];
        var parser = new htmlparser.Parser({
            onopentag: (name, attribs) => {
                if (name === "table" && attribs.bgcolor === "#101010") {
                    inTable = true;
                }
                else if (name === "td" && (attribs.bgcolor === "#202060" || attribs.bgcolor === "#404080") && inTable) {
                    if (!inCell) {
                        inCell = true;
                    }

                    if (previousColor === null) {
                        previousColor = attribs.bgcolor;
                    }

                    if (previousColor !== null && previousColor !== attribs.bgcolor) {
                        response.write("\n");
                        previousColor = attribs.bgcolor;
                    }

                }
                else if (inTable && name === "tr" && attribs.bgcolor === "#000000") {
                    inTable = false;
                }
            },
            ontext: (text) => {
                if (inTable && inCell && text.trim() !== "--:--:--") {
                    response.write(text.trim());
                }
            },
            onclosetag: (name) => {
                if (name === "td" && inCell && inTable) {
                    response.write(",");
                    inCell == false;
                }
            }
        }, { decodeEntities: true });

        response.writeHead(200, { "Content-type": "text/plain" });
        response.write(headers.join(",") + "\n");
        http.get(requestUrl,
            (res) => {
                res.on("data", (d) => {
                    parser.write(d.toString());
                });
                res.on("end", () => {
                    parser.end();
                    response.end();
                });
            });
    }).listen(port);

