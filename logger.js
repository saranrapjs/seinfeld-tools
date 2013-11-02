var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 
		colors: {
			info: 'blue',
			error: 'red',
		},
    	colorize:true, 
    	timestamp:true
    }),
    new (winston.transports.File)({ 
    	filename: 'seinfeld-tools.log',
    	json:false,
    	maxsize:100,
    	maxFiles:1
    })
  ]
});

module.exports = logger;