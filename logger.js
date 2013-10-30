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
    })
  ]
});

module.exports = logger;