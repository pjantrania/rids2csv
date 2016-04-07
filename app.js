var http = require("http"),
    urlparse = require("url");

var parser = require("./parser"),
    getcsv = require("./getcsv");

var port = process.env.PORT || 8080;
http.createServer(
    function(request, response) {
        var qs = urlparse.parse(request.url, true).query;
        var date, startDate, endDate;
        if (qs) {
            date = qs.date;
            startDate = qs.startDate;
            endDate = qs.endDate;
        }

        var headers = ["Date", "Incident Number", "Unit", "Location", "Call Type", "Call Received", "Call Dispatch",
            "Unit Enroute", "Staged Near Scene", "Arrived On Scene", "Left Scene", "Arrived Hosp", "In Service"];

        response.writeHead(200, { "Content-type": "text/plain" });
        response.write(headers.join(",") + "\n");

        if (date) {
            getcsv.getCsv(date, date, response);
        }
        else if (startDate && endDate) {
            getcsv.getCsv(startDate, endDate, response);
        }
        else if (startDate || endDate) {
            response.write("Error: must provide either 'date' or both 'startDate' and 'endDate', in format YYYY-mm-dd");
            response.end();
        }
        else {
            parser.getStream().pipe(response);
            var requestUrl = process.env.REQUEST_URL;
            http.get(requestUrl,
                (res) => {
                    res.on("data", (d) => {
                        parser.parse(d.toString());
                    });
                    res.on("end", () => {
                        parser.endParse();
                        response.end();
                    });
                });
        }

    }).listen(port);

