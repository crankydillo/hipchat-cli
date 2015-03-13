var xmpp = require('node-xmpp');

function mkClient(xmppClient, jid, pwd, nick) {
  var onMessage,
      sendGroupChat,
      sendChat,
      join,
      rooms,
      disconnect;

  onMessage = function(callback) {
    xmppClient.on('stanza', function(stanza) {
      if (stanza.is('message')) {
        var body = stanza.getChild('body');
        // message without body is probably a topic change
        if (!body) {
          return;
        }
        var message = body.getText();
        var author = stanza.attrs.from.split('/')[1];
        callback(message, author);
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
