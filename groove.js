console.log('Loading event');

var Groove = {
  sendRequest: function(path, method, params, context) {
    var http = require('https');
    var token = 'YOUR_TOKEN';
    var bodyString = JSON.stringify(params);
    var headers = {
      'Content-Type': 'application/json',
      'Content-Length': bodyString.length,
      'Authorization': "Bearer " + token
    };

    var options = {
      host: 'api.groovehq.com',
      path: path,
      port: 443,
      method: method,
      headers: headers
    };

    var callback = function(response) {
      var str = '';

      //another chunk of data has been recieved, so append it to `str`
      response.on('data', function(chunk) {
        str += chunk;
      });

      //the whole response has been recieved, so we just print it out here
      response.on('end', function() {
        console.log(str);
        context.done(null, 'Finished');
      });

      response.on('error', function(e) {
        console.log(e);
        context.done(null, 'Error');
      });
    };

    http.request(options, callback).write(bodyString);
  },

  changeAssignee: function(ticket, assignee, context) {
    var path = '/v1/tickets/' + ticket + '/assignee';
    var method = 'PUT';
    var params = { assignee: assignee };

    console.log('Assigning ticket ' + ticket + ' to ' + assignee);

    this.sendRequest(path, method, params, context);
  },

  closeTicket: function(ticket, context) {
    console.log('Closing ticket ' + ticket);
    this.changeState('closed', ticket, context);
  },

  openTicket: function(ticket, context) {
    console.log('Open ticket ' + ticket);
    this.changeState('opened', ticket, context);
  },

  asSpam: function(ticket, context) {
    console.log('Marking ' + ticket + ' as spam.');
    this.changeState('spam', ticket, context);
  },

  asPending: function(ticket, context) {
    console.log('Marking ' + ticket + ' as pending.');
    this.changeState('pending', ticket, context);
  },

  changeState: function(state, ticket, context) {
    var path = '/v1/tickets/' + ticket + '/state';
    var method = 'PUT';
    var params = { state: state };

    this.sendRequest(path, method, params, context);
  },

  addNote: function(ticket, note, context) {
    var path = '/v1/tickets/' + ticket + '/messages';
    var method = 'POST';
    var params = {
      body: note,
      note: true
    };

    console.log('Adding note to ticket ' + ticket);

    this.sendRequest(path, method, params, context);
  },
};

exports.handler = function(event, context) {
  console.log(JSON.stringify(event, null, '  '));

  for(i = 0; i < event.Records.length; ++i) {
    encodedPayload = event.Records[i].kinesis.data;
    console.log('Encoded payload: ' + encodedPayload);
    // Kinesis data is base64 encoded so decode here
    payload = JSON.parse(new Buffer(encodedPayload, 'base64').toString('ascii'));

    console.log('Decoded payload: ' + JSON.stringify(payload));

    if (!payload || !payload.text) {
      context.done(null, 'Invalid payload');
      return false;
    }

    var result = payload.text.split(' ');

    if (result.length < 2) {
      context.done(null, 'Invalid payload');
      return false;
    }

    var command = result.shift();
    var ticket = result.shift();

    if (command === 'assign') {
      var assignee = result[0];
      Groove.changeAssignee(ticket, assignee, context);
    } else if (command === 'close') {
      Groove.closeTicket(ticket, context);
    } else if (command === 'open') {
      Groove.openTicket(ticket, context);
    } else if (command === 'spam') {
      Groove.asSpam(ticket, context);
    } else if (command === 'pending') {
      Groove.asPending(ticket, context);
    } else if (command === 'note') {
      var note = result.join(' ');
      Groove.addNote(ticket, note, context);
    } else {
      context.done(null, 'Cannot find command ' + command);
    }
  }
};
