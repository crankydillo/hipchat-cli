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
  var hc = require('./hipchat.js'),
      blessed = require('blessed'),
      screen = blessed.screen(),
      onlineFn;

  screen.title = 'hc-cli';

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

  onlineFn = function(client) {

    client.onMessage(function(msg, author) {
      appendChat(msg, author);
    });

    client.onError(function(err) {
      appendChat('error: ' + err);
    });

    client.join(roomJid);

    textbox.on('submit', function(data) {
      var msg = data.slice(2);
      client.sendGroupChat(roomJid, msg);
      textbox.clearValue();
      textbox.setValue('> ');
      screen.render();
      textbox.focus();
    });

    // TODO feels bad putting this in 2 different places...
    // Quit on Escape, q, or Control-C.
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      client.disconnect();
      return process.exit(0);
    });
  };

  hc.connect(jid, pwd, nick, onlineFn);

  function appendChat(msg, author, date) {
    author = author || 'Author';
    date = date || moment();

    append(chatMsgBox, 
           '[' + moment(date).format('HH:mm:ss') + '] ' +
             '{blue-fg}<{/blue-fg}' + author + '{blue-fg}>{/blue-fg} ' + 
             msg);
  }

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
    return process.exit(0);
  });

  // Focus our element.
  textbox.focus();

  screen.key(['C-r'], function(ch, key) {
    append(chatMsgBox, 'C-r pressed!');
    screen.render();
    textbox.focus();
  });

  // Render the screen.
  screen.render();
}
