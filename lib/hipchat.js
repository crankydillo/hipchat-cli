var xmpp = require('node-xmpp'),
    moment = require('moment');

function mkClient(xmppClient, jid, pwd, nick) {
  var onMessage,
      sendGroupChat,
      sendChat,
      join,
      rooms,
      disconnect;

  onMessage = function(callback) {
    xmppClient.on('stanza', function(stanza) {
      var body, message, from, arr, fromRm, author, delay, date;

      if (stanza.is('message')) {
        body = stanza.getChild('body');

        // message without body is probably a topic change
        if (!body) {
          return;
        }
        message = body.getText();
        from = stanza.attrs.from;
        arr = from.split('/');
        fromRm = arr[0];
        author = arr[1];

        delay = stanza.getChild('delay');

        if (delay && delay.attrs && delay.attrs.stamp) {
          date = moment(delay.attrs.stamp);
        }
        
        //message = JSON.stringify(stanza, null, 2);
        callback(message, author, fromRm, date);
      }
    });
  };

  onError = function(callback) {
    xmppClient.on('error', function(err) {
      callback(err);
    });
  };

  disconnect = function() {
    xmppClient.end();
  }

  join = function(roomJid) {
    xmppClient.send(
      new xmpp.Element('presence', {
      to: roomJid + '/' + nick
    }).c('x', { xmlns: 'http://jabber.org/protocol/muc' }));
  };

  sendGroupChat = function(roomJid, msg) {
    var to = { 
          to: roomJid + '/' + nick,
          type: 'groupchat' 
        },
      stanza = new xmpp.Element('message', to).c('body').t(msg);

    xmppClient.send(stanza);
  };

  return {
    onMessage: onMessage,
    onError: onError,
    join: join,
    sendGroupChat: sendGroupChat,
    disconnect: disconnect
  }
}

module.exports = {
  connect: function(jid, pwd, nick, cb) {
    var xmppClient = new xmpp.Client({
      jid: jid,
      password: pwd
    });

    xmppClient.on('online', function() {
      // set ourselves as online
      xmppClient.send(new xmpp.Element('presence', { type: 'available' }).
        c('show').t('chat')
      );

      setInterval(function() {
        xmppClient.send(' ');
      }, 30000); 

      cb(mkClient(xmppClient, jid, pwd, nick));
    });
  }
}
