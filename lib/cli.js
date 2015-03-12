var fs = require('fs')
    _ = require('underscore'),
    moment = require('moment'),
    http = require('http'),
    pathe = require('path-extra');

fs.readFile(pathe.homedir() + '/.hc-cli', function (err, data) {
  if (err) throw err;
  var cfg = JSON.parse(data);
  runCli(cfg.nick, cfg.jid, cfg.pwd, cfg.room_jid);
});

function runCli(nick, jid, pwd, roomJid) {
  var blessed = require('blessed'),
      screen = blessed.screen(),
      xmpp = require('node-xmpp'),
      client = new xmpp.Client({
        jid: jid,
        password: pwd
      });

  client.on('online', function() {

    // set ourselves as online
    client.send(new xmpp.Element('presence', { type: 'available' }).
      c('show').t('chat')
    );

    client.on('stanza', function(stanza) {
      if (stanza.is('message')) {
        var body = stanza.getChild('body');
        // message without body is probably a topic change
        if (!body) {
          return;
        }
        var message = body.getText();
        var author = stanza.attrs.from.split('/')[1];
        appendChat(message, author);
      } else {
        //console.log('------------------------------------');
        //console.log(stanza);
      }
    });

    client.on('error', function(e) {
      appendChat('error: ' + e);
    });

    // join room (and request no chat history)
    client.send(
      new xmpp.Element('presence', {
        to: roomJid + '/' + nick
      }).c('x', { xmlns: 'http://jabber.org/protocol/muc' }));

    // send keepalive data or server will disconnect us after 150s of inactivity
    setInterval(function() {
      client.send(' ');
    }, 30000); 
  });



  screen.title = 'hc-cli';

  // Create a box perfectly centered horizontally and vertically.
  var chatMsgBox = blessed.box({
    parent: screen,
    width: '100%',
    height: screen.height - 1,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    style: {
      fg: 'white',
      bg: 'black',
      scrollbar: {
        bg: 'blue'
      },
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  var form = blessed.form({
    parent: screen,
    bottom: 0,
    height: 1 
  });

  var textbox = blessed.textbox({
    parent: form,
    height: '100%',
    mouse: true,
    inputOnFocus: true,
    value: '> '
  });

  function appendChat(msg, author, date) {
    author = author || 'Author';
    date = date || moment();

    append(chatMsgBox, 
           '[' + moment(date).format('HH:mm:ss') + '] ' +
           '{blue-fg}<{/blue-fg}' + author + '{blue-fg}>{/blue-fg} ' + 
             msg);

  }

  textbox.on('submit', function(data) {
    var msg = data.slice(2);
    sendChat(msg);
    textbox.clearValue();
    textbox.setValue('> ');
    screen.render();
    textbox.focus();
  });

  function append(b, newData) {
    b.insertBottom(newData);
    b.scroll(100);
    screen.render();
  }

  screen.on('resize', function(data) {
    screen.render();
  });

  // Quit on Escape, q, or Control-C.
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    client.end();
    return process.exit(0);
  });

  // Focus our element.
  textbox.focus();

  function sendChat(msg) {
    var to = { 
      to: roomJid + '/' + nick,
      type: 'groupchat' 
    },
      stanza = new xmpp.Element('message', to).c('body').t(msg);

    client.send(stanza);
  }

  screen.key(['C-r'], function(ch, key) {
    append(chatMsgBox, 'C-r pressed!');
    screen.render();
    textbox.focus();
  });

  // Render the screen.
  screen.render();
}

