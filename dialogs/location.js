module.exports = function () {
    bot.dialog('/location', [
        (session, next) => {
            builder.Prompts.text(session, "Please send me your current location.");
        },

        (session, results, next) => {
            session.userData.lat = session.message.entities[0].geo.latitude;
            session.userData.lon = session.message.entities[0].geo.longitude;

            tfl.stoppoint({ lat: session.userData.lat, lon: session.userData.lon, stopTypes: 'NaptanBusWayPoint,NaptanBusCoachStation,NaptanPublicBusCoachTram'})
            .then(result => {     
                var searchResult = JSON.parse(result.text);   
                var stopPointsNum = searchResult.stopPoints.length;
                var direction = new Array();
                var counter=0;
                for(var i=0; i<stopPointsNum; i++){
                    if(searchResult.stopPoints[i].lines.length != 0){
                        direction[counter] = searchResult.stopPoints[i].additionalProperties[1].value;
                        counter++;
                    }           
                }

                session.userData.directionArray = direction;
                session.beginDialog('/selectDirection');
            })
            .catch(error => {
                session.send("location: computer says no (can't find stoppoint data)");
                session.send(error);
                session.endConversation();
            });;
            next;
        },

        (session, next) => {
            var latitude =  session.userData.lat;
            var longitude =  session.userData.lon;

            tfl.stoppoint({ lat: latitude, lon: longitude, stopTypes: 'NaptanBusWayPoint,NaptanBusCoachStation,NaptanPublicBusCoachTram'})       
            .then(result => { 
                var naptanId;
                var searchResult = JSON.parse(result.text);
                var userDirection = session.userData.direction;
                var stopPointsNum = searchResult.stopPoints.length;
                var busDestination;
                var busNumbers = new Array();
                
                for(var i=0; i<stopPointsNum; i++){
                    if(searchResult.stopPoints[i].lines.length != 0){
                        busDestination = searchResult.stopPoints[i].additionalProperties[1].value;
                        if(busDestination.includes(userDirection)){
                            session.userData.naptanId = searchResult.stopPoints[i].id;
                            
                            for(var j=0; j<searchResult.stopPoints[i].lines.length; j++){
                                busNumbers[j] = searchResult.stopPoints[i].lines[j].name;
                            }

                            session.userData.busArray = busNumbers;
                            session.beginDialog('/selectBus');

                            break;
                        }                
                    }           
                }
            })
            .catch(error => {
                session.send("location: computer says no (can't find stoppoint data)");
                session.send(error);
                session.endConversation();
            });
            next;
        },

        (session) => {
            var naptanId = session.userData.naptanId;
            var busnum = session.userData.busnum;
            var direction = session.userData.direction;

            tfl.stoppoint.byIdArrivals(naptanId)
            .then(result => { 
                var searchResult = JSON.parse(result.text);
                var i = searchResult.length-1;
                session.send(busnum + " towards " + direction);
                for(i; i>=0; i--){
                    if(searchResult[i].lineName == busnum){
                        var lineName = searchResult[i].lineName;
                        var destinationName = searchResult[i].destinationName;   
                        var arrivalTime = searchResult[i].expectedArrival;
                        var time = new Date(arrivalTime);   
                        var timeNow = new Date();
                        var differenceInMinutes = time - timeNow;
                        var estimatedArrivalMinutes = Math.round(differenceInMinutes / 60000);
                        session.send("{0}:{1}   [{2}mins]".format(time.getHours(), time.getMinutes(), estimatedArrivalMinutes));   
                        console.log("{0}:{1}   -----   {2} to {3}".format(time.getHours(), time.getMinutes(), lineName, destinationName));        
                    }    
                } 

                session.endConversation();
            })
            .catch(error => {
                session.send("location: computer says no (can't find ArrivalsId)");
                session.send(error);
                session.endConversation();
            });
        }
    ]);
}

