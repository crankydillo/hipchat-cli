var xmpp = require('node-xmpp'),
    moment = require('moment');

function mkClient(xmppClient, jid, pwd, nick) {
  var onStanza,
      onMessage,
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

  onUserExit = function(callback) {
  }

  onUserJoin = function(callback) {
    // taken from http://stackoverflow.com/questions/17136432/handle-xmpp-presence-with-node
    xmppClient.on('stanza', function(stanza) {
      var userNick, roomJid, userJid, userRole;

      if(stanza.is('presence')){
        if(stanza.getChild('x') !== undefined) {
          var _presXmlns = stanza.getChild('x').attrs.xmlns;

          switch(_presXmlns) {
            // If someone is joining or leaving
            case 'http://jabber.org/protocol/muc#user':
              userRole = stanza.getChild('x').getChild('item').attrs.role;
              userJid  = stanza.getChild('x').getChild('item').attrs.jid;
              roomJid = stanza.attrs.from.split('/')[0];
              userNick = stanza.attrs.from.split('/')[1];


              // If it's not none, this user must be joining or changing his nick
              if(userRole !== 'none') {
                callback(userNick, roomJid);
                // We are now handling the data of joinging / nick changing users. I recommend to use an in-memory store like 'dirty' [https://github.com/felixge/node-dirty] to store information of the users currentliy in the group chat.
              } else {
                // We are now handling the data of leaving users
              }
              break;
            }

        }
      }
    });
  }

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
    onUserJoin: onUserJoin,
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
